export type ModStatus = 'upToDate' | 'outdated' | 'unknown'

export interface Game {
  appId: number
  name: string
  workshopPath: string
  totalMods: number
  upToDate: number
  outdated: number
  path: string
  mods: Mod[]
}

export interface Mod {
  itemId: number
  name: string
  path: string
  localTimestamp: number
  remoteTimestamp: number
  status: ModStatus
  sizeBytes: number
  previewUrl: string | null
}

export interface WorkshopItemInfo {
  name: string
  previewUrl: string | null
}

export interface PlaylistModEntry {
  mod: Mod
  position: number
}

export interface Playlist {
  id: string
  name: string
  appId: number
  mods: Mod[]
  code: string
}

export interface SteamCookies {
  sessionId: string
  loginSecure: string
}

export interface GameImages {
  icon: string | null
  header: string | null
  capsule: string | null
  hero: string | null
  logo: string | null
}
