import { autoUpdater, UpdateInfo } from 'electron-updater'
import { BrowserWindow, ipcMain, app } from 'electron'
import { is } from '@electron-toolkit/utils'

export function setupAutoUpdater(mainWindow: BrowserWindow): void {
  const currentVersion = app.getVersion()
  console.log(`[updater] current version: ${currentVersion}`)

  autoUpdater.autoDownload = false
  autoUpdater.autoInstallOnAppQuit = true

  autoUpdater.logger = {
    info: (msg) => console.log(`[updater] ${msg}`),
    warn: (msg) => console.warn(`[updater] ${msg}`),
    error: (msg) => console.error(`[updater] ${msg}`),
    debug: (msg) => console.log(`[updater:debug] ${msg}`)
  }

  autoUpdater.on('checking-for-update', () => {
    console.log('[updater] checking for update…')
  })

  autoUpdater.on('update-available', (info: UpdateInfo) => {
    console.log(`[updater] update available — latest: ${info.version}, current: ${currentVersion}`)
    mainWindow.webContents.send('update-available', {
      version: info.version,
      releaseNotes: info.releaseNotes ?? null
    })
  })

  autoUpdater.on('update-not-available', (info: UpdateInfo) => {
    console.log(`[updater] already up to date — latest: ${info.version}`)
    mainWindow.webContents.send('update-not-available')
  })

  autoUpdater.on('download-progress', (progress) => {
    console.log(
      `[updater] downloading… ${Math.floor(progress.percent)}% (${Math.round(progress.transferred / 1024)}KB / ${Math.round(progress.total / 1024)}KB)`
    )
    mainWindow.webContents.send('update-download-progress', Math.floor(progress.percent))
  })

  autoUpdater.on('update-downloaded', (info: UpdateInfo) => {
    console.log(`[updater] download complete — ready to install v${info.version}`)
    mainWindow.webContents.send('update-downloaded')
  })

  autoUpdater.on('error', (err) => {
    console.error(`[updater] error: ${err.message}`)
    mainWindow.webContents.send('update-error', err.message)
  })

  ipcMain.handle('update-check', () => {
    if (is.dev) {
      console.log('[updater] update-check called in dev mode — skipping')
      setTimeout(() => mainWindow.webContents.send('update-not-available'), 500)
      return null
    }
    console.log('[updater] manual check triggered')
    return autoUpdater.checkForUpdates()
  })

  ipcMain.handle('update-download', () => {
    console.log('[updater] download triggered')
    return autoUpdater.downloadUpdate()
  })

  ipcMain.handle('update-install', () => {
    console.log('[updater] install triggered — quitting and installing')
    return autoUpdater.quitAndInstall()
  })

  ipcMain.handle('get-app-version', () => {
    return app.getVersion()
  })

  // Only auto-check on startup in production
  if (is.dev) {
    console.log('[updater] dev mode — skipping startup check')
    return
  }

  console.log('[updater] checking for updates on startup…')
  autoUpdater.checkForUpdates()
}
