import * as fs from 'fs'
import { shell } from 'electron'
import type { Mod, SteamCookies } from '../shared/types'
import { parseVdf } from './steam'

// VDF serializer (mirrors the parser in steam.ts)
type VdfValue = string | VdfNode
interface VdfNode {
  [key: string]: VdfValue
}

function serializeVdf(node: VdfNode, indent = 0): string {
  const tab = '\t'.repeat(indent)
  let out = ''

  for (const [key, value] of Object.entries(node)) {
    if (typeof value === 'string') {
      out += `${tab}"${key}"\t\t"${value}"\n`
    } else {
      out += `${tab}"${key}"\n${tab}{\n`
      out += serializeVdf(value as VdfNode, indent + 1)
      out += `${tab}}\n`
    }
  }

  return out
}

function parseAcf(filePath: string): VdfNode {
  return parseVdf(fs.readFileSync(filePath, 'utf8'))
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

// ACF manipulation
/**
 * Marks items as stale by zeroing their timestamps and manifest IDs rather
 * than deleting the entries entirely. Deletion can leave Steam in an
 * inconsistent state if it has the subscription cached in memory; zeroing
 * the fields signals "needs update" through the normal update path instead.
 */
function markAcfEntriesStale(acfPath: string, itemIds: number[]): void {
  if (!fs.existsSync(acfPath)) return

  const root = parseAcf(acfPath)
  const workshop = (root['appworkshop'] ?? root) as VdfNode

  const installed = workshop['workshopitemsinstalled']
  const details = workshop['workshopitemdetails']

  for (const id of itemIds) {
    const key = String(id)

    // Zero out installed entry — keeps the key present so Steam knows it's
    // subscribed, but the zeroed manifest forces a re-download check.
    if (installed && typeof installed === 'object') {
      const entry = (installed as VdfNode)[key]
      if (entry && typeof entry === 'object') {
        ;(installed as VdfNode)[key] = {
          ...(entry as VdfNode),
          size: '0',
          timeupdated: '0',
          manifest: '0'
        }
      }
    }

    // Zero out details entry similarly
    if (details && typeof details === 'object') {
      const entry = (details as VdfNode)[key]
      if (entry && typeof entry === 'object') {
        ;(details as VdfNode)[key] = {
          ...(entry as VdfNode),
          manifest: '0',
          timeupdated: '0'
        }
      }
    }
  }

  const rootKey = 'appworkshop' in root ? 'appworkshop' : Object.keys(root)[0]
  const serialized = `"${rootKey}"\n{\n${serializeVdf(workshop, 1)}}\n`
  fs.writeFileSync(acfPath, serialized, 'utf8')
}

/**
 * Fully removes items from the ACF. Used for unsubscribe where we genuinely
 * want Steam to forget the item, not just re-download it.
 */
function stripAcfEntries(acfPath: string, itemIds: number[]): void {
  if (!fs.existsSync(acfPath)) return

  const root = parseAcf(acfPath)
  const workshop = (root['appworkshop'] ?? root) as VdfNode

  for (const section of ['workshopitemsinstalled', 'workshopitemdetails']) {
    const block = workshop[section]
    if (block && typeof block === 'object') {
      for (const id of itemIds) {
        delete (block as VdfNode)[String(id)]
      }
    }
  }

  const rootKey = 'appworkshop' in root ? 'appworkshop' : Object.keys(root)[0]
  const serialized = `"${rootKey}"\n{\n${serializeVdf(workshop, 1)}}\n`
  fs.writeFileSync(acfPath, serialized, 'utf8')
}

// Local file helpers
function deleteModFiles(mod: Mod): void {
  if (!fs.existsSync(mod.path)) return
  fs.rmSync(mod.path, { recursive: true, force: true })
}

// Steam API helpers
async function communityPost(
  endpoint: string,
  itemId: number,
  appId: number,
  cookies: SteamCookies
): Promise<void> {
  const body = new URLSearchParams({
    id: String(itemId),
    appid: String(appId),
    sessionid: cookies.sessionId.trim()
  }).toString()

  const res = await fetch(`https://steamcommunity.com/sharedfiles/${endpoint}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Cookie: `steamLoginSecure=${cookies.loginSecure.trim()}; sessionid=${cookies.sessionId.trim()}`,
      Referer: `https://steamcommunity.com/sharedfiles/filedetails/?id=${itemId}`,
      Origin: 'https://steamcommunity.com'
    },
    body
  })

  if (!res.ok) throw new Error(`Steam request failed: ${res.status} ${res.statusText}`)
}

export async function subscribeToMod(
  itemId: number,
  appId: number,
  cookies: SteamCookies
): Promise<void> {
  await communityPost('subscribe', itemId, appId, cookies)
}

export async function unsubscribeFromMod(
  itemId: number,
  appId: number,
  cookies: SteamCookies
): Promise<void> {
  await communityPost('unsubscribe', itemId, appId, cookies)
}

// Public action result type
export interface WorkshopActionResult {
  itemId: number
  success: boolean
  error?: string
}

// Unsubscribe
export async function unsubscribeFromMods(
  mods: Mod[],
  appId: number,
  workshopAcfPath: string,
  cookies: SteamCookies
): Promise<WorkshopActionResult[]> {
  const results: WorkshopActionResult[] = []

  for (const mod of mods) {
    try {
      await unsubscribeFromMod(mod.itemId, appId, cookies)
      results.push({ itemId: mod.itemId, success: true })
    } catch (e) {
      results.push({ itemId: mod.itemId, success: false, error: String(e) })
    }
  }

  const succeeded = results.filter((r) => r.success).map((r) => r.itemId)
  const succeededMods = mods.filter((m) => succeeded.includes(m.itemId))

  for (const mod of succeededMods) deleteModFiles(mod)
  stripAcfEntries(workshopAcfPath, succeeded)

  return results
}

// Subscribe
export async function subscribeMods(
  itemIds: number[],
  appId: number,
  cookies: SteamCookies
): Promise<WorkshopActionResult[]> {
  const results: WorkshopActionResult[] = []
  for (const itemId of itemIds) {
    try {
      await subscribeToMod(itemId, appId, cookies)
      results.push({ itemId, success: true })
    } catch (e) {
      results.push({ itemId, success: false, error: String(e) })
    }
  }
  return results
}

/**
 * Force-redownload sequence:
 *
 *  1. Unsubscribe via API  (commit the "gone" state to Steam's servers first)
 *  2. Brief pause          (let Steam's backend register the unsubscribe before
 *                           the resubscribe arrives — avoids a server-side no-op)
 *  3. Resubscribe via API  (Steam now queues a fresh download with the latest manifest)
 *  4. Delete local files   (after the API round-trip so errors don't orphan the sub)
 *  5. Mark ACF stale       (zero manifest/timestamps so Steam re-downloads rather
 *                           than skipping because it thinks local files are current)
 *  6. Per-item download    (steam://workshop_download_item nudges Steam to process
 *                           the queue immediately instead of waiting for next launch)
 *  7. Open downloads page  (brings the Steam download manager into view so the user
 *                           can see progress; also prompts Steam to flush its queue)
 *
 * Why this order matters:
 * - Doing local cleanup (steps 4–5) before the API calls (old order) meant a failed
 *   API call left the mod deleted locally but still "current" in Steam's eyes, so
 *   Steam would never re-queue it.
 * - Fully deleting ACF entries (old approach) can confuse Steam if it has the
 *   subscription cached in memory; zeroing the manifest is the safer signal.
 */
export async function redownloadMods(
  mods: Mod[],
  appId: number,
  workshopAcfPath: string,
  cookies: SteamCookies
): Promise<WorkshopActionResult[]> {
  const results: WorkshopActionResult[] = []

  for (const mod of mods) {
    try {
      // Tell Steam's servers this subscription is gone
      await unsubscribeFromMod(mod.itemId, appId, cookies)

      // Brief pause so the unsubscribe is committed server-side before
      // the resubscribe arrives — without this, Steam can silently no-op the pair
      await sleep(800)

      // Resubscribe — Steam now records this as a brand-new subscription
      // and will serve the latest manifest on next download
      await subscribeToMod(mod.itemId, appId, cookies)

      // Step 4: remove local files only after the API round-trip succeeds, so a
      // network error doesn't leave the user with no local copy and no active sub
      deleteModFiles(mod)

      // Step 5: zero out ACF timestamps/manifest so Steam's local state agrees
      // that this item needs a fresh download (rather than skipping it because
      // timeupdated still matches what it downloaded before)
      markAcfEntriesStale(workshopAcfPath, [mod.itemId])

      results.push({ itemId: mod.itemId, success: true })
    } catch (e) {
      results.push({ itemId: mod.itemId, success: false, error: String(e) })
    }
  }

  const succeededIds = results.filter((r) => r.success).map((r) => r.itemId)

  if (succeededIds.length > 0) {
    // Step 6: nudge Steam to start downloading each item immediately rather than
    // waiting for the next Steam client launch or manual queue check
    for (const itemId of succeededIds) {
      await shell.openExternal(`steam://workshop_download_item/${appId}/${itemId}`)
      // Small gap between protocol invocations so Steam doesn't drop any
      await sleep(200)
    }

    // Step 7: open the downloads page so the user can see progress and so Steam
    // flushes any remaining queued items
    await shell.openExternal('steam://open/downloads')
  }

  return results
}

// Utility exports
export async function openModDirectory(modPath: string): Promise<void> {
  const err = await shell.openPath(modPath)
  if (err) throw new Error(`Could not open directory: ${err}`)
}

export async function openModPage(itemId: number): Promise<void> {
  await shell.openExternal(`steam://url/CommunityFilePage/${itemId}`)
}
