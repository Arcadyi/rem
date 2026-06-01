import * as fs from 'fs'
import type { Game, GameIntegrationInfo, Mod, NativePlayset } from '../shared/types'
import { eu5Integration } from './integrations/europaUniversalis5'

export interface GameIntegration extends GameIntegrationInfo {
  /**
   * Return the absolute path to the config file, or null if not found on
   * this machine (game never launched, non-standard install path, etc.)
   */
  findConfigPath: (game: Game) => string | null

  /**
   * Read ALL playsets from the game's config file.
   * Returns them in whatever order the file stores them.
   */
  readPlaysets: (configPath: string) => Promise<NativePlayset[]>

  /**
   * Upsert a single playset by name into the game's config file.
   * - If a playset with `playsetName` already exists: update its mod list only,
   *   leaving all other fields (DLC, isActive, etc.) untouched.
   * - If no matching playset exists: append a new one.
   * Mods absent from `mods` are omitted entirely — never written as disabled.
   */
  writePlayset: (configPath: string, playsetName: string, mods: Mod[], game: Game) => Promise<void>

  deletePlaysetConfig: (configPath: string, playsetName: string) => Promise<void>
}

// Re-export so callers can import GameIntegrationInfo from either location
export type { GameIntegrationInfo } from '../shared/types'

// Helpers
export function atomicWrite(filePath: string, content: string): void {
  const tmp = filePath + '.apsys_tmp'
  fs.writeFileSync(tmp, content, 'utf8')
  fs.renameSync(tmp, filePath)
}

// Registry
const INTEGRATIONS: Map<number, GameIntegration> = new Map(
  [eu5Integration].map((i) => [i.appId, i])
)

export function getIntegrationInfo(appId: number): GameIntegrationInfo | null {
  const integration = INTEGRATIONS.get(appId)
  if (!integration) return null
  return {
    appId: integration.appId,
    gameName: integration.gameName,
    description: integration.description,
    canSync: integration.canSync
  }
}

/**
 * Read all playsets from the game's own config file.
 * Returns [] if the game has no integration or the config file is not found.
 */
export async function getGamePlaysets(game: Game): Promise<NativePlayset[]> {
  const integration = INTEGRATIONS.get(game.appId)
  if (!integration) return []
  const configPath = integration.findConfigPath(game)
  if (!configPath) return []
  return integration.readPlaysets(configPath)
}

/**
 * Upsert a playset by name into the game's config file.
 * Throws if no integration exists for this appId or the config file is missing.
 */
export async function syncPlaysetToGame(
  game: Game,
  playsetName: string,
  mods: Mod[]
): Promise<void> {
  const integration = INTEGRATIONS.get(game.appId)
  if (!integration) throw new Error(`No sync integration for appId ${game.appId}`)

  const configPath = integration.findConfigPath(game)
  if (!configPath) {
    throw new Error(
      `Could not find the config file for ${integration.gameName}. ` +
        `Make sure the game has been run at least once.`
    )
  }

  await integration.writePlayset(configPath, playsetName, mods, game)
}

export async function deletePlaysetConfig(game: Game, playsetName: string): Promise<void> {
  const integration = INTEGRATIONS.get(game.appId)
  if (!integration) throw new Error(`No sync integration for appId ${game.appId}`)

  const configPath = integration.findConfigPath(game)
  if (!configPath) return // Or throw error

  await integration.deletePlaysetConfig(configPath, playsetName)
}
