<script lang="ts">
  import type { Mod, Playset } from '../../../shared/types'
  import Modal from './Modal.svelte'
  import { SvelteSet } from 'svelte/reactivity'

  let {
    open = false,
    playset,
    availableMods = [],
    onadd,
    onclose
  } = $props<{
    open?: boolean
    playset: Playset | null
    availableMods?: Mod[]
    onadd?: (mods: Mod[]) => void
    onclose?: () => void
  }>()

  let search = $state('')
  let selectedIds = new SvelteSet<number>()

  // Reset state whenever the modal opens for a (possibly different) playset
  $effect(() => {
    if (open) {
      search = ''
      selectedIds.clear()
    }
  })

  const alreadyAdded = $derived(new Set(playset?.mods.map((m) => m.itemId) ?? []))

  const filtered = $derived.by(() => {
    const q = search.trim().toLowerCase()
    return availableMods
      .filter((m: Mod) => !alreadyAdded.has(m.itemId))
      .filter((m: Mod) => !q || m.name.toLowerCase().includes(q))
  })

  const selectedCount = $derived(selectedIds.size)

  function toggle(mod: Mod): void {
    if (selectedIds.has(mod.itemId)) selectedIds.delete(mod.itemId)
    else selectedIds.add(mod.itemId)
  }

  function toggleAll(): void {
    if (filtered.every((m: Mod) => selectedIds.has(m.itemId))) {
      filtered.forEach((m: Mod) => selectedIds.delete(m.itemId))
    } else {
      filtered.forEach((m: Mod) => selectedIds.add(m.itemId))
    }
  }

  function handleAdd(): void {
    const modsToAdd = availableMods.filter((m) => selectedIds.has(m.itemId))
    onadd?.(modsToAdd)
    onclose?.()
  }

  const allFilteredSelected = $derived(
    filtered.length > 0 && filtered.every((m) => selectedIds.has(m.itemId))
  )
  const someFilteredSelected = $derived(
    filtered.some((m) => selectedIds.has(m.itemId)) && !allFilteredSelected
  )
</script>

<Modal {open} title="Add Mods" {onclose}>
  {#if filtered.length > 0 || search}
    <div class="search-row">
      <div class="search-wrap">
        <svg
          class="search-icon"
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
        </svg>
        <input
          class="search"
          type="text"
          placeholder="Search mods..."
          bind:value={search}
          autocomplete="off"
          spellcheck="false"
        />
      </div>
    </div>
  {/if}

  <div class="list-wrap">
    {#if availableMods.length === 0}
      <div class="empty">No mods installed for this game.</div>
    {:else if filtered.length === 0 && !search}
      <div class="empty">All mods are already in this playset.</div>
    {:else if filtered.length === 0}
      <div class="empty">No mods match "{search}".</div>
    {:else}
      <!-- Select all row -->
      <button class="select-all-row" onclick={toggleAll}>
        <span
          class="sa-checkbox"
          class:checked={allFilteredSelected}
          class:indeterminate={someFilteredSelected}
        >
          {#if allFilteredSelected}
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
              <path
                d="M1.5 5l2.5 2.5 4.5-4.5"
                stroke="currentColor"
                stroke-width="1.75"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
            </svg>
          {:else if someFilteredSelected}
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
              <path d="M2 5h6" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" />
            </svg>
          {/if}
        </span>
        <span class="sa-label">
          {allFilteredSelected ? 'Deselect all' : 'Select all'}
          <span class="sa-count">({filtered.length})</span>
        </span>
      </button>

      <div class="list">
        {#each filtered as mod (mod.itemId)}
          {@const checked = selectedIds.has(mod.itemId)}
          <button class="mod-row" class:checked onclick={() => toggle(mod)}>
            <span class="checkbox" class:checked>
              {#if checked}
                <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                  <path
                    d="M1.5 5l2.5 2.5 4.5-4.5"
                    stroke="currentColor"
                    stroke-width="1.75"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                  />
                </svg>
              {/if}
            </span>

            {#if mod.previewUrl}
              <img class="thumb" src={mod.previewUrl} alt={mod.name} />
            {:else}
              <div class="thumb placeholder"></div>
            {/if}

            <span class="mod-name">{mod.name}</span>
          </button>
        {/each}
      </div>
    {/if}
  </div>

  {#snippet footer()}
    <button class="btn btn--ghost" onclick={onclose}>Cancel</button>
    <button class="btn btn--primary" onclick={handleAdd} disabled={selectedCount === 0}>
      Add{selectedCount > 0 ? ` ${selectedCount} mod${selectedCount === 1 ? '' : 's'}` : ''}
    </button>
  {/snippet}
</Modal>

<style>
  .search-row {
    margin-bottom: var(--spacing-xs);
  }

  .search-wrap {
    position: relative;
    display: flex;
    align-items: center;
  }

  .search-icon {
    position: absolute;
    left: var(--spacing-xs);
    color: var(--surface-muted);
    pointer-events: none;
    flex-shrink: 0;
  }

  .search {
    width: 100%;
    padding: var(--spacing-xxs) var(--spacing-xs) var(--spacing-xxs) calc(var(--spacing-xs) + 22px);
    font-size: var(--font-size-small);
    font-family: inherit;
    color: var(--surface);
    background: color-mix(in srgb, var(--surface) 5%, transparent);
    border: 1px solid var(--border-light);
    border-radius: var(--radius-xs);
    outline: none;
    box-sizing: border-box;
    transition: border-color var(--animation-fast);
  }

  .search::placeholder {
    color: var(--surface-muted);
    opacity: 0.5;
  }
  .search:focus {
    border-color: var(--primary);
  }

  .list-wrap {
    display: flex;
    flex-direction: column;
    min-height: 0;
  }

  .select-all-row {
    display: flex;
    align-items: center;
    gap: var(--spacing-xs);
    width: 100%;
    padding: var(--spacing-xxs) var(--spacing-xs);
    background: transparent;
    border: none;
    border-bottom: 1px solid var(--border-light);
    color: var(--surface-muted);
    font-size: var(--font-size-tiny);
    font-family: inherit;
    cursor: pointer;
    text-align: left;
    margin-bottom: 2px;
    transition: color var(--animation-fast);
  }

  .select-all-row:hover {
    color: var(--surface);
  }

  .sa-label {
    display: flex;
    align-items: center;
    gap: 4px;
  }
  .sa-count {
    opacity: 0.5;
  }

  .list {
    display: flex;
    flex-direction: column;
    gap: 1px;
    max-height: 320px;
    overflow-y: auto;
    scrollbar-width: thin;
    scrollbar-color: var(--border-light) transparent;
  }

  .list::-webkit-scrollbar {
    width: 4px;
  }
  .list::-webkit-scrollbar-track {
    background: transparent;
  }
  .list::-webkit-scrollbar-thumb {
    background: var(--border-light);
    border-radius: 4px;
  }

  .mod-row {
    display: flex;
    align-items: center;
    gap: var(--spacing-xs);
    width: 100%;
    padding: var(--spacing-xxs) var(--spacing-xs);
    background: transparent;
    border: none;
    border-radius: var(--radius-xs);
    color: var(--surface);
    font-size: var(--font-size-small);
    font-family: inherit;
    cursor: pointer;
    text-align: left;
    transition: background var(--animation-fast);
  }

  .mod-row:hover {
    background: color-mix(in srgb, var(--surface) 6%, transparent);
  }

  .mod-row.checked {
    background: color-mix(in srgb, var(--primary) 10%, transparent);
  }

  /* Checkboxes */
  .checkbox,
  .sa-checkbox {
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    width: 16px;
    height: 16px;
    border: 1.5px solid var(--border-light);
    border-radius: 3px;
    background: transparent;
    color: #fff;
    transition:
      background var(--animation-fast),
      border-color var(--animation-fast);
  }

  .checkbox.checked,
  .sa-checkbox.checked {
    background: var(--primary);
    border-color: var(--primary);
  }

  .sa-checkbox.indeterminate {
    background: var(--primary);
    border-color: var(--primary);
  }

  .thumb {
    width: 28px;
    height: 28px;
    border-radius: var(--radius-xs);
    object-fit: cover;
    flex-shrink: 0;
  }

  .thumb.placeholder {
    background: var(--border-light);
    flex-shrink: 0;
  }

  .mod-name {
    flex: 1;
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
  }

  .empty {
    padding: var(--spacing-m) var(--spacing-xs);
    text-align: center;
    color: var(--surface-muted);
    font-size: var(--font-size-small);
  }

  /* Buttons */
  .btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    padding: var(--spacing-xxs) var(--spacing-xs);
    font-size: var(--font-size-small);
    font-family: inherit;
    font-weight: var(--font-weight-semibold);
    border-radius: var(--radius-xs);
    border: 1px solid transparent;
    cursor: pointer;
    transition:
      background var(--animation-fast),
      border-color var(--animation-fast),
      color var(--animation-fast),
      opacity var(--animation-fast);
    white-space: nowrap;
  }

  .btn--ghost {
    background: transparent;
    border-color: var(--border-light);
    color: var(--surface-muted);
  }

  .btn--ghost:hover {
    background: color-mix(in srgb, var(--surface) 8%, transparent);
    color: var(--surface);
  }

  .btn--primary {
    background: var(--primary);
    border-color: var(--primary);
    color: #fff;
  }

  .btn--primary:hover {
    background: color-mix(in srgb, var(--primary) 85%, white);
  }
  .btn--primary:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }
</style>
