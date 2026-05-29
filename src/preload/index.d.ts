import { ElectronAPI } from '@electron-toolkit/preload'
import type { Game, Mod } from '../shared/types'

declare global {
  interface Window {
    electron: ElectronAPI
    api: unknown
    steamAPI: {
      getInstalledGames: () => Promise<Game[]>
      getModsForGame: (game: Game) => Promise<Mod[]>
    }
  }
}
