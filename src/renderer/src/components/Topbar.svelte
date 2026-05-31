<script lang="ts">
  import type { Game } from '../../../shared/types'
  import Checkbox from './Checkbox.svelte'
  import IconamoonClose from '../assets/icons/IconamoonClose.svelte'
  import IconamoonSearch from '../assets/icons/IconamoonSearch.svelte'
  import IconamoonSynchronize from '../assets/icons/IconamoonSynchronize.svelte'

  let {
    allSelected = false,
    someSelected = false,
    selectedGame,
    selectedCount,
    loading,
    searchQuery = $bindable(''),
    onSelectAll,
    onDeselectAll,
    onRefresh
  } = $props<{
    allSelected?: boolean
    someSelected?: boolean
    selectedGame: Game | null
    selectedCount: number
    totalCount: number
    loading: boolean
    searchQuery: string
    onSelectAll: () => void
    onDeselectAll: () => void
    onRefresh: () => void
  }>()


  function handleCheckbox(checked: boolean): void {
    if (checked) onSelectAll()
    else onDeselectAll()
  }
</script>

<div class="topbar">
  <div class="topbar-left">
    <Checkbox
      checked={allSelected}
      indeterminate={someSelected}
      disabled={!selectedGame || loading}
      onchange={handleCheckbox}
    />
    {#if selectedCount > 0}
      <span class="selection-count">{selectedCount} selected</span>
    {/if}
  </div>

  <div class="topbar-right">
    <div class="search-container">
      <IconamoonSearch class="search-icon" width={16} height={16} />
      <input
        class="search"
        type="text"
        placeholder="Search mods..."
        bind:value={searchQuery}
        disabled={!selectedGame || loading}
      />
      {#if searchQuery}
        <button class="search-clear" onclick={() => (searchQuery = '')}>
          <IconamoonClose width={14} height={14} />
        </button>
      {/if}
    </div>
    <button class="pill-button" onclick={onRefresh} disabled={!selectedGame || loading}>
      <IconamoonSynchronize width={12} height={12}/>
    </button>
  </div>
</div>

<style>
  .topbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--spacing-xs);
    padding: var(--spacing-xxs) 0;
    flex-shrink: 0;
  }

  .topbar-left {
    display: flex;
    align-items: center;
    gap: var(--spacing-xs);
  }

  .topbar-right {
    display: flex;
    align-items: center;
    gap: var(--spacing-xxs);
    flex: 1; /* fill remaining space */
    min-width: 0;
  }

  .search {
    width: 100%;
    background: transparent;
    border: 1px solid var(--border-light);
    border-radius: var(--radius-xxl);
    padding: var(--spacing-xxs) var(--spacing-xl) var(--spacing-xxs) calc(var(--spacing-xs) + 24px);
    color: var(--surface);
    font-family: 'Open Sans', sans-serif;
    font-size: var(--font-size-small);
    outline: none;
    transition: border-color var(--animation-fast);
  }

  .search-container {
    flex: 1;
    min-width: 0;
    position: relative;
    display: flex;
    align-items: center;
  }

  .search-container :global(.search-icon) {
    position: absolute;
    left: var(--spacing-xs);
    color: var(--surface-muted);
    pointer-events: none;
    flex-shrink: 0;
  }

  .search::placeholder {
    color: var(--surface-muted);
  }

  .search:focus {
    border-color: var(--primary);
  }

  .search:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }

  .search-clear {
    position: absolute;
    right: var(--spacing-xs);
    background: none;
    border: none;
    color: var(--surface-muted);
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 2px;
    border-radius: var(--radius-xxl);
    transition: color var(--animation-fast);
  }

  .search-clear:hover {
    color: var(--surface);
    background: none;
  }

  .selection-count {
    font-size: var(--font-size-small);
    color: var(--surface-muted);
    white-space: nowrap;
  }
</style>
