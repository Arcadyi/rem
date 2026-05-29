<script lang="ts">
  import type { Game, Mod } from '../../shared/types'
  import Titlebar from './components/Titlebar.svelte'

  let games: Game[] = []
  let error: string | null = null
  let selectedGame: Game | null = null
  let mods: Mod[] = []
  let modsLoading = false
  let modsError: string | null = null

  async function loadGames(): Promise<void> {
    try {
      games = await window.steamAPI.getInstalledGames()
    } catch (e) {
      error = e instanceof Error ? e.message : String(e)
    }
  }

  async function loadMods(game: Game): Promise<void> {
    selectedGame = game
    mods = []
    modsError = null
    modsLoading = true
    try {
      mods = await window.steamAPI.getModsForGame(game)
    } catch (e) {
      modsError = e instanceof Error ? e.message : String(e)
    } finally {
      modsLoading = false
    }
  }

  loadGames()
</script>

<div class="app">
  <Titlebar />
</div>

<style>
  .app {
    display: flex;
    flex-direction: column;
    width: 100vw;
    height: 100vh;
    margin: 0;
    padding: 0;
    overflow: hidden;
    border-radius: var(--radius-xs);
    background: var(--bg-transparent);
    backdrop-filter: var(--bg-blur);
    -webkit-backdrop-filter: var(--bg-blur);
    position: relative;
    z-index: 1;
  }

  .bg-image {
    position: absolute;
    inset: 0;
    z-index: -1;
    pointer-events: none;
    background-repeat: no-repeat;
    background-position: top center;
    background-size: 100% auto;
    opacity: 0.3;
    -webkit-mask-image: linear-gradient(to bottom, black 0%, transparent 80%);
    mask-image: linear-gradient(to bottom, black 0%, transparent 80%);
  }

  main {
    flex: 1;
    display: flex;
    flex-direction: row;
    overflow: hidden;
    padding: var(--spacing-m);
    gap: var(--spacing-m);
  }

  .main-loading-screen {
    flex: 1;
    display: flex;
    align-items: center;
    flex-direction: column;
    justify-content: center;
    font-family: DM Sans, sans-serif;
    color: var(--surface);
    font-size: var(--font-size-subheader);
    font-weight: var(--font-weight-semibold);
  }

  .content {
    flex: 1;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    gap: var(--spacing-xs);
    min-width: 0;  /* prevents flex blowout */
  }
</style>
