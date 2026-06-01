<script lang="ts">
  import type { Game, Playset } from '../../../shared/types'
  import PlaysetCard from './PlaysetCard.svelte'
  import Loader from './Loader.svelte'
  import { SvelteSet } from 'svelte/reactivity'

  type SortOrder = 'default' | 'name-asc' | 'name-desc' | 'mod-count-desc' | 'mod-count-asc'

  let {
    selectedGame,
    playsets,
    searchQuery = '',
    sortOrder = 'default',
    selectedCount = $bindable(0),
    allSelected = $bindable(false),
    someSelected = $bindable(false),
    loading = false,
    selectedIds = $bindable(new SvelteSet<string>()),
    selectAll = $bindable<() => void>(() => {}),
    deselectAll = $bindable<() => void>(() => {}),
    deleteSelected = $bindable<() => Promise<void>>(async () => {}),
    onPlaysetClick = $bindable<(playset: Playset) => void>(() => {})
  } = $props<{
    selectedGame: Game | null
    playsets: Playset[]
    searchQuery?: string
    sortOrder?: SortOrder
    selectedCount?: number
    allSelected?: boolean
    someSelected?: boolean
    loading?: boolean
    selectedIds?: SvelteSet<string>
    selectAll?: () => void
    deselectAll?: () => void
    deleteSelected?: () => Promise<void>
    onPlaysetClick?: (playset: Playset) => void
  }>()

  // Keep selectedCount in sync
  $effect(() => {
    selectedCount = selectedIds.size
  })

  // Reset selection when game changes
  $effect(() => {
    if (selectedGame) selectedIds.clear()
  })

  const filteredPlaysets = $derived.by(() => {
    const base: Playset[] = searchQuery.trim()
      ? playsets.filter((p) => p.name.toLowerCase().includes(searchQuery.trim().toLowerCase()))
      : [...playsets]

    if (sortOrder === 'default') return base

    return base.sort((a, b) => {
      switch (sortOrder) {
        case 'name-asc':
          return a.name.localeCompare(b.name)
        case 'name-desc':
          return b.name.localeCompare(a.name)
        case 'mod-count-desc':
          return b.mods.length - a.mods.length
        case 'mod-count-asc':
          return a.mods.length - b.mods.length
        default:
          return 0
      }
    })
  })

  function togglePlayset(id: string): void {
    if (selectedIds.has(id)) selectedIds.delete(id)
    else selectedIds.add(id)
  }

  const _allSelected = $derived(
    filteredPlaysets.length > 0 && filteredPlaysets.every((p) => selectedIds.has(p.id))
  )
  const _someSelected = $derived(
    filteredPlaysets.some((p) => selectedIds.has(p.id)) && !_allSelected
  )

  $effect(() => {
    allSelected = _allSelected
  })
  $effect(() => {
    someSelected = _someSelected
  })

  selectAll = () => {
    filteredPlaysets.forEach((p) => selectedIds.add(p.id))
  }

  deselectAll = () => {
    selectedIds.clear()
  }

  deleteSelected = async () => {
    if (!selectedGame) return
    // TODO: Wire up to IPC / API call here
    selectedIds.clear()
  }
</script>

<div class="playset-list">
  {#if !selectedGame}
    <div class="empty">Select a game</div>
  {:else if loading}
    <div class="loader-container">
      <Loader />
    </div>
  {:else if filteredPlaysets.length === 0 && searchQuery}
    <div class="empty">No playsets match "{searchQuery}"</div>
  {:else if filteredPlaysets.length === 0}
    <div class="empty">No playsets created</div>
  {:else}
    {#each filteredPlaysets as playset (playset.id)}
      <PlaysetCard
        {playset}
        selected={selectedIds.has(playset.id)}
        onselect={() => togglePlayset(playset.id)}
        onclick={() => onPlaysetClick(playset)}
      />
    {/each}
  {/if}
</div>

<style>
  .playset-list {
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

  .playset-list::-webkit-scrollbar {
    width: 4px;
  }
  .playset-list::-webkit-scrollbar-track {
    background: transparent;
  }
  .playset-list::-webkit-scrollbar-thumb {
    background: var(--border-light);
    border-radius: var(--radius-xs);
  }
  .playset-list::-webkit-scrollbar-thumb:hover {
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
