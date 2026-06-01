<script lang="ts">
  import type { Game } from '../../../shared/types'
  import Checkbox from './Checkbox.svelte'
  import Dropdown from './Dropdown.svelte'
  import type { DropdownOption } from './Dropdown.svelte'
  import IconamoonClose from '../assets/icons/IconamoonClose.svelte'
  import IconamoonSearch from '../assets/icons/IconamoonSearch.svelte'
  import IconamoonSynchronize from '../assets/icons/IconamoonSynchronize.svelte'
  import LsiconDensityLFilled from '../assets/icons/LsiconDensityLFilled.svelte'
  import LsiconDensitySFilled from '../assets/icons/LsiconDensitySFilled.svelte'
  import Tooltip from './Tooltip.svelte'
  import IconamoonSignPlus from '../assets/icons/IconamoonSignPlus.svelte'
  import IconamoonCloudDownload from '../assets/icons/IconamoonCloudDownload.svelte'

  type SortOrder = 'default' | 'name-asc' | 'name-desc' | 'size-desc' | 'size-asc'

  const SORT_OPTIONS: DropdownOption<SortOrder>[] = [
    { value: 'default', label: 'Default' },
    { value: 'name-asc', label: 'Name A → Z' },
    { value: 'name-desc', label: 'Name Z → A' },
    { value: 'size-desc', label: 'Size (largest)' },
    { value: 'size-asc', label: 'Size (smallest)' }
  ]

  let {
    currentPage,
    allSelected = false,
    someSelected = false,
    compact = false,
    selectedGame,
    selectedCount,
    loading,
    searchQuery = $bindable(''),
    sortOrder = $bindable<SortOrder>('default'),
    onSelectAll,
    onDeselectAll,
    onRefresh,
    onToggleCompact,
    onCreatePlayset,
    onImportPlayset
  } = $props<{
    currentPage: string
    allSelected?: boolean
    someSelected?: boolean
    compact: boolean
    selectedGame: Game | null
    selectedCount: number
    totalCount: number
    loading: boolean
    searchQuery: string
    sortOrder?: SortOrder
    onSelectAll: () => void
    onDeselectAll: () => void
    onRefresh: () => void
    onToggleCompact: () => void
    onCreatePlayset?: () => void
    onImportPlayset?: () => void
  }>()

  function handleCheckbox(checked: boolean): void {
    if (checked) onSelectAll()
    else onDeselectAll()
  }
</script>

<div class="topbar">
  <div class="topbar-left">
    <Tooltip text="Select All">
      <Checkbox checked={allSelected} indeterminate={someSelected} onchange={handleCheckbox} />
    </Tooltip>
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
        placeholder="Search..."
        bind:value={searchQuery}
        disabled={!selectedGame || loading}
      />
      {#if searchQuery}
        <button class="search-clear" onclick={() => (searchQuery = '')}>
          <IconamoonClose width={14} height={14} />
        </button>
      {/if}
    </div>

    <Dropdown options={SORT_OPTIONS} bind:value={sortOrder} disabled={!selectedGame || loading} />

    <Tooltip text="Toggle Compact Mode">
      <button class="round-button" onclick={onToggleCompact}>
        {#if compact}
          <LsiconDensityLFilled width={16} height={16} />
        {:else}
          <LsiconDensitySFilled width={16} height={16} />
        {/if}
      </button>
    </Tooltip>
    <Tooltip text="Refresh">
      <button class="round-button" onclick={onRefresh} disabled={!selectedGame || loading}>
        <IconamoonSynchronize width={16} height={16} />
      </button>
    </Tooltip>
    {#if currentPage === 'playsets'}
      <Tooltip text="Import Playset">
        <button class="round-button" onclick={onImportPlayset} disabled={!selectedGame || loading}>
          <IconamoonCloudDownload width={18} height={18} />
        </button>
      </Tooltip>
      <Tooltip text="New Playset">
        <button class="round-button" onclick={onCreatePlayset} disabled={!selectedGame || loading}>
          <IconamoonSignPlus width={16} height={16} />
        </button>
      </Tooltip>
    {/if}
  </div>
</div>

<style>
  .topbar {
    display: flex;
    align-items: center;
    height: 48px;
    justify-content: space-between;
    gap: var(--spacing-xs);
    padding: var(--spacing-xs);
    border-radius: var(--radius-xs);
    background: var(--bg-transparent);
    border: 1px solid var(--border-light);
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
    flex: 1;
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
  .topbar :global(.round-button) {
    width: 32px;
    height: 32px;
    /* any overrides */
  }
</style>
