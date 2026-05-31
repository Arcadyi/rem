import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'
import { Game, Mod } from '../shared/types'

// Custom APIs for renderer
const api = {}

// Use `contextBridge` APIs to expose Electron APIs to
// renderer only if context isolation is enabled, otherwise
// just add to the DOM global.
if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('api', {
      minimize: () => ipcRenderer.send('minimize'),
      maximize: () => ipcRenderer.send('maximize'),
      close: () => ipcRenderer.send('close')
    })
    contextBridge.exposeInMainWorld('steamAPI', {
      getInstalledGames: () => ipcRenderer.invoke('getInstalledGames'),
      getModsForGame: (game: Game) => ipcRenderer.invoke('getModsForGame', game),
      getModsForGameLocal: (game: Game) => ipcRenderer.invoke('getModsForGameLocal', game),
      enrichMods: (mods: Mod[]) => ipcRenderer.invoke('enrichMods', mods),
      isSteamRunning: () => ipcRenderer.invoke('isSteamRunning'),
      shutdownSteam: () => ipcRenderer.invoke('shutdownSteam'),
      startSteam: () => ipcRenderer.invoke('startSteam'),
      getSteamCookies: () => ipcRenderer.invoke('getSteamCookies'),
      debugSteamPaths: () => ipcRenderer.invoke('debugSteamPaths'),
      debugGameImageFiles: () => ipcRenderer.invoke('debugGameImageFiles'),
      clearCookieCache: () => ipcRenderer.invoke('clearCookieCache'),
      getGameImages: (appId: number) => ipcRenderer.invoke('getGameImages', appId)
    })
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-ignore (define in dts)
  window.electron = electronAPI
  // @ts-ignore (define in dts)
  window.api = api
}
