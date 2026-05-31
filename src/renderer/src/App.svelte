<script lang="ts">
  import type { Game, Mod, SteamCookies } from '../../shared/types'
  import Titlebar from './components/Titlebar.svelte'
  import Sidebar from './components/Sidebar.svelte'
  import { onDestroy, onMount } from 'svelte'
  import LargeLoadingScreen from './components/LargeLoadingScreen.svelte'
  import ModList from './components/ModList.svelte'
  import { SvelteMap } from 'svelte/reactivity'
  import { fade } from 'svelte/transition'
  import Topbar from './components/Topbar.svelte'
  import BottomBar from './components/BottomBar.svelte'

  let gamesLoading = $state<boolean>(true)
  let status = $state<string | null>(null)
  let games = $state<Game[]>([])
  let gameBg = $state<string | null>(null)
  let selectedGame = $state<Game | null>(null)
  let mods = $state<Mod[]>([])
  let modsLoading = $state(false)
  let modListAllSelected = $state(false)
  let modListSomeSelected = $state(false)
  let modsCache = new SvelteMap<number, Mod[]>()

  let steamRunning = $state(false)
  let cookiesRetryInterval: ReturnType<typeof setInterval> | null = null
  let restarting = $state(false)

  let cookies = $state<SteamCookies | null>(null)
  let cookiesLoading = $state(false)

  let searchQuery = $state('')
  let modListSelectedCount = $state(0)
  let modListRefresh = $state<() => void>(() => {})
  let modListSelectAll = $state<() => void>(() => {})
  let modListDeselectAll = $state<() => void>(() => {})
  let modListRedownload = $state<() => Promise<void>>(async () => {})
  let modListUnsubscribe = $state<() => Promise<void>>(async () => {})

  async function loadGames(): Promise<Game[]> {
    gamesLoading = true
    try {
      status = 'Loading Games'
      games = await window.steamAPI.getInstalledGames()
      return games
    } catch (e) {
      status = e instanceof Error ? e.message : String(e)
      return []
    } finally {
      gamesLoading = false
      status = null
    }
  }

  $effect(() => {
    if (selectedGame) {
      mods = modsCache.get(selectedGame.appId) ?? []
      window.steamAPI.getGameImages(selectedGame.appId).then((images) => {
        gameBg = images.hero
      })
    }
  })

  async function preloadAllMods(games: Game[]): Promise<void> {
    modsLoading = true
    try {
      // Load all local mods in parallel
      const results = await Promise.all(
        games.map(async (game) => ({
          appId: game.appId,
          mods: await window.steamAPI.getModsForGameLocal($state.snapshot(game) as Game)
        }))
      )

      // Populate cache with local data immediately
      const cache = new SvelteMap<number, Mod[]>()
      for (const { appId, mods } of results) cache.set(appId, mods)
      modsCache = cache

      // Show mods for selected game right away
      if (selectedGame) mods = modsCache.get(selectedGame.appId) ?? []
      modsLoading = false

      // Enrich all mods in one batched request
      const allMods = results.flatMap((r) => r.mods)
      const enriched = await window.steamAPI.enrichMods($state.snapshot(allMods) as Mod[])

      // Update cache with enriched data
      const enrichedCache = new SvelteMap<number, Mod[]>()
      for (const { appId, mods } of results) {
        enrichedCache.set(
          appId,
          mods.map((m) => ({
            ...m,
            name: enriched[m.itemId]?.name ?? m.name,
            previewUrl: enriched[m.itemId]?.previewUrl ?? null
          }))
        )
      }
      modsCache = enrichedCache

      // Refresh currently visible mods if a game is selected
      if (selectedGame) mods = modsCache.get(selectedGame.appId) ?? []
    } catch (e) {
      status = e instanceof Error ? e.message : String(e)
    } finally {
      modsLoading = false
    }
  }

  async function loadCookies(): Promise<void> {
    cookiesLoading = true
    try {
      status = 'Loading Cookies'
      cookies = await window.steamAPI.getSteamCookies()
      steamRunning = false
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      if (msg.includes('STEAM_RUNNING')) {
        steamRunning = true
        status = null
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
      status = e instanceof Error ? e.message : String(e)
    } finally {
      restarting = false
    }
  }

  onMount(async () => {
    await loadCookies()
    await loadGames()
    await preloadAllMods(games)
  })

  onDestroy(() => {
    if (cookiesRetryInterval) {
      clearInterval(cookiesRetryInterval)
      cookiesRetryInterval = null
    }
  })
</script>

<div class="app">
  {#if gameBg}
    {#key gameBg}
      <div
        class="bg-image"
        style="background-image: url('{gameBg}')"
        transition:fade={{ duration: 600 }}
      ></div>
    {/key}
  {/if}
  <Titlebar />
  {#if gamesLoading || cookiesLoading || steamRunning}
    <LargeLoadingScreen {status} {steamRunning} {restarting} onrestart={restartSteam} />
  {:else}
    <main>
      <Sidebar {games} bind:selectedGame />
      <div class="content">
        {#if selectedGame}
          <Topbar
            allSelected={modListAllSelected}
            someSelected={modListSomeSelected}
            {selectedGame}
            selectedCount={modListSelectedCount}
            totalCount={mods.length}
            loading={modsLoading}
            bind:searchQuery
            onSelectAll={modListSelectAll}
            onDeselectAll={modListDeselectAll}
            onRefresh={modListRefresh}
          />
          <ModList
            bind:allSelected={modListAllSelected}
            bind:someSelected={modListSomeSelected}
            {selectedGame}
            {mods}
            {searchQuery}
            loading={modsLoading}
            bind:selectedCount={modListSelectedCount}
            bind:refresh={modListRefresh}
            bind:selectAll={modListSelectAll}
            bind:deselectAll={modListDeselectAll}
            bind:redownloadSelected={modListRedownload}
            bind:unsubscribeSelected={modListUnsubscribe}
          />
          <BottomBar
            selectedCount={modListSelectedCount}
            onRedownload={modListRedownload}
            onUnsubscribe={modListUnsubscribe}
          />
        {/if}
      </div>
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
