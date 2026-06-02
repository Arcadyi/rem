import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'
import type { Game, Mod } from '../shared/types'

if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('api', {
      minimize: () => ipcRenderer.send('minimize'),
      maximize: () => ipcRenderer.send('maximize'),
      close: () => ipcRenderer.send('close')
    })
    contextBridge.exposeInMainWorld('steamAPI', {
      // ----- Games & mods -----
      getInstalledGames: () => ipcRenderer.invoke('getInstalledGames'),
      getModsForGame: (game: Game) => ipcRenderer.invoke('getModsForGame', game),
      getModsForGameLocal: (game: Game) => ipcRenderer.invoke('getModsForGameLocal', game),
      enrichMods: (mods: Mod[]) => ipcRenderer.invoke('enrichMods', mods),
      isSteamRunning: () => ipcRenderer.invoke('isSteamRunning'),
      shutdownSteam: () => ipcRenderer.invoke('shutdownSteam'),
      startSteam: () => ipcRenderer.invoke('startSteam'),
      getSteamCookies: () => ipcRenderer.invoke('getSteamCookies'),
      clearCookieCache: () => ipcRenderer.invoke('clearCookieCache'),
      debugSteamPaths: () => ipcRenderer.invoke('debugSteamPaths'),
      debugGameImageFiles: () => ipcRenderer.invoke('debugGameImageFiles'),
      getGameImages: (appId: number) => ipcRenderer.invoke('getGameImages', appId),
      openModPage: (itemId: number) => ipcRenderer.invoke('openModPage', itemId),
      openModDirectory: (modPath: string) => ipcRenderer.invoke('openModDirectory', modPath),
      unsubscribeMods: (mods: Mod[], appId: number) =>
        ipcRenderer.invoke('unsubscribeMods', mods, appId),
      redownloadMods: (mods: Mod[], appId: number) =>
        ipcRenderer.invoke('redownloadMods', mods, appId),

      // ----- Playsets -----
      getPlaysets: (appId: number) => ipcRenderer.invoke('getPlaysets', appId),
      getGamePlaysets: (game: Game) => ipcRenderer.invoke('getGamePlaysets', game),
      getPlayset: (id: string) => ipcRenderer.invoke('getPlayset', id),
      createPlayset: (name: string, appId: number, mods: Mod[]) =>
        ipcRenderer.invoke('createPlayset', name, appId, mods),
      updatePlayset: (id: string, updates: { name?: string; mods?: Mod[] }) =>
        ipcRenderer.invoke('updatePlayset', id, updates),
      reorderPlaysetMods: (id: string, orderedItemIds: number[]) =>
        ipcRenderer.invoke('reorderPlaysetMods', id, orderedItemIds),
      deletePlaysets: (ids: string[]) => ipcRenderer.invoke('deletePlaysets', ids),
      deleteGamePlayset: (game: Game, name: string) =>
        ipcRenderer.invoke('deleteGamePlayset', game, name),
      decodeShareCode: (code: string) => ipcRenderer.invoke('decodeShareCode', code),
      getGameIntegrationInfo: (appId: number) =>
        ipcRenderer.invoke('getGameIntegrationInfo', appId),
      syncPlaysetToGame: (game: Game, playsetName: string, mods: Mod[]) =>
        ipcRenderer.invoke('syncPlaysetToGame', game, playsetName, mods)
    })

    contextBridge.exposeInMainWorld('updaterAPI', {
      getVersion: () => ipcRenderer.invoke('get-app-version'),
      checkForUpdates: () => ipcRenderer.invoke('update-check'),
      downloadUpdate: () => ipcRenderer.invoke('update-download'),
      installUpdate: () => ipcRenderer.invoke('update-install'),

      onUpdateAvailable: (cb: (info: { version: string; releaseNotes: string | null }) => void) => {
        ipcRenderer.on('update-available', (_e, info) => cb(info))
      },
      onUpdateNotAvailable: (cb: () => void) => {
        ipcRenderer.on('update-not-available', cb)
      },
      onDownloadProgress: (cb: (percent: number) => void) => {
        ipcRenderer.on('update-download-progress', (_e, percent) => cb(percent))
      },
      onUpdateDownloaded: (cb: () => void) => {
        ipcRenderer.on('update-downloaded', cb)
      },
      onUpdateError: (cb: (message: string) => void) => {
        ipcRenderer.on('update-error', (_e, message) => cb(message))
      },

      // Cleanup — we call this when the component unmounts
      removeAllListeners: () => {
        for (const ch of [
          'update-available',
          'update-not-available',
          'update-download-progress',
          'update-downloaded',
          'update-error'
        ]) {
          ipcRenderer.removeAllListeners(ch)
        }
      }
    })
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-ignore (define in dts)
  window.electron = electronAPI
  // @ts-ignore (define in dts)
  window.api = {}
}
