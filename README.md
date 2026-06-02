# REM — Real Easy Mod Manager

A fast, clean mod manager for Steam games. Built with Electron, Svelte, and a strong opinion that managing mods shouldn't be a chore.

![Platform](https://img.shields.io/badge/platform-Windows%20%7C%20Linux-blue)
![Version](https://img.shields.io/github/v/release/Arcadyi/rem)

---

## Features

### Mod Management
- **Browse installed mods** across all your Steam games in one place
- **Force redownload** stale or corrupt mods — cleans local files, strips ACF entries, and re-subscribes automatically
- **Unsubscribe in bulk** from mods you no longer want
- **Open mod pages** on the Steam Workshop directly from the app
- **Open mod directories** on disk with one click

### Playsets
- **Create and manage playsets** — curated mod collections for any game
- **Drag-and-drop reordering** to control load order
- **Share playsets** via compact share codes (`REM-…`) that encode the full mod list
- **Import playsets** from share codes — missing mods are subscribed and downloaded automatically before the playset is created
- **Add selected mods** to an existing playset or create a new one on the fly
- **Sync playsets** to games that support native mod configurations

---

## Getting Started

### Download

Grab the latest release from the [releases page](https://github.com/Arcadyi/rem/releases).

- **Windows**: run the `.exe` installer
- **Linux**: run the `.AppImage`

### Requirements

- Steam must be installed and you must be logged in
- The games you want to manage must have Workshop support

---

## Development

```bash
# Install dependencies
npm install

# Start in development mode
npm run dev

# Type-check
npm run typecheck

# Build for your platform
npm run build:win
npm run build:linux
npm run build:mac
```

> **Note:** `better-sqlite3` is a native module and must be rebuilt after install or after updating Electron:
> ```bash
> npx electron-rebuild -f -w better-sqlite3
> ```

---

## Tech Stack

- [Electron](https://www.electronjs.org/) — desktop shell
- [Svelte 5](https://svelte.dev/) — UI framework
- [electron-vite](https://electron-vite.org/) — build tooling
- [better-sqlite3](https://github.com/WiseLibs/better-sqlite3) — playset storage
- [electron-updater](https://www.electron.build/auto-update) — auto-updates
