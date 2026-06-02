import { app, shell, BrowserWindow, ipcMain, protocol, net } from 'electron'
import { join } from 'path'
import { Worker } from 'worker_threads'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'
import {
  enrichModsWithRemoteInfo,
  getGameImages,
  getInstalledGames,
  getModsForGame,
  getModsForGameLocal,
  getSteamPath
} from './steam'
import { Game, Mod } from '../shared/types'
import { clearCookieCache, getSteamCookies, isSteamRunning, startSteam } from './cookies'
import * as os from 'node:os'
import path from 'node:path'
import * as fs from 'node:fs'
import { pathToFileURL } from 'node:url'
import {
  openModDirectory,
  openModPage,
  redownloadMods,
  subscribeMods,
  unsubscribeFromMods
} from './steamWorkshop'
import {
  createPlayset,
  decodeShareCode,
  deletePlaysets,
  getPlayset,
  getPlaysets,
  reorderPlaysetMods,
  updatePlayset
} from './playsets'
import {
  deletePlaysetConfig,
  getGamePlaysets,
  getIntegrationInfo,
  syncPlaysetToGame
} from './gameIntegrations'
import { setupAutoUpdater } from './updater'

function shutdownSteamAsync(): Promise<void> {
  return new Promise((resolve, reject) => {
    const worker = new Worker(join(__dirname, 'steamShutdown.worker.js'))
    worker.once('message', (msg) => {
      worker.terminate()
      if (msg.success) resolve()
      else reject(new Error(msg.error))
    })
    worker.once('error', (err) => {
      worker.terminate()
      reject(err)
    })
    worker.postMessage('start')
  })
}

const isWin11 =
  process.platform === 'win32' && parseInt(os.release().split('.')[2] ?? '0', 10) >= 22000

function createWindow(): void {
  const mainWindow = new BrowserWindow({
    title: 'REM',
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 500,
    show: false,
    autoHideMenuBar: true,
    frame: false,
    transparent: true,
    ...(isWin11 ? { backgroundMaterial: 'acrylic' } : {}),
    ...(process.platform === 'linux' ? { icon } : { icon }),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false
    },
    icon
  })

  ipcMain.on('minimize', () => mainWindow.minimize())
  ipcMain.on('maximize', () =>
    mainWindow.isMaximized() ? mainWindow.unmaximize() : mainWindow.maximize()
  )
  ipcMain.on('close', () => mainWindow.close())

  mainWindow.on('ready-to-show', () => {
    mainWindow.show()
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

protocol.registerSchemesAsPrivileged([
  { scheme: 'steamasset', privileges: { secure: true, supportFetchAPI: true } }
])

app.whenReady().then(() => {
  electronApp.setAppUserModelId('com.electron')

  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  ipcMain.on('ping', () => console.log('pong'))

  // Steam / mod handlers (unchanged)
  ipcMain.handle('getInstalledGames', async () => {
    return await getInstalledGames()
  })
  ipcMain.handle('getModsForGame', async (_event, game: Game) => {
    return await getModsForGame(game)
  })
  ipcMain.handle('getModsForGameLocal', async (_event, game: Game) => {
    return await getModsForGameLocal(game)
  })
  ipcMain.handle('enrichMods', async (_event, mods: Mod[]) => {
    const info = await enrichModsWithRemoteInfo(mods)
    return Object.fromEntries(info)
  })
  ipcMain.handle('isSteamRunning', () => isSteamRunning())
  ipcMain.handle('getSteamCookies', () => getSteamCookies())
  ipcMain.handle('shutdownSteam', () => shutdownSteamAsync())
  ipcMain.handle('startSteam', () => startSteam())
  ipcMain.handle('clearCookieCache', () => clearCookieCache())

  protocol.handle('steamasset', (request) => {
    const encoded = request.url.slice('steamasset://localhost/'.length)
    const filePath = decodeURIComponent(encoded)
    return net.fetch(pathToFileURL(filePath).toString())
  })

  ipcMain.handle('debugSteamPaths', () => {
    const steamPath = getSteamPath()
    const cachePath = path.join(steamPath ?? '', 'appcache', 'librarycache')
    const exists = fs.existsSync(cachePath)
    const files = exists ? fs.readdirSync(cachePath).slice(0, 20) : []
    const appSample = files[0]
    const sampleFiles = appSample ? fs.readdirSync(path.join(cachePath, appSample)) : []
    return { steamPath, cachePath, exists, files, sampleFiles }
  })

  ipcMain.handle('debugGameImageFiles', (_event, appId: number) => {
    const steamPath = getSteamPath()
    const dir = path.join(steamPath ?? '', 'appcache', 'librarycache', String(appId))
    if (!fs.existsSync(dir)) return { dir, files: [] }
    const files = fs.readdirSync(dir).map((f) => {
      const full = path.join(dir, f)
      const stat = fs.statSync(full)
      const children = stat.isDirectory() ? fs.readdirSync(full) : []
      return { name: f, size: stat.size, isDir: stat.isDirectory(), children }
    })
    return { dir, files }
  })

  ipcMain.handle('getGameImages', (_event, appId: number) => getGameImages(appId))

  ipcMain.handle('unsubscribeMods', async (_e, mods: Mod[], appId: number) => {
    const cookies = getSteamCookies()
    const acfPath = path.join(
      path.dirname(path.dirname(path.dirname(mods[0].path))),
      `appworkshop_${appId}.acf`
    )
    return unsubscribeFromMods(mods, appId, acfPath, cookies)
  })

  ipcMain.handle('subscribeMods', async (_e, itemIds: number[], appId: number) => {
    const cookies = getSteamCookies()
    return subscribeMods(itemIds, appId, cookies)
  })

  ipcMain.handle('redownloadMods', async (_e, mods: Mod[], appId: number) => {
    const cookies = getSteamCookies()
    const acfPath = path.join(
      path.dirname(path.dirname(path.dirname(mods[0].path))),
      `appworkshop_${appId}.acf`
    )
    return redownloadMods(mods, appId, acfPath, cookies)
  })

  ipcMain.handle('openModDirectory', (_e, modPath: string) => openModDirectory(modPath))
  ipcMain.handle('openModPage', (_e, itemId: number) => openModPage(itemId))

  // Playset handlers
  ipcMain.handle('getPlaysets', (_e, appId: number) => getPlaysets(appId))
  ipcMain.handle('getGamePlaysets', async (_e, game: Game) => getGamePlaysets(game))

  ipcMain.handle('getPlayset', (_e, id: string) => getPlayset(id))

  ipcMain.handle('createPlayset', (_e, name: string, appId: number, mods: Mod[]) =>
    createPlayset(name, appId, mods)
  )

  ipcMain.handle('updatePlayset', (_e, id: string, updates: { name?: string; mods?: Mod[] }) =>
    updatePlayset(id, updates)
  )

  ipcMain.handle('reorderPlaysetMods', (_e, id: string, orderedItemIds: number[]) =>
    reorderPlaysetMods(id, orderedItemIds)
  )

  ipcMain.handle('deletePlaysets', (_e, ids: string[]) => deletePlaysets(ids))

  ipcMain.handle('deleteGamePlayset', async (_e, game: Game, name: string) => {
    return deletePlaysetConfig(game, name)
  })

  ipcMain.handle('decodeShareCode', (_e, code: string) => decodeShareCode(code))

  ipcMain.handle('getGameIntegrationInfo', (_e, appId: number) => getIntegrationInfo(appId))

  ipcMain.handle('syncPlaysetToGame', async (_e, game: Game, playsetName: string, mods: Mod[]) =>
    syncPlaysetToGame(game, playsetName, mods)
  )

  createWindow()

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
  const win = BrowserWindow.getAllWindows()[0]
  setupAutoUpdater(win)
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
