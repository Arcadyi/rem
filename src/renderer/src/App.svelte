<script lang="ts">
  import type { Game, Mod, SteamCookies } from '../../shared/types'
  import Titlebar from './components/Titlebar.svelte'
  import Sidebar from './components/Sidebar.svelte'
  import { onMount } from 'svelte'

  let gamesLoading = $state<boolean>(true)
  let error = $state<string | null>(null)
  let games = $state<Game[]>([])
  let selectedGame = $state<Game | null>(null)
  let mods = $state<Mod[]>([])
  let modsLoading = $state(false)
  let modsError = $state<string | null>(null)


  let steamRunning = $state(false)
  let cookiesRetryInterval: ReturnType<typeof setInterval> | null = null
  let restarting = $state(false)

  let cookies = $state<SteamCookies | null>(null)
  let cookiesLoading = $state(false)
  let cookiesError = $state<string | null>(null)

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

  $effect(() => {
    if (selectedGame) {
      loadMods(selectedGame)
    }
  })

  async function loadMods(game: Game): Promise<void> {
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

  async function loadCookies(): Promise<void> {
    cookiesLoading = true
    cookiesError = null
    try {
      cookies = await window.steamAPI.getSteamCookies()
      steamRunning = false
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      if (msg.includes('STEAM_RUNNING')) {
        steamRunning = true
        // Poll every 3 seconds until the user closes Steam
        cookiesRetryInterval = setInterval(async () => {
          const running = await window.steamAPI.isSteamRunning()
          if (!running) {
            clearInterval(cookiesRetryInterval!)
            cookiesRetryInterval = null
            await loadCookies()
          }
        }, 3000)
      } else {
        cookiesError = msg
      }
    } finally {
      cookiesLoading = false
    }
  }

  async function restartSteam(): Promise<void> {
    restarting = true
    try {
      await window.steamAPI.shutdownSteam()
      cookies = await window.steamAPI.getSteamCookies()
      steamRunning = false
      await window.steamAPI.startSteam()
    } catch (e) {
      cookiesError = e instanceof Error ? e.message : String(e)
    } finally {
      restarting = false
    }
  }

  onMount(async () => {
    await loadGames()
    await loadCookies()
  })
</script>

<div class="app">
  <Titlebar />
  {#if !gamesLoading}
    <main>
      <Sidebar {games} bind:selectedGame />
      <div class="content"></div>
    </main>
  {:else}
    <div class="main-loading-screen">
      <span>Fetching Steam Metadata</span>
    </div>
  {/if}
  <div class="content">
    {#if steamRunning}
      {#if restarting}
        <p style="color: var(--surface)">Closing Steam, please wait...</p>
      {:else}
        <p style="color: var(--surface)">⚠ Please close Steam to continue. Waiting...</p>
        <button onclick={() => restartSteam()}>Restart Steam for me</button>
      {/if}
    {:else if cookiesLoading}
      <p style="color: var(--surface)">Loading cookies...</p>
    {:else if cookiesError}
      <p style="color: red">Cookie error: {cookiesError}</p>
    {:else if cookies}
      <p style="color: green">✓ Cookies loaded</p>
      <p style="color: var(--surface)">Session ID: {cookies.sessionId.slice(0, 8)}...</p>
      <p style="color: var(--surface)">Login token: {cookies.loginSecure.slice(0, 8)}...</p>
    {:else}
      <p style="color: var(--surface)">No cookies</p>
    {/if}
  </div>
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
