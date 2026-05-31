<script lang="ts">
  import type { Game, Mod } from '../../shared/types'
  import Titlebar from './components/Titlebar.svelte'
  import Sidebar from './components/Sidebar.svelte'
  import { onMount } from 'svelte'

  let gamesLoading = $state<boolean>(true)
  let error = $state<string | null>(null)
  let { games = $bindable<Game[]>([]), selectedGame = $bindable<Game | null>(null) } = $props<{
    games?: Game[]
    selectedGame?: Game | null
  }>()
  let mods = $state<Mod[]>([])
  let modsLoading = $state(false)
  let modsError = $state<string | null>(null)

  async function loadGames(): Promise<void> {
    gamesLoading = true
    try {
      games = await window.steamAPI.getInstalledGames()
    } catch (e) {
      error = e instanceof Error ? e.message : String(e)
    } finally {
      gamesLoading = false
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

  onMount(() => {
    loadGames()
  })
</script>

<div class="app">
  <Titlebar />
  {#if !gamesLoading}
    <main>
      <Sidebar bind:games bind:selectedGame />
      <div class="content"></div>
    </main>
  {:else}
    <div class="main-loading-screen">
      <span>Fetching Steam Metadata</span>
    </div>
  {/if}
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
    font-family:
      Open Sans,
      sans-serif;
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
    min-width: 0; /* prevents flex blowout */
  }
</style>
