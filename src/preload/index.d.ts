import { ElectronAPI } from '@electron-toolkit/preload'
import type { Game, GameImages, Mod, SteamCookies } from '../shared/types'
import { enrichModsWithRemoteInfo, getModsForGameLocal } from '../main/steam'

declare global {
  interface Window {
    electron: ElectronAPI
    api: {
      minimize: () => ({})
      maximize: () => ({})
      close: () => ({})
    }
    steamAPI: {
      getInstalledGames: () => Promise<Game[]>
      getModsForGame: (game: Game) => Promise<Mod[]>
      getModsForGameLocal: (game: Game) => Promise<Mod[]>
      enrichMods: (mods: Mod[]) => Promise<Map<number, { name: string; previewUrl: string | null }>>
      isSteamRunning: () => Promise<boolean>
      shutdownSteam: () => Promise<void>
      startSteam: () => Promise<void>
      clearCookieCache: () => Promise<void>
      getSteamCookies: () => Promise<SteamCookies>
      debugSteamPaths: () => Promise<void>
      debugGameImageFiles: () => Promise<void>
      getGameImages: (appId: number) => Promise<GameImages>
    }
  }
}
