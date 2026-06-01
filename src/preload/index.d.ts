import { ElectronAPI } from '@electron-toolkit/preload'
import type {
  Game,
  GameImages,
  GameIntegrationInfo,
  Mod,
  NativePlayset,
  Playset,
  ShareCodePayload,
  SteamCookies,
  WorkshopActionResult
} from '../shared/types'

declare global {
  interface Window {
    electron: ElectronAPI
    api: {
      minimize: () => void
      maximize: () => void
      close: () => void
    }
    steamAPI: {
      // ----- Games & mods -----
      getInstalledGames: () => Promise<Game[]>
      getModsForGame: (game: Game) => Promise<Mod[]>
      getModsForGameLocal: (game: Game) => Promise<Mod[]>
      enrichMods: (mods: Mod[]) => Promise<Record<number, { name: string; previewUrl: string | null }>>
      isSteamRunning: () => Promise<boolean>
      shutdownSteam: () => Promise<void>
      startSteam: () => Promise<void>
      getSteamCookies: () => Promise<SteamCookies>
      clearCookieCache: () => Promise<void>
      debugSteamPaths: () => Promise<void>
      debugGameImageFiles: () => Promise<void>
      getGameImages: (appId: number) => Promise<GameImages>
      openModPage: (itemId: number) => Promise<void>
      openModDirectory: (modPath: string) => Promise<void>
      unsubscribeMods: (mods: Mod[], appId: number) => Promise<WorkshopActionResult[]>
      redownloadMods: (mods: Mod[], appId: number) => Promise<WorkshopActionResult[]>

      getPlaysets: (appId: number) => Promise<Playset[]>
      getGamePlaysets: (game: Game) => Promise<NativePlayset[]>
      getPlayset: (id: string) => Promise<Playset | null>
      createPlayset: (name: string, appId: number, mods: Mod[]) => Promise<Playset>
      updatePlayset: (id: string, updates: { name?: string; mods?: Mod[] }) => Promise<Playset>
      reorderPlaysetMods: (id: string, orderedItemIds: number[]) => Promise<Playset>
      deletePlaysets: (ids: string[]) => Promise<void>
      deleteGamePlayset: (game: Game, playsetName: string) => Promise<void>
      decodeShareCode: (code: string) => Promise<ShareCodePayload | null>
      getGameIntegrationInfo: (appId: number) => Promise<GameIntegrationInfo | null>
      syncPlaysetToGame: (game: Game, playsetName: string, mods: Mod[]) => Promise<void>
    }
  }
}
