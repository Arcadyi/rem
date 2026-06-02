import * as fs from 'fs'
import { shell } from 'electron'
import type { Mod, SteamCookies } from '../shared/types'
import { parseVdf } from './steam'

// ---------------------------------------------------------------------------
// VDF serializer (mirrors the parser in steam.ts)
// ---------------------------------------------------------------------------

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

// Re-export the parser interface so we can import from steam.ts
// We call parseVdf via a dynamic import to avoid circular deps
function parseAcf(filePath: string): VdfNode {
  return parseVdf(fs.readFileSync(filePath, 'utf8'))
  // remove async — no longer needed
}

// ACF manipulation
/**
 * Removes the given itemIds from WorkshopItemsInstalled and WorkshopItemDetails
 * inside appworkshop_<appId>.acf so Steam treats those items as missing/corrupt
 * and re-queues them for download on next launch.
 */
async function stripAcfEntries(acfPath: string, itemIds: number[]): Promise<void> {
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

  // Write back — wrap in root key to preserve original structure
  const rootKey = 'appworkshop' in root ? 'appworkshop' : Object.keys(root)[0]
  const serialized = `"${rootKey}"\n{\n${serializeVdf(workshop, 1)}}\n`
  fs.writeFileSync(acfPath, serialized, 'utf8')
}

// Local file deletion
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

  // Clean up local files and ACF entries for successfully unsubscribed mods
  const succeeded = results.filter((r) => r.success).map((r) => r.itemId)
  const succeededMods = mods.filter((m) => succeeded.includes(m.itemId))

  for (const mod of succeededMods) deleteModFiles(mod)
  await stripAcfEntries(workshopAcfPath, succeeded)

  return results
}

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

// Force redownload

/**
 * Full force redownload sequence per mod:
 *  1. Delete local files
 *  2. Strip ACF entries so Steam sees it as missing
 *  3. Unsubscribe via API
 *  4. Resubscribe via API
 *  5. Trigger Steam validation to kick off the download
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
      // Step 1: delete local files
      deleteModFiles(mod)

      // Step 2: strip ACF entries
      await stripAcfEntries(workshopAcfPath, [mod.itemId])

      // Step 3 & 4: unsubscribe then resubscribe
      await unsubscribeFromMod(mod.itemId, appId, cookies)
      await subscribeToMod(mod.itemId, appId, cookies)

      results.push({ itemId: mod.itemId, success: true })
    } catch (e) {
      results.push({ itemId: mod.itemId, success: false, error: String(e) })
    }
  }

  // Step 5: trigger Steam to validate workshop content for this app
  // steam://validate kicks off a verification pass which picks up the
  // re-subscribed items and starts downloading them
  await shell.openExternal(`steam://validate/${appId}`)

  return results
}

export async function openModDirectory(modPath: string): Promise<void> {
  const err = await shell.openPath(modPath)
  if (err) throw new Error(`Could not open directory: ${err}`)
}

export async function openModPage(itemId: number): Promise<void> {
  await shell.openExternal(`steam://url/CommunityFilePage/${itemId}`)
}
