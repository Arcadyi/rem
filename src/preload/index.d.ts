import { ElectronAPI } from '@electron-toolkit/preload'
import type { Game, GameImages, Mod, SteamCookies } from '../shared/types'

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
