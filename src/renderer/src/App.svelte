<script lang="ts">
  import type { Game, GameIntegrationInfo, Mod, Page, Playset } from '../../shared/types'
  import Titlebar from './components/Titlebar.svelte'
  import Sidebar from './components/Sidebar.svelte'
  import { onDestroy, onMount } from 'svelte'
  import LargeLoadingScreen from './components/LargeLoadingScreen.svelte'
  import ModList from './components/ModList.svelte'
  import PlaysetList from './components/PlaysetList.svelte'
  import { SvelteMap, SvelteSet } from 'svelte/reactivity'
  import { fade } from 'svelte/transition'
  import Topbar from './components/Topbar.svelte'
  import BottomBar from './components/BottomBar.svelte'
  import CreatePlaysetModal from './components/CreatePlaysetModal.svelte'
  import ImportPlaysetModal from './components/ImportPlaysetModal.svelte'
  import UpdateModal from './components/UpdateModal.svelte'
  import FooterBar from './components/FooterBar.svelte'
  import AddToPlaysetModal from './components/AddToPlaysetModal.svelte'

  let gamesLoading = $state<boolean>(true)
  let compact = $state<boolean>(false)
  let status = $state<string | null>(null)
  let games = $state<Game[]>([])
  let gameIntegrationInfo = $state<GameIntegrationInfo | null>(null)
  let gameBg = $state<string | null>(null)
  let selectedGame = $state<Game | null>(null)
  let selectedModIds = new SvelteSet<number>()
  let mods = $state<Mod[]>([])
  let modsLoading = $state(false)
  let modListAllSelected = $state(false)
  let modListSomeSelected = $state(false)
  let modsCache = new SvelteMap<number, Mod[]>()

  let steamRunning = $state(false)
  let cookiesRetryInterval: ReturnType<typeof setInterval> | null = null
  let restarting = $state(false)

  //let cookies = $state<SteamCookies | null>(null)
  let cookiesLoading = $state(false)

  let currentPage = $state<Page>('mods')

  // Playset state
  let playsets = $state<Playset[]>([])
  let playsetsLoading = $state(false)
  let selectedPlaysetIds = new SvelteSet<string>()
  let playsetAllSelected = $state(false)
  let playsetSomeSelected = $state(false)
  let playsetSelectedCount = $state(0)
  let playsetSelectAll = $state<() => void>(() => {})
  let playsetDeselectAll = $state<() => void>(() => {})
  let playsetDeleteSelected = $state<() => Promise<void>>(async () => {})
  let showNewPlaysetModal = $state(false)
  let showImportPlaysetModal = $state(false)

  let showAddToPlaysetModal = $state(false)
  let addToPlaylist = $state<() => void>(() => {
    showAddToPlaysetModal = true
  })

  let searchQuery = $state('')
  let sortOrder = $state<'default' | 'name-asc' | 'name-desc' | 'size-desc' | 'size-asc'>('default')
  let playsetSortOrder = $state<
    'default' | 'name-asc' | 'name-desc' | 'mod-count-desc' | 'mod-count-asc'
  >('default')
  let modListSelectedCount = $state(0)
  let modListRefresh = $state<() => void>(() => refreshMods())
  let toggleCompact = $state<() => void>(() => {
    compact = !compact
  })
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

  // Load integration info, playsets, and import native playsets in the correct order.
  // A cancel flag ensures a stale async chain from a previous selectedGame never
  // overwrites state that belongs to the current selection.
  $effect(() => {
    if (!selectedGame) {
      gameIntegrationInfo = null
      playsets = []
      return
    }
    refreshPlaysets()
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

  async function refreshMods(): Promise<void> {
    if (!selectedGame) return
    modsLoading = true
    try {
      const game = $state.snapshot(selectedGame) as Game
      const freshMods = await window.steamAPI.getModsForGameLocal(game)
      const enriched = await window.steamAPI.enrichMods(freshMods)
      const enrichedMods = freshMods.map((m) => ({
        ...m,
        name: enriched[m.itemId]?.name ?? m.name,
        previewUrl: enriched[m.itemId]?.previewUrl ?? null
      }))
      modsCache.set(selectedGame.appId, enrichedMods)
      mods = enrichedMods
    } catch (e) {
      status = e instanceof Error ? e.message : String(e)
    } finally {
      modsLoading = false
    }
  }

  async function loadPlaysets(): Promise<void> {
    if (!selectedGame) {
      return
    }
    playsetsLoading = true
    try {
      playsets = await window.steamAPI.getPlaysets(selectedGame.appId)
    } catch (e) {
      status = e instanceof Error ? e.message : String(e)
    } finally {
      playsetsLoading = false
    }
  }

  async function refreshPlaysets(): Promise<void> {
    const game = selectedGame
    let cancelled = false

    ;(async () => {
      console.log('[playsets] effect fired — game:', game.appId, game.name)

      const [info] = await Promise.all([
        window.steamAPI.getGameIntegrationInfo(game.appId),
        loadPlaysets()
      ])

      console.log(
        '[playsets] initial load done — playsets:',
        playsets.length,
        '| integrationInfo:',
        info
      )
      if (cancelled) {
        console.log('[playsets] cancelled after initial load')
        return
      }
      gameIntegrationInfo = info

      const imported = await importNativePlaysets(info)
      console.log('[playsets] importNativePlaysets returned:', imported)
      if (imported && !cancelled) {
        console.log('[playsets] reloading after native import…')
        await loadPlaysets()
        console.log('[playsets] after reload — playsets:', playsets.length)
      }
    })().catch((e) => {
      console.error('[playsets] unhandled error in effect chain:', e)
      if (!cancelled) status = e instanceof Error ? e.message : String(e)
    })
  }

  // Reset search when switching pages
  $effect(() => {
    // eslint-disable-next-line @typescript-eslint/no-unused-expressions
    currentPage
    searchQuery = ''
  })

  async function loadCookies(): Promise<void> {
    cookiesLoading = true
    try {
      status = 'Loading Cookies'
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
      steamRunning = false
      status = 'Starting Steam'
      await window.steamAPI.startSteam()
    } catch (e) {
      status = e instanceof Error ? e.message : String(e)
    } finally {
      restarting = false
    }
  }

  /**
   * Import any native game playsets that don't yet exist as custom playsets.
   * Returns true when new playsets were created (caller should reload), false otherwise.
   *
   * Mods are snapshotted at call time so the modMap is never stale even if the
   * reactive `mods` array updates while we are awaiting IPC calls.
   */
  async function importNativePlaysets(info: GameIntegrationInfo | null): Promise<boolean> {
    console.log('[playsets] importNativePlaysets — info:', info)
    if (!selectedGame) {
      console.log('[playsets] skipping — no selectedGame')
      return false
    }
    if (!info?.canSync) {
      console.log('[playsets] skipping — canSync is false/null')
      return false
    }

    console.log('[playsets] fetching getGamePlaysets + getPlaysets…')
    const [native, existing] = await Promise.all([
      window.steamAPI.getGamePlaysets($state.snapshot(selectedGame) as Game),
      window.steamAPI.getPlaysets(selectedGame.appId)
    ])
    console.log(
      '[playsets] native playsets:',
      native.map((n) => n.name),
      '| existing:',
      existing.map((p) => p.name)
    )

    const existingNames = new Set(existing.map((p) => p.name))
    const currentMods = $state.snapshot(mods) as Mod[]
    console.log('[playsets] mods snapshot size:', currentMods.length)
    const modMap = new Map(currentMods.map((m) => [m.itemId, m]))

    const toImport = native.filter((n) => !existingNames.has(n.name))
    console.log(
      '[playsets] toImport:',
      toImport.map((n) => n.name)
    )
    if (toImport.length === 0) {
      console.log('[playsets] nothing new to import')
      return false
    }

    await Promise.all(
      toImport.map((n) => {
        const resolvedMods = n.modIds.flatMap((id) => {
          const mod = modMap.get(id)
          return mod ? [mod] : []
        })
        console.log(
          '[playsets] creating playset:',
          n.name,
          '— resolved',
          resolvedMods.length,
          '/',
          n.modIds.length,
          'mods'
        )
        return window.steamAPI.createPlayset(n.name, selectedGame!.appId, resolvedMods)
      })
    )

    console.log('[playsets] all playsets created successfully')
    return true
  }

  async function createPlayset(name: string): Promise<void> {
    if (!selectedGame) return
    await window.steamAPI.createPlayset(name, selectedGame.appId, [])
    if (gameIntegrationInfo?.canSync) {
      try {
        await window.steamAPI.syncPlaysetToGame($state.snapshot(selectedGame) as Game, name, [])
      } catch (e) {
        console.error('[playset] auto-sync after create failed:', e)
      }
    }
    await loadPlaysets()
  }

  async function importPlayset(name: string, mods: Mod[]): Promise<void> {
    if (!selectedGame) return
    await window.steamAPI.createPlayset(name, selectedGame.appId, mods)
    if (gameIntegrationInfo?.canSync) {
      try {
        await window.steamAPI.syncPlaysetToGame($state.snapshot(selectedGame) as Game, name, mods)
      } catch (e) {
        console.error('[playset] auto-sync after import failed:', e)
      }
    }
    await loadPlaysets()
  }

  async function addSelectedModsToPlayset(playset: Playset): Promise<void> {
    const selected = mods.filter((m) => selectedModIds.has(m.itemId))
    const merged = $state.snapshot([...playset.mods, ...selected]) as Mod[]
    await window.steamAPI.updatePlayset(playset.id, { mods: merged })
    if (gameIntegrationInfo?.canSync && selectedGame) {
      try {
        await window.steamAPI.syncPlaysetToGame(
          $state.snapshot(selectedGame) as Game,
          playset.name,
          merged
        )
      } catch (e) {
        console.error('[playset] auto-sync after add failed:', e)
      }
    }
    await loadPlaysets()
    selectedModIds.clear()
  }

  async function createPlaysetWithMods(name: string): Promise<void> {
    if (!selectedGame) return
    const selected = mods.filter((m) => selectedModIds.has(m.itemId))
    await window.steamAPI.createPlayset(
      name,
      selectedGame.appId,
      $state.snapshot(selected) as Mod[]
    )
    if (gameIntegrationInfo?.canSync) {
      try {
        await window.steamAPI.syncPlaysetToGame(
          $state.snapshot(selectedGame) as Game,
          name,
          $state.snapshot(selected) as Mod[]
        )
      } catch (e) {
        console.error('[playset] auto-sync after create failed:', e)
      }
    }
    await loadPlaysets()
    selectedModIds.clear()
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
  {#key gameBg}
    <div
      class="bg-image"
      style="background-image: url('{gameBg}')"
      transition:fade={{ duration: 600 }}
    ></div>
  {/key}
  <Titlebar bind:currentPage />
  {#if gamesLoading || cookiesLoading || steamRunning}
    <LargeLoadingScreen {status} {steamRunning} {restarting} onrestart={restartSteam} />
  {:else}
    <main>
      <Sidebar {games} bind:selectedGame />
      <div class="content">
        <Topbar
          {currentPage}
          allSelected={currentPage === 'mods' ? modListAllSelected : playsetAllSelected}
          someSelected={currentPage === 'mods' ? modListSomeSelected : playsetSomeSelected}
          {compact}
          {selectedGame}
          selectedCount={currentPage === 'mods' ? modListSelectedCount : playsetSelectedCount}
          totalCount={currentPage === 'mods' ? mods.length : playsets.length}
          loading={currentPage === 'mods' ? modsLoading : playsetsLoading}
          bind:searchQuery
          bind:sortOrder
          onSelectAll={currentPage === 'mods' ? modListSelectAll : playsetSelectAll}
          onDeselectAll={currentPage === 'mods' ? modListDeselectAll : playsetDeselectAll}
          onRefresh={currentPage === 'mods' ? modListRefresh : refreshPlaysets}
          onToggleCompact={toggleCompact}
          onCreatePlayset={() => (showNewPlaysetModal = true)}
          onImportPlayset={() => (showImportPlaysetModal = true)}
        />
        <div class="page-content">
          {#if currentPage === 'mods'}
            <ModList
              bind:allSelected={modListAllSelected}
              bind:someSelected={modListSomeSelected}
              {compact}
              selectedIds={selectedModIds}
              {selectedGame}
              {mods}
              {searchQuery}
              {sortOrder}
              loading={modsLoading}
              bind:selectedCount={modListSelectedCount}
              bind:refresh={modListRefresh}
              bind:selectAll={modListSelectAll}
              bind:deselectAll={modListDeselectAll}
              bind:redownloadSelected={modListRedownload}
              bind:unsubscribeSelected={modListUnsubscribe}
            />
          {:else if currentPage === 'playsets'}
            <PlaysetList
              bind:allSelected={playsetAllSelected}
              bind:someSelected={playsetSomeSelected}
              selectedIds={selectedPlaysetIds}
              {selectedGame}
              {playsets}
              availableMods={mods}
              {searchQuery}
              sortOrder={playsetSortOrder}
              loading={playsetsLoading}
              {gameIntegrationInfo}
              bind:selectedCount={playsetSelectedCount}
              onRefresh={loadPlaysets}
              bind:selectAll={playsetSelectAll}
              bind:deselectAll={playsetDeselectAll}
              bind:deleteSelected={playsetDeleteSelected}
              onPlaysetSync={async (playset: Playset) => {
                if (!selectedGame) return
                await window.steamAPI.syncPlaysetToGame(
                  $state.snapshot(selectedGame) as Game,
                  playset.name,
                  $state.snapshot(playset.mods) as Mod[]
                )
              }}
            />
          {/if}
        </div>
        <BottomBar
          {currentPage}
          selectedCount={currentPage === 'mods' ? modListSelectedCount : playsetSelectedCount}
          onRedownload={currentPage === 'mods' ? modListRedownload : undefined}
          onUnsubscribe={currentPage === 'mods' ? modListUnsubscribe : undefined}
          onAddToPlaylist={currentPage === 'mods' ? addToPlaylist : undefined}
          onDelete={currentPage === 'playsets' ? playsetDeleteSelected : undefined}
        />
      </div>
    </main>
    <CreatePlaysetModal
      open={showNewPlaysetModal}
      appId={selectedGame?.appId ?? 0}
      oncreate={createPlayset}
      onclose={() => (showNewPlaysetModal = false)}
    />
    <ImportPlaysetModal
      open={showImportPlaysetModal}
      appId={selectedGame?.appId ?? 0}
      availableMods={mods}
      oncreate={importPlayset}
      onclose={() => (showImportPlaysetModal = false)}
    />
    <UpdateModal />
    <AddToPlaysetModal
      open={showAddToPlaysetModal}
      {playsets}
      selectedMods={mods.filter((m) => selectedModIds.has(m.itemId))}
      onadd={addSelectedModsToPlayset}
      oncreate={createPlaysetWithMods}
      onclose={() => (showAddToPlaysetModal = false)}
    />
  {/if}
  <FooterBar />
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
    background-image: inherit;
    background-repeat: no-repeat;
    background-position: center;
    background-size: cover;
    opacity: 0.3;
    -webkit-mask-image: linear-gradient(to bottom, black 0%, transparent 50%);
    mask-image: linear-gradient(to bottom, black 0%, transparent 50%);
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
    min-width: 0;
  }

  .page-content {
    flex: 1;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    min-height: 0;
  }
</style>
