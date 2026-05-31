<script lang="ts">
  import type { Game, Mod, SteamCookies } from '../../shared/types'
  import Titlebar from './components/Titlebar.svelte'
  import Sidebar from './components/Sidebar.svelte'
  import { onMount } from 'svelte'
  import LargeLoadingScreen from './components/LargeLoadingScreen.svelte'

  let gamesLoading = $state<boolean>(true)
  let status = $state<string | null>(null)
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
      status = 'Loading Games'
      games = await window.steamAPI.getInstalledGames()
    } catch (e) {
      status = e instanceof Error ? e.message : String(e)
    } finally {
      gamesLoading = false
      status = null
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
      status = 'Loading Cookies'
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
        status = msg
      }
    } finally {
      cookiesLoading = false
    }
  }

  async function restartSteam(): Promise<void> {
    restarting = true
    try {
      status = 'Shutting Down Steam'
      await window.steamAPI.shutdownSteam()
      cookies = await window.steamAPI.getSteamCookies()
      steamRunning = false
      status = 'Starting Steam'
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
  {#if gamesLoading || cookiesLoading || steamRunning}
    <LargeLoadingScreen {status} {steamRunning} {restarting} onrestart={restartSteam} />
  {:else}
    <main>
      <Sidebar {games} bind:selectedGame />
      <div class="content"></div>
    </main>
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
    background: var(--bg-transparent);
    backdrop-filter: var(--bg-blur);
    -webkit-backdrop-filter: var(--bg-blur);
    position: relative;
    z-index: 1;

    @supports not (backdrop-filter: blur(1px)) {
      background: rgba(20, 20, 20, 0.92);
    }
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

  .content {
    flex: 1;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    gap: var(--spacing-xs);
    min-width: 0; /* prevents flex blowout */
  }
</style>
