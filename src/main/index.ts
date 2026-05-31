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
  // Create the browser window.
  const mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 500,
    show: false,
    autoHideMenuBar: true,
    frame: false,
    transparent: true,
    ...(isWin11 ? { backgroundMaterial: 'acrylic' } : {}),
    ...(process.platform === 'linux' ? { icon } : {}),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false
    }
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

  // HMR for renderer base on electron-vite cli.
  // Load the remote URL for development or the local html file for production.
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

protocol.registerSchemesAsPrivileged([
  { scheme: 'steamasset', privileges: { secure: true, supportFetchAPI: true } }
])

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(() => {
  // Set app user model id for windows
  electronApp.setAppUserModelId('com.electron')

  // Default open or close DevTools by F12 in development
  // and ignore CommandOrControl + R in production.
  // see https://github.com/alex8088/electron-toolkit/tree/master/packages/utils
  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  // IPC test
  ipcMain.on('ping', () => console.log('pong'))

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
    // URL is: steamasset://localhost/<url-encoded-absolute-path>
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
  createWindow()

  app.on('activate', function () {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.
