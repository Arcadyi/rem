// Europa Universalis V (appId 3450310)
//
// The Paradox launcher stores multiple named playsets in playsets.json.
// Mod paths contain the Steam itemId as the last path segment — no sidecar.
import * as fs from 'node:fs'
import { atomicWrite, GameIntegration } from '../gameIntegrations'
import path from 'node:path'
import * as os from 'node:os'

interface Eu5Mod {
  path: string
  isEnabled: boolean
}

interface Eu5Playset {
  name: string
  isActive?: boolean
  isAutomaticallySorted: boolean
  orderedListMods: Eu5Mod[]
  DLC?: { paradoxAppId: string; isEnabled: boolean }[]
}

interface Eu5PlaysetFile {
  file_version: string
  playsets: Eu5Playset[]
}

function eu5ExtractItemId(modPath: string): number | null {
  const segments = modPath.replace(/\\/g, '/').split('/').filter(Boolean)
  const id = parseInt(segments[segments.length - 1], 10)
  return isNaN(id) ? null : id
}

export const eu5Integration: GameIntegration = {
  appId: 3450310,
  gameName: 'Europa Universalis V',
  description: 'Reads and writes named playsets in the Paradox launcher playsets.json.',
  canSync: true,

  findConfigPath() {
    const base = 'Paradox Interactive'
    const game = 'Europa Universalis V'
    const file = 'playsets.json'
    const candidates: string[] = []

    if (process.platform === 'win32') {
      candidates.push(path.join(process.env['APPDATA'] ?? '', base, game, file))
    } else if (process.platform === 'linux') {
      candidates.push(
        path.join(os.homedir(), '.local', 'share', base, game, file),
        path.join(
          os.homedir(),
          '.local',
          'share',
          'Steam',
          'steamapps',
          'compatdata',
          '3450310',
          'pfx',
          'drive_c',
          'users',
          'steamuser',
          'Documents',
          base,
          game,
          file
        ),
        path.join(
          os.homedir(),
          '.steam',
          'steam',
          'steamapps',
          'compatdata',
          '3450310',
          'pfx',
          'drive_c',
          'users',
          'steamuser',
          'Documents',
          base,
          game,
          file
        )
      )
    } else if (process.platform === 'darwin') {
      candidates.push(path.join(os.homedir(), 'Library', 'Application Support', base, game, file))
    }

    return candidates.find((p) => fs.existsSync(p)) ?? null
  },

  async readPlaysets(configPath) {
    const file = JSON.parse(fs.readFileSync(configPath, 'utf8')) as Eu5PlaysetFile

    return file.playsets.map((p) => ({
      name: p.name,
      isActive: p.isActive ?? false,
      modIds: p.orderedListMods.flatMap((m) => {
        const id = eu5ExtractItemId(m.path)
        return id !== null ? [id] : []
      })
    }))
  },

  async writePlayset(configPath, playsetName, mods) {
    const file = JSON.parse(fs.readFileSync(configPath, 'utf8')) as Eu5PlaysetFile

    const existingPaths = new Map<number, string>()
    let workshopBasePath: string | null = null

    for (const p of file.playsets) {
      for (const mod of p.orderedListMods) {
        const id = eu5ExtractItemId(mod.path)
        if (id !== null) {
          if (!existingPaths.has(id)) {
            existingPaths.set(id, mod.path)
          }

          if (!workshopBasePath) {
            const idStr = id.toString()
            const idIndex = mod.path.lastIndexOf(idStr)
            if (idIndex !== -1) {
              workshopBasePath = mod.path.substring(0, idIndex)
            }
          }
        }
      }
    }

    const orderedListMods: Eu5Mod[] = mods.map((m) => {
      let finalPath = existingPaths.get(m.itemId)

      if (!finalPath) {
        if (workshopBasePath && m.path.includes('workshop')) {
          finalPath = `${workshopBasePath}${m.itemId}/`
        } else {
          finalPath = m.path.replace(/\\/g, '/').replace(/\/?$/, '/')
        }
      }

      return {
        path: finalPath,
        isEnabled: true
      }
    })

    const existingIndex = file.playsets.findIndex((p) => p.name === playsetName)

    if (existingIndex >= 0) {
      file.playsets[existingIndex] = {
        ...file.playsets[existingIndex],
        orderedListMods
      }
    } else {
      file.playsets.push({
        name: playsetName,
        isAutomaticallySorted: false,
        orderedListMods,
        DLC: []
      })
    }

    atomicWrite(configPath, JSON.stringify(file, null, '\t'))
  },

  async deletePlaysetConfig(configPath, playsetName) {
    const file = JSON.parse(fs.readFileSync(configPath, 'utf8')) as Eu5PlaysetFile

    // Filter out the playset by name
    file.playsets = file.playsets.filter((p) => p.name !== playsetName)

    atomicWrite(configPath, JSON.stringify(file, null, '\t'))
  }
}
