<script lang="ts">
  import type { Game, Mod } from '../../../shared/types'
  import ModCard from './ModCard.svelte'
  import Loader from './Loader.svelte'
  import { SvelteSet } from 'svelte/reactivity'

  type SortOrder = 'default' | 'name-asc' | 'name-desc' | 'size-desc' | 'size-asc'

  let {
    selectedGame,
    mods,
    searchQuery = '',
    sortOrder = 'default',
    selectedCount = $bindable(0),
    allSelected = $bindable(false),
    someSelected = $bindable(false),
    loading = false,
    compact = $bindable(false),
    selectedIds = $bindable(SvelteSet<number>),
    refresh = $bindable<() => void>(() => {}),
    selectAll = $bindable<() => void>(() => {}),
    deselectAll = $bindable<() => void>(() => {}),
    redownloadSelected = $bindable<() => Promise<void>>(async () => {}),
    unsubscribeSelected = $bindable<() => Promise<void>>(async () => {})
  } = $props<{
    selectedGame: Game | null
    mods: Mod[]
    searchQuery?: string
    sortOrder?: SortOrder
    selectedCount?: number
    allSelected?: boolean
    someSelected?: boolean
    loading?: boolean
    compact?: boolean
    selectedIds?: SvelteSet<number>
    refresh?: () => void
    selectAll?: () => void
    deselectAll?: () => void
    redownloadSelected?: () => Promise<void>
    unsubscribeSelected?: () => Promise<void>
  }>()

  // Keep selectedCount in sync
  $effect(() => {
    selectedCount = selectedIds.size
  })

  // Reset selection when game changes
  $effect(() => {
    if (selectedGame) selectedIds.clear()
  })

  const filteredMods = $derived.by(() => {
    // Always produce a plain array copy so sort never mutates the reactive source
    const base: Mod[] = searchQuery.trim()
      ? mods.filter((m: { name: string }) =>
          m.name.toLowerCase().includes(searchQuery.trim().toLowerCase())
        )
      : [...mods]

    if (sortOrder === 'default') return base

    return base.sort((a, b) => {
      switch (sortOrder) {
        case 'name-asc':
          return a.name.localeCompare(b.name)
        case 'name-desc':
          return b.name.localeCompare(a.name)
        case 'size-desc':
          return b.sizeBytes - a.sizeBytes
        case 'size-asc':
          return a.sizeBytes - b.sizeBytes
        default:
          return 0
      }
    })
  })

  function toggleMod(id: number): void {
    if (selectedIds.has(id)) selectedIds.delete(id)
    else selectedIds.add(id)
  }

  const _allSelected = $derived(
    filteredMods.length > 0 &&
      filteredMods.every((m: { itemId: number }) => selectedIds.has(m.itemId))
  )
  const _someSelected = $derived(
    filteredMods.some((m: { itemId: number }) => selectedIds.has(m.itemId)) && !_allSelected
  )

  $effect(() => {
    allSelected = _allSelected
  })
  $effect(() => {
    someSelected = _someSelected
  })

  selectAll = () => {
    filteredMods.forEach((m: { itemId: number }) => selectedIds.add(m.itemId))
  }

  deselectAll = () => {
    selectedIds.clear()
  }

  redownloadSelected = async () => {
    if (!selectedGame) return
    const selectedMods = filteredMods.filter((m: { itemId: number }) => selectedIds.has(m.itemId))
    await window.steamAPI.redownloadMods($state.snapshot(selectedMods) as Mod[], selectedGame.appId)
    selectedIds.clear()
  }

  unsubscribeSelected = async () => {
    if (!selectedGame) return
    const selectedMods = filteredMods.filter((m: { itemId: number }) => selectedIds.has(m.itemId))
    await window.steamAPI.unsubscribeMods(
      $state.snapshot(selectedMods) as Mod[],
      selectedGame.appId
    )
    selectedIds.clear()
  }
</script>

<div class="mod-list" class:compact>
  {#if !selectedGame}
    <div class="empty">Select a game</div>
  {:else if loading}
    <div class="loader-container">
      <Loader />
    </div>
  {:else if filteredMods.length === 0 && searchQuery}
    <div class="empty">No mods match "{searchQuery}"</div>
  {:else if filteredMods.length === 0}
    <div class="empty">No mods installed</div>
  {:else}
    {#each filteredMods as mod (mod.itemId)}
      <ModCard
        {mod}
        selected={selectedIds.has(mod.itemId)}
        {compact}
        onselect={() => toggleMod(mod.itemId)}
        onredownload={() =>
          window.steamAPI
            .redownloadMods([$state.snapshot(mod) as Mod], selectedGame!.appId)
            .then(() => refresh())}
        onunsubscribe={() =>
          window.steamAPI
            .unsubscribeMods([$state.snapshot(mod) as Mod], selectedGame!.appId)
            .then(() => refresh())}
      />
    {/each}
  {/if}
</div>

<style>
  .mod-list {
    flex: 1;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    scrollbar-width: thin;
    scrollbar-color: var(--border-light) transparent;
    gap: var(--spacing-xxs);
    border-radius: var(--radius-xs);
    border-top: 1px solid var(--border-light);
    border-bottom: 1px solid var(--border-light);
    padding: var(--spacing-xxs);
  }
  .mod-list::-webkit-scrollbar {
    width: 4px;
  }
  .mod-list::-webkit-scrollbar-track {
    background: transparent;
  }
  .mod-list::-webkit-scrollbar-thumb {
    background: var(--border-light);
    border-radius: var(--radius-xs);
  }
  .mod-list::-webkit-scrollbar-thumb:hover {
    background: var(--surface);
  }

  .empty {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--surface-muted);
    font-size: var(--font-size-header);
  }
  .loader-container {
    flex: 1;
    display: flex;
    align-items: center;
    flex-direction: column;
    justify-content: center;
    font-family: 'Open Sans', sans-serif;
  }
</style>
