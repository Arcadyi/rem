import * as fs from 'fs'
import * as path from 'path'
import * as os from 'os'
import { execSync } from 'child_process'
import type { Game, Mod, ModStatus } from '../shared/types'

const IGNORED_APP_IDS = new Set([
  228980, // Steamworks Common Redistributables
  1070560, // Steam Linux Runtime
  4183110, // Steam Linux Runtime 4.0
  1391110, // Steam Linux Runtime - Soldier
  1628350, // Steam Linux Runtime - Sniper
  1493710, // Proton Experimental
  2348590, // Proton 8.0
  2805730, // Proton 9.0
  1245040, // Proton 7.0
  2180100 // Proton Hotfix
])

// VDF parser
// Handles the flat/nested text format used by Steam's .vdf and .acf files.
type VdfValue = string | VdfNode
interface VdfNode {
  [key: string]: VdfValue
}

function parseVdf(content: string): VdfNode {
  const tokens = tokeniseVdf(content)
  const [node] = parseVdfNode(tokens, 0)
  return node
}

function tokeniseVdf(content: string): string[] {
  const tokens: string[] = []
  let i = 0

  while (i < content.length) {
    // Skip whitespace
    if (/\s/.test(content[i])) {
      i++
      continue
    }

    // Skip line comments
    if (content[i] === '/' && content[i + 1] === '/') {
      while (i < content.length && content[i] !== '\n') i++
      continue
    }

    if (content[i] === '{' || content[i] === '}') {
      tokens.push(content[i++])
      continue
    }

    // Quoted string
    if (content[i] === '"') {
      let str = ''
      i++ // skip opening quote
      while (i < content.length && content[i] !== '"') {
        if (content[i] === '\\' && i + 1 < content.length) {
          i++ // skip backslash
          str += content[i] === 'n' ? '\n' : content[i] === 't' ? '\t' : content[i]
        } else {
          str += content[i]
        }
        i++
      }
      i++ // skip closing quote
      tokens.push(str)
      continue
    }

    // Unquoted token (uncommon in modern VDF but present in some files)
    let tok = ''
    while (i < content.length && !/[\s{}"/]/.test(content[i])) {
      tok += content[i++]
    }
    if (tok) tokens.push(tok)
  }

  return tokens
}

function parseVdfNode(tokens: string[], pos: number): [VdfNode, number] {
  const node: VdfNode = {}

  while (pos < tokens.length) {
    const token = tokens[pos]

    if (token === '}') return [node, pos + 1]
    if (token === '{') {
      // Orphaned open brace — skip it
      pos++
      continue
    }

    const key = token
    pos++

    if (pos >= tokens.length) break

    if (tokens[pos] === '{') {
      // Nested node
      const [child, next] = parseVdfNode(tokens, pos + 1)
      node[key.toLowerCase()] = child
      pos = next
    } else {
      // Scalar value
      node[key.toLowerCase()] = tokens[pos++]
    }
  }

  return [node, pos]
}

function vdfString(node: VdfNode, key: string): string {
  const v = node[key]
  return typeof v === 'string' ? v : ''
}

function vdfNode(node: VdfNode, key: string): VdfNode | null {
  const v = node[key]
  return v && typeof v === 'object' ? (v as VdfNode) : null
}

// Steam path discovery
function getSteamPath(): string | null {
  if (process.platform === 'win32') {
    // Prefer the registry — most reliable even when Steam is on a non-default drive
    for (const hive of [
      'HKEY_CURRENT_USER\\Software\\Valve\\Steam',
      'HKEY_LOCAL_MACHINE\\SOFTWARE\\WOW6432Node\\Valve\\Steam',
      'HKEY_LOCAL_MACHINE\\SOFTWARE\\Valve\\Steam'
    ]) {
      try {
        const out = execSync(`reg query "${hive}" /v SteamPath 2>nul`, {
          encoding: 'utf8',
          stdio: ['ignore', 'pipe', 'ignore']
        })
        const match = out.match(/SteamPath\s+REG_SZ\s+(.+)/i)
        if (match) {
          const p = match[1].trim().replace(/\//g, path.sep)
          if (fs.existsSync(p)) return p
        }
      } catch {
        // Key not present in this hive — try the next one
      }
    }

    // Hard-coded fallbacks
    for (const p of ['C:\\Program Files (x86)\\Steam', 'C:\\Program Files\\Steam']) {
      if (fs.existsSync(p)) return p
    }

    return null
  }

  if (process.platform === 'linux') {
    const home = os.homedir()
    for (const p of [
      path.join(home, '.steam', 'steam'),
      path.join(home, '.local', 'share', 'Steam'),
      path.join(home, '.steam', 'root'),
      '/usr/share/steam'
    ]) {
      if (fs.existsSync(p)) return p
    }
    return null
  }

  return null
}

// Library folder discovery
function getLibraryPaths(steamPath: string): string[] {
  const vdfPath = path.join(steamPath, 'steamapps', 'libraryfolders.vdf')
  if (!fs.existsSync(vdfPath)) return [steamPath]

  const root = parseVdf(fs.readFileSync(vdfPath, 'utf8'))
  const lf = vdfNode(root, 'libraryfolders') ?? root

  const resolve = (p: string): string => {
    try {
      return fs.realpathSync(p)
    } catch {
      return p
    }
  }

  const libraries = new Set<string>([resolve(steamPath)])

  for (const key of Object.keys(lf)) {
    const entry = lf[key]
    if (typeof entry === 'string') {
      if (/^\d+$/.test(key) && fs.existsSync(entry)) libraries.add(resolve(entry))
    } else if (entry && typeof entry === 'object') {
      const libraryPath = vdfString(entry as VdfNode, 'path')
      if (libraryPath && fs.existsSync(libraryPath)) libraries.add(resolve(libraryPath))
    }
  }

  return [...libraries]
}

// App manifest parsing
interface AppManifest {
  appId: number
  name: string
  installDir: string
}

function parseAppManifest(filePath: string): AppManifest | null {
  try {
    const root = parseVdf(fs.readFileSync(filePath, 'utf8'))
    const state = vdfNode(root, 'appstate') ?? root

    const appId = parseInt(vdfString(state, 'appid'), 10)
    const name = vdfString(state, 'name')
    const installDir = vdfString(state, 'installdir')

    if (!appId || !name || !installDir) return null
    return { appId, name, installDir }
  } catch {
    return null
  }
}

// Public API
/**
 * Returns all installed Steam games found across every Steam library on the
 * current machine (Windows and Linux).
 */
export async function getInstalledGames(): Promise<Game[]> {
  const steamPath = getSteamPath()
  if (!steamPath) throw new Error('Steam installation not found')

  const libraryPaths = getLibraryPaths(steamPath)
  const games: Game[] = []

  for (const libraryPath of libraryPaths) {
    const steamappsDir = path.join(libraryPath, 'steamapps')
    if (!fs.existsSync(steamappsDir)) continue

    let entries: fs.Dirent[]
    try {
      entries = fs.readdirSync(steamappsDir, { withFileTypes: true })
    } catch {
      continue
    }

    for (const entry of entries) {
      if (!entry.isFile()) continue
      if (!/^appmanifest_\d+\.acf$/i.test(entry.name)) continue

      const manifest = parseAppManifest(path.join(steamappsDir, entry.name))
      if (!manifest) continue
      if (IGNORED_APP_IDS.has(manifest.appId)) continue

      const gamePath = path.join(steamappsDir, 'common', manifest.installDir)
      const workshopPath = path.join(steamappsDir, 'workshop', 'content', String(manifest.appId))

      games.push({
        appId: manifest.appId,
        name: manifest.name,
        path: gamePath,
        workshopPath,
        totalMods: 0,
        upToDate: 0,
        outdated: 0,
        mods: []
      })
    }
  }

  // Have to do this to prevent duplicate entries.
  const seen = new Set<number>()
  const unique = games.filter((g) => {
    if (seen.has(g.appId)) return false
    seen.add(g.appId)
    return true
  })
  unique.sort((a, b) => a.name.localeCompare(b.name))
  return unique
}

// ---------------------------------------------------------------------------
// Workshop mod retrieval
// ---------------------------------------------------------------------------

interface WorkshopItemMeta {
  remoteTimestamp: Date
  sizeBytes: number
}

/**
 * Parses appworkshop_<appId>.acf to extract per-item timestamps and sizes.
 * Returns a map of itemId → metadata.
 */
function parseWorkshopAcf(acfPath: string): Map<number, WorkshopItemMeta> {
  const result = new Map<number, WorkshopItemMeta>()
  if (!fs.existsSync(acfPath)) return result

  try {
    const root = parseVdf(fs.readFileSync(acfPath, 'utf8'))
    const workshop = vdfNode(root, 'appworkshop') ?? root

    // WorkshopItemsInstalled holds the remote timeupdated and size for each item
    const installed = vdfNode(workshop, 'workshopitemsinstalled')
    if (!installed) return result

    for (const itemKey of Object.keys(installed)) {
      const itemId = parseInt(itemKey, 10)
      if (isNaN(itemId)) continue

      const entry = vdfNode(installed, itemKey)
      if (!entry) continue

      const ts = parseInt(vdfString(entry, 'timeupdated'), 10)
      const size = parseInt(vdfString(entry, 'size'), 10)

      result.set(itemId, {
        remoteTimestamp: isNaN(ts) ? new Date(0) : new Date(ts * 1000),
        sizeBytes: isNaN(size) ? 0 : size
      })
    }
  } catch {
    // Corrupt ACF — return whatever we parsed so far
  }

  return result
}

/**
 * Fetches workshop item titles from the Steam Web API in batches.
 * Does not require an API key.
 */
async function fetchWorkshopItemNames(itemIds: number[]): Promise<Map<number, string>> {
  const names = new Map<number, string>()
  if (itemIds.length === 0) return names

  // The API accepts up to 100 items per request
  const BATCH_SIZE = 100

  for (let i = 0; i < itemIds.length; i += BATCH_SIZE) {
    const batch = itemIds.slice(i, i + BATCH_SIZE)

    const body = new URLSearchParams()
    body.append('itemcount', String(batch.length))
    batch.forEach((id, idx) => body.append(`publishedfileids[${idx}]`, String(id)))

    try {
      const res = await fetch(
        'https://api.steampowered.com/ISteamRemoteStorage/GetPublishedFileDetails/v1/',
        { method: 'POST', body }
      )
      if (!res.ok) continue

      const json = await res.json()
      const details: Array<{ publishedfileid: string; title?: string }> =
        json?.response?.publishedfiledetails ?? []

      for (const item of details) {
        const id = parseInt(item.publishedfileid, 10)
        if (!isNaN(id) && item.title) names.set(id, item.title)
      }
    } catch {
      // Network unavailable — names will fall back to the itemId string
    }
  }

  return names
}

/**
 * Returns all installed workshop mods for a given game, including timestamps,
 * sizes, update status, and titles fetched from the Steam Web API.
 */
export async function getModsForGame(game: Game): Promise<Mod[]> {
  const { workshopPath, appId } = game

  if (!fs.existsSync(workshopPath)) return []

  // Find the steamapps dir: workshop/content/<appId> → up three levels → steamapps
  const steamappsDir = path.resolve(workshopPath, '..', '..', '..')
  const acfPath = path.join(steamappsDir, 'workshop', `appworkshop_${appId}.acf`)
  const workshopMeta = parseWorkshopAcf(acfPath)

  // Each subdirectory in workshopPath is one installed mod, named by its itemId
  let entries: fs.Dirent[]
  try {
    entries = fs.readdirSync(workshopPath, { withFileTypes: true })
  } catch {
    return []
  }

  const modDirs = entries.filter((e) => e.isDirectory() && /^\d+$/.test(e.name))
  const itemIds = modDirs.map((e) => parseInt(e.name, 10))

  const names = await fetchWorkshopItemNames(itemIds)

  const mods: Mod[] = []

  for (const dir of modDirs) {
    const itemId = parseInt(dir.name, 10)
    const modPath = path.join(workshopPath, dir.name)
    const meta = workshopMeta.get(itemId)

    // Local timestamp: mtime of the mod folder (updated when Steam syncs it)
    let localTimestamp: Date
    try {
      localTimestamp = fs.statSync(modPath).mtime
    } catch {
      localTimestamp = new Date(0)
    }

    const remoteTimestamp = meta?.remoteTimestamp ?? new Date(0)
    const sizeBytes = meta?.sizeBytes ?? 0

    let status: ModStatus
    if (remoteTimestamp.getTime() === 0) {
      status = 'unknown'
    } else if (localTimestamp >= remoteTimestamp) {
      status = 'upToDate'
    } else {
      status = 'outdated'
    }

    mods.push({
      itemId,
      name: names.get(itemId) ?? String(itemId),
      path: modPath,
      localTimestamp,
      remoteTimestamp,
      status,
      sizeBytes
    })
  }

  mods.sort((a, b) => a.name.localeCompare(b.name))
  return mods
}
