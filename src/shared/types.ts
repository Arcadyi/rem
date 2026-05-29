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
  localTimestamp: Date
  remoteTimestamp: Date
  status: ModStatus
  sizeBytes: number
  previewUrl?: string
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
