import * as fs from 'fs'
import * as path from 'path'
import * as crypto from 'crypto'
import { app } from 'electron'
import type { Mod, Playset } from '../shared/types'

// Storage
function getStorePath(): string {
  return path.join(app.getPath('userData'), 'playsets.json')
}

function loadAll(): Record<string, Playset> {
  try {
    return JSON.parse(fs.readFileSync(getStorePath(), 'utf8')) as Record<string, Playset>
  } catch {
    return {}
  }
}

function saveAll(playsets: Record<string, Playset>): void {
  fs.writeFileSync(getStorePath(), JSON.stringify(playsets, null, 2), 'utf8')
}

// ---------------------------------------------------------------------------
// Share code  –  format: REM-<base64url(JSON)>
//
// The encoded payload is intentionally decodable (not a one-way hash) so that
// any user who receives a code can reconstruct the full mod list without
// needing a server or database lookup.
//
// Payload schema (keep backwards-compatible – always check `v`):
//   { v: 1, a: appId, m: number[] }
// ---------------------------------------------------------------------------

export interface ShareCodePayload {
  appId: number
  modIds: number[]
}

export function encodeShareCode(appId: number, modIds: number[]): string {
  const payload = JSON.stringify({ v: 1, a: appId, m: modIds })
  const b64 = Buffer.from(payload).toString('base64url')
  return `REM-${b64}`
}

export function decodeShareCode(code: string): ShareCodePayload | null {
  if (!code.startsWith('REM-')) return null
  try {
    const raw = Buffer.from(code.slice(4), 'base64url').toString('utf8')
    const parsed = JSON.parse(raw) as { v: number; a: number; m: number[] }
    if (parsed.v !== 1 || typeof parsed.a !== 'number' || !Array.isArray(parsed.m)) return null
    return { appId: parsed.a, modIds: parsed.m }
  } catch {
    return null
  }
}

// CRUD
export function getPlaysets(appId: number): Playset[] {
  return Object.values(loadAll()).filter((p) => p.appId === appId)
}

export function getPlayset(id: string): Playset | null {
  return loadAll()[id] ?? null
}

export function createPlayset(name: string, appId: number, mods: Mod[]): Playset {
  const all = loadAll()
  const id = crypto.randomUUID()
  const code = encodeShareCode(
    appId,
    mods.map((m) => m.itemId)
  )
  const now = Date.now()

  const playset: Playset = { id, name, appId, mods, code, createdAt: now, updatedAt: now }
  all[id] = playset
  saveAll(all)
  return playset
}

export function updatePlayset(id: string, updates: { name?: string; mods?: Mod[] }): Playset {
  const all = loadAll()
  const existing = all[id]
  if (!existing) throw new Error(`Playset "${id}" not found`)

  const mods = updates.mods ?? existing.mods
  const updated: Playset = {
    ...existing,
    name: updates.name ?? existing.name,
    mods,
    // Regenerate the code whenever mods change so it stays in sync
    code: encodeShareCode(
      existing.appId,
      mods.map((m) => m.itemId)
    ),
    updatedAt: Date.now()
  }

  all[id] = updated
  saveAll(all)
  return updated
}

// Reorder mods inside a playset by supplying an ordered array of itemIds.
export function reorderPlaysetMods(id: string, orderedItemIds: number[]): Playset {
  const all = loadAll()
  const existing = all[id]
  if (!existing) throw new Error(`Playset "${id}" not found`)

  const modMap = new Map(existing.mods.map((m) => [m.itemId, m]))
  const reordered = orderedItemIds.flatMap((itemId) => {
    const mod = modMap.get(itemId)
    return mod ? [mod] : []
  })

  return updatePlayset(id, { mods: reordered })
}

export function deletePlayset(id: string): void {
  const all = loadAll()
  delete all[id]
  saveAll(all)
}

export function deletePlaysets(ids: string[]): void {
  const all = loadAll()
  for (const id of ids) delete all[id]
  saveAll(all)
}
