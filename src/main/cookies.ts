import * as fs from 'fs'
import * as path from 'path'
import * as os from 'os'
import * as crypto from 'crypto'
import { execSync, spawnSync, spawn } from 'child_process'
import Database from 'better-sqlite3'
import { SteamCookies } from '../shared/types'
import { app, safeStorage } from 'electron'

export function isSteamRunning(): boolean {
  try {
    if (process.platform === 'win32') {
      const out = execSync('tasklist /FI "IMAGENAME eq steam.exe" /NH', {
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'ignore']
      })
      return out.toLowerCase().includes('steam.exe')
    } else {
      // pgrep returns exit code 1 if nothing found — execSync throws, caught below
      execSync('pgrep -xi steam', { stdio: 'ignore' })
      return true
    }
  } catch {
    return false
  }
}

/**
 * Asks Steam to exit cleanly, then waits up to `timeoutMs` for it to stop.
 * Falls back to a force-kill if it doesn't close in time.
 */
export function shutdownSteam(timeoutMs = 10_000): void {
  if (!isSteamRunning()) return

  if (process.platform === 'win32') {
    try {
      execSync('start /min "" steam://exit', { shell: 'cmd.exe', stdio: 'ignore' })
    } catch {
      // Protocol handler unavailable — fall through to force kill
    }
  } else {
    try {
      execSync('pkill -TERM -xi steam', { stdio: 'ignore' })
    } catch {
      // Process not found — already closing
    }
  }

  // Poll every 500ms instead of 300ms, but check sooner
  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline) {
    Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 500)
    if (!isSteamRunning()) return
  }

  // Force kill if still running after timeout
  try {
    if (process.platform === 'win32') {
      execSync('taskkill /F /IM steam.exe', { stdio: 'ignore' })
    } else {
      execSync('pkill -KILL -xi steam', { stdio: 'ignore' })
    }
  } catch {
    // Steam already exited before force kill — safe to ignore
  }

  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 1_000)
}

/**
 * Launches Steam in the background and returns immediately.
 */
export function startSteam(): void {
  if (process.platform === 'win32') {
    const steamExe = getSteamExecutablePath()
    if (!steamExe) throw new Error('Steam executable not found')
    spawn(steamExe, [], { detached: true, stdio: 'ignore' }).unref()
  } else {
    spawn('steam', [], { detached: true, stdio: 'ignore' }).unref()
  }
}

function getSteamExecutablePath(): string | null {
  if (process.platform !== 'win32') return null

  for (const hive of [
    'HKEY_CURRENT_USER\\Software\\Valve\\Steam',
    'HKEY_LOCAL_MACHINE\\SOFTWARE\\WOW6432Node\\Valve\\Steam'
  ]) {
    try {
      const out = execSync(`reg query "${hive}" /v SteamExe 2>nul`, {
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'ignore']
      })
      const match = out.match(/SteamExe\s+REG_SZ\s+(.+)/i)
      if (match) {
        const p = match[1].trim().replace(/\//g, path.sep)
        if (fs.existsSync(p)) return p
      }
    } catch {
      // Hive not present on this machine — try the next one
    }
  }

  for (const p of [
    'C:\\Program Files (x86)\\Steam\\steam.exe',
    'C:\\Program Files\\Steam\\steam.exe'
  ]) {
    if (fs.existsSync(p)) return p
  }

  return null
}

// Cookie DB path resolution
function getCookieDbPath(): string {
  if (process.platform === 'win32') {
    const base = process.env['LOCALAPPDATA'] ?? path.join(os.homedir(), 'AppData', 'Local')
    const candidates = [
      path.join(base, 'Steam', 'htmlcache', 'Default', 'Network', 'Cookies'),
      path.join(base, 'Steam', 'htmlcache', 'Default', 'Cookies'),
      path.join(base, 'Steam', 'htmlcache', 'Cookies'),
      path.join(base, 'Steam', 'config', 'htmlcache', 'Default', 'Network', 'Cookies'),
      path.join(base, 'Steam', 'config', 'htmlcache', 'Default', 'Cookies'),
      'C:\\Program Files (x86)\\Steam\\htmlcache\\Default\\Network\\Cookies',
      'C:\\Program Files (x86)\\Steam\\htmlcache\\Default\\Cookies'
    ]
    const found = candidates.find((p) => fs.existsSync(p))
    if (!found)
      throw new Error('Steam cookie database not found — is Steam installed and logged in?')
    return found
  }

  if (process.platform === 'linux') {
    const base = path.join(
      os.homedir(),
      '.local',
      'share',
      'Steam',
      'config',
      'htmlcache',
      'Default'
    )
    const candidates = [path.join(base, 'Cookies'), path.join(base, 'Network', 'Cookies')]
    const found = candidates.find((p) => fs.existsSync(p))
    if (!found)
      throw new Error('Steam cookie database not found — is Steam installed and logged in?')
    return found
  }

  throw new Error(`Unsupported platform: ${process.platform}`)
}

// Windows: DPAPI via PowerShell + AES-256-GCM decryption
function decryptDpapi(data: Buffer): Buffer {
  // Pass data as base64 into PowerShell to avoid binary shell escaping issues
  const b64 = data.toString('base64')
  const script = [
    'Add-Type -AssemblyName System.Security',
    `$bytes = [Convert]::FromBase64String('${b64}')`,
    '$dec = [System.Security.Cryptography.ProtectedData]::Unprotect($bytes, $null, [System.Security.Cryptography.DataProtectionScope]::CurrentUser)',
    '[Convert]::ToBase64String($dec)'
  ].join('; ')

  const result = spawnSync('powershell', ['-NoProfile', '-NonInteractive', '-Command', script], {
    encoding: 'utf8',
    timeout: 10_000
  })

  if (result.status !== 0) {
    throw new Error(`DPAPI decryption failed: ${result.stderr?.trim()}`)
  }

  return Buffer.from(result.stdout.trim(), 'base64')
}

function getWindowsAesKey(): Buffer {
  const base = process.env['LOCALAPPDATA'] ?? path.join(os.homedir(), 'AppData', 'Local')
  const localStatePath = path.join(base, 'Steam', 'htmlcache', 'Local State')

  const json = JSON.parse(fs.readFileSync(localStatePath, 'utf8'))
  const encryptedKeyB64: string = json?.os_crypt?.encrypted_key
  if (!encryptedKeyB64) throw new Error('No os_crypt.encrypted_key in Steam Local State')

  const encryptedKey = Buffer.from(encryptedKeyB64, 'base64')
  if (!encryptedKey.subarray(0, 5).equals(Buffer.from('DPAPI'))) {
    throw new Error('encrypted_key does not start with DPAPI prefix')
  }

  return decryptDpapi(encryptedKey.subarray(5))
}

function decryptCookieWindows(encrypted: Buffer, aesKey: Buffer): string {
  if (encrypted.length < 3) throw new Error('Encrypted cookie value too short')

  const prefix = encrypted.subarray(0, 3).toString('ascii')

  // Legacy DPAPI-encrypted cookie (no v10/v11 prefix)
  if (prefix !== 'v10' && prefix !== 'v11') {
    return decryptDpapi(encrypted).toString('utf8')
  }

  // Modern: AES-256-GCM — 3 byte prefix + 12 byte nonce + ciphertext + 16 byte auth tag
  const rest = encrypted.subarray(3)
  if (rest.length < 12 + 16) throw new Error('Cookie too short for AES-GCM')

  const nonce = rest.subarray(0, 12)
  const tag = rest.subarray(rest.length - 16)
  const ciphertext = rest.subarray(12, rest.length - 16)

  const decipher = crypto.createDecipheriv('aes-256-gcm', aesKey, nonce)
  decipher.setAuthTag(tag)

  return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString('utf8')
}

// Linux: AES-128-CBC decryption via keyring
function getLinuxKeyringPassword(): Buffer {
  const lookups = [
    ['application', 'chrome'],
    ['application', 'chromium'],
    ['application', 'Steam']
  ]

  for (const [key, val] of lookups) {
    try {
      const result = spawnSync('secret-tool', ['lookup', key, val], {
        encoding: 'utf8',
        timeout: 5_000
      })
      if (result.status === 0 && result.stdout.trim()) {
        return Buffer.from(result.stdout.trim(), 'utf8')
      }
    } catch {
      // secret-tool not installed or entry not found — try next lookup
    }
  }

  // Chromium's known fallback when no keyring entry exists
  return Buffer.from('peanuts', 'utf8')
}

function decryptCookieLinux(encrypted: Buffer): string {
  if (encrypted.length < 3) throw new Error('Encrypted cookie value too short')

  const prefix = encrypted.subarray(0, 3).toString('ascii')

  // Unencrypted plain-text
  if (prefix !== 'v10' && prefix !== 'v11') {
    return encrypted.toString('utf8')
  }

  const ciphertext = encrypted.subarray(3)
  const iv = Buffer.alloc(16, ' ') // Chromium uses 0x20 * 16

  const passwords = [getLinuxKeyringPassword(), Buffer.from('peanuts'), Buffer.alloc(0)]

  for (const pw of passwords) {
    try {
      // PBKDF2-SHA1, 1 iteration, 16-byte key — Chromium's derivation on Linux
      const key = crypto.pbkdf2Sync(pw, 'saltysalt', 1, 16, 'sha1')
      const decipher = crypto.createDecipheriv('aes-128-cbc', key, iv)
      decipher.setAutoPadding(true)
      const decrypted = Buffer.concat([decipher.update(ciphertext), decipher.final()])
      return decrypted.toString('utf8')
    } catch {
      // Wrong key — try next
    }
  }

  throw new Error('All AES decryption attempts failed for cookie')
}

// Cookie reading
function readCookies(dbPath: string): SteamCookies {
  // We copy the DB to a temp file to avoid any leftover lock state
  const tmpPath = path.join(os.tmpdir(), 'apsys_cookies_tmp.db')

  try {
    fs.copyFileSync(dbPath, tmpPath)

    // Copy WAL and SHM if they exist — needed for a consistent read
    for (const suffix of ['-wal', '-shm']) {
      const src = dbPath + suffix
      if (fs.existsSync(src)) fs.copyFileSync(src, tmpPath + suffix)
    }

    const db = new Database(tmpPath, { readonly: true, fileMustExist: true })

    const rows = db
      .prepare(
        `SELECT name, value, encrypted_value FROM cookies
         WHERE host_key LIKE '%steamcommunity.com'
         AND name IN ('sessionid', 'steamLoginSecure')`
      )
      .all() as Array<{ name: string; value: string; encrypted_value: Buffer }>

    db.close()

    // Windows needs the AES key once for all cookies
    const aesKey = process.platform === 'win32' ? getWindowsAesKey() : null

    let sessionId: string | undefined
    let loginSecure: string | undefined

    for (const row of rows) {
      let resolved: string

      if (row.value) {
        resolved = row.value
      } else if (row.encrypted_value?.length) {
        resolved =
          process.platform === 'win32'
            ? decryptCookieWindows(row.encrypted_value, aesKey!)
            : decryptCookieLinux(row.encrypted_value)
      } else {
        continue
      }

      if (row.name === 'sessionid') sessionId = resolved
      if (row.name === 'steamLoginSecure') loginSecure = resolved
    }

    if (!sessionId) throw new Error('sessionid cookie not found — are you logged into Steam?')
    if (!loginSecure)
      throw new Error('steamLoginSecure cookie not found — are you logged into Steam?')

    return { sessionId, loginSecure }
  } finally {
    // Always clean up temp files
    for (const suffix of ['', '-wal', '-shm']) {
      try {
        fs.unlinkSync(tmpPath + suffix)
      } catch {
        // Temp file already gone or never created — safe to ignore
      }
    }
  }
}

/**
 * Reads Steam session cookies.
 */
export function getSteamCookies(): SteamCookies {
  // Try cache first
  const cached = loadCookieCache()
  if (cached) return cached

  const dbPath = getCookieDbPath()

  // Try direct read
  try {
    const cookies = readCookies(dbPath)
    saveCookieCache(cookies)
    return cookies
  } catch {
    // DB locked
  }

  if (isSteamRunning()) {
    throw new Error('STEAM_RUNNING')
  }

  throw new Error('Failed to read Steam cookies — try restarting Steam')
}

function getCachePath(): string {
  return path.join(app.getPath('userData'), 'cookies.enc')
}

function saveCookieCache(cookies: SteamCookies): void {
  if (!safeStorage.isEncryptionAvailable()) return
  try {
    const json = JSON.stringify(cookies)
    const encrypted = safeStorage.encryptString(json)
    fs.writeFileSync(getCachePath(), encrypted)
  } catch {
    // Cache write failed — non-fatal, we'll just re-read next time
  }
}

function loadCookieCache(): SteamCookies | null {
  if (!safeStorage.isEncryptionAvailable()) return null
  try {
    const encrypted = fs.readFileSync(getCachePath())
    const json = safeStorage.decryptString(encrypted)
    return JSON.parse(json) as SteamCookies
  } catch {
    // Cache missing or corrupt — treat as cold start
    return null
  }
}

export function clearCookieCache(): void {
  try {
    fs.unlinkSync(getCachePath())
  } catch {
    /* already gone */
  }
}
