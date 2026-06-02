<script lang="ts">
  import Modal from './Modal.svelte'
  import type { Mod, Playset } from '../../../shared/types'

  let {
    open = false,
    playsets = [],
    selectedMods = [],
    onclose,
    onadd,
    oncreate
  } = $props<{
    open?: boolean
    playsets: Playset[]
    selectedMods: Mod[]
    onclose?: () => void
    onadd?: (playset: Playset) => Promise<void>
    oncreate?: (name: string) => Promise<void>
  }>()

  type View = 'pick' | 'create'

  let view = $state<View>('pick')
  let selectedPlaysetId = $state<string | null>(null)
  let newName = $state('')
  let nameError = $state('')
  let loading = $state(false)
  let nameInput = $state<HTMLInputElement | null>(null)

  // Reset when modal opens
  $effect(() => {
    if (open) {
      view = 'pick'
      selectedPlaysetId = null
      newName = ''
      nameError = ''
      loading = false
    }
  })

  $effect(() => {
    if (view === 'create') {
      setTimeout(() => nameInput?.focus(), 60)
    }
  })

  async function handleAdd(): Promise<void> {
    if (!selectedPlaysetId) return
    const playset = playsets.find((p) => p.id === selectedPlaysetId)
    if (!playset) return
    loading = true
    try {
      await onadd?.(playset)
      onclose?.()
    } finally {
      loading = false
    }
  }

  async function handleCreate(): Promise<void> {
    const trimmed = newName.trim()
    if (!trimmed) {
      nameError = 'A name is required.'
      nameInput?.focus()
      return
    }
    loading = true
    try {
      await oncreate?.(trimmed)
      onclose?.()
    } finally {
      loading = false
    }
  }

  const modLabel = $derived(`${selectedMods.length} ${selectedMods.length === 1 ? 'mod' : 'mods'}`)
</script>

<Modal
  {open}
  title={view === 'pick' ? 'Add to Playset' : 'New Playset'}
  {onclose}
  dismissable={!loading}
>
  {#if view === 'pick'}
    <div class="body">
      <p class="hint">Adding {modLabel} to a playset.</p>

      {#if playsets.length === 0}
        <p class="empty">No playsets yet — create one below.</p>
      {:else}
        <ul class="playset-list">
          {#each playsets as playset (playset.id)}
            <li>
              <button
                class="playset-row"
                class:selected={selectedPlaysetId === playset.id}
                onclick={() => (selectedPlaysetId = playset.id)}
              >
                <span class="playset-name">{playset.name}</span>
                <span class="playset-meta">{playset.mods.length} mods</span>
              </button>
            </li>
          {/each}
        </ul>
      {/if}
    </div>
  {:else}
    <div class="body">
      <p class="hint">Adding {modLabel} to a new playset.</p>
      <label class="field">
        <span class="label">Name</span>
        <input
          bind:this={nameInput}
          bind:value={newName}
          class="input"
          class:input--error={!!nameError}
          type="text"
          placeholder="My Playset"
          maxlength={80}
          autocomplete="off"
          spellcheck="false"
          onkeydown={(e) => e.key === 'Enter' && handleCreate()}
          oninput={() => (nameError = '')}
        />
        {#if nameError}
          <span class="error">{nameError}</span>
        {/if}
      </label>
    </div>
  {/if}

  {#snippet footer()}
    {#if view === 'pick'}
      <button class="btn btn--ghost new-btn" onclick={() => (view = 'create')}>
        + New Playset
      </button>
      <div class="spacer"></div>
      <button class="btn btn--ghost" onclick={onclose} disabled={loading}>Cancel</button>
      <button class="btn btn--primary" onclick={handleAdd} disabled={!selectedPlaysetId || loading}>
        Add
      </button>
    {:else}
      <button class="btn btn--ghost" onclick={() => (view = 'pick')} disabled={loading}>
        Back
      </button>
      <button class="btn btn--primary" onclick={handleCreate} disabled={loading}>
        Create & Add
      </button>
    {/if}
  {/snippet}
</Modal>

<style>
  .body {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-xs);
  }

  .hint {
    margin: 0;
    font-size: var(--font-size-tiny);
    color: var(--surface-muted);
  }

  .empty {
    margin: 0;
    font-size: var(--font-size-small);
    color: var(--surface-muted);
    text-align: center;
    padding: var(--spacing-xs) 0;
  }

  .playset-list {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 2px;
    max-height: 240px;
    overflow-y: auto;
    scrollbar-width: thin;
    scrollbar-color: var(--border-light) transparent;
  }

  .playset-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    width: 100%;
    padding: var(--spacing-xxs) var(--spacing-xs);
    border-radius: var(--radius-xs);
    border: 1px solid transparent;
    background: transparent;
    cursor: pointer;
    text-align: left;
    transition:
      background var(--animation-fast),
      border-color var(--animation-fast);
  }

  .playset-row:hover {
    background: color-mix(in srgb, var(--surface) 6%, transparent);
  }

  .playset-row.selected {
    background: color-mix(in srgb, var(--primary) 15%, transparent);
    border-color: var(--primary);
  }

  .playset-name {
    font-size: var(--font-size-small);
    color: var(--surface);
    font-weight: var(--font-weight-semibold);
  }

  .playset-meta {
    font-size: var(--font-size-tiny);
    color: var(--surface-muted);
  }

  .spacer {
    flex: 1;
  }

  .new-btn {
    color: var(--primary);
    border-color: color-mix(in srgb, var(--primary) 40%, transparent);
  }

  .new-btn:hover {
    background: color-mix(in srgb, var(--primary) 10%, transparent);
    color: var(--primary);
  }

  .field {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .label {
    font-size: var(--font-size-tiny);
    font-weight: var(--font-weight-semibold);
    color: var(--surface-muted);
    text-transform: uppercase;
    letter-spacing: 0.04em;
  }

  .input {
    width: 100%;
    padding: var(--spacing-xxs) var(--spacing-xs);
    font-size: var(--font-size-small);
    font-family: inherit;
    color: var(--surface);
    background: color-mix(in srgb, var(--surface) 5%, transparent);
    border: 1px solid var(--border-light);
    border-radius: var(--radius-xs);
    outline: none;
    transition:
      border-color var(--animation-fast),
      box-shadow var(--animation-fast);
    box-sizing: border-box;
  }

  .input::placeholder {
    color: var(--surface-muted);
    opacity: 0.5;
  }

  .input:focus {
    border-color: var(--primary);
    box-shadow: 0 0 0 2px color-mix(in srgb, var(--primary) 20%, transparent);
  }

  .input--error {
    border-color: var(--quartenary);
  }

  .error {
    font-size: var(--font-size-tiny);
    color: var(--quartenary);
  }

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
      color var(--animation-fast);
    white-space: nowrap;
  }

  .btn:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }

  .btn--ghost {
    background: transparent;
    border-color: var(--border-light);
    color: var(--surface-muted);
  }

  .btn--ghost:hover:not(:disabled) {
    background: color-mix(in srgb, var(--surface) 8%, transparent);
    color: var(--surface);
  }

  .btn--primary {
    background: var(--primary);
    border-color: var(--primary);
    color: #fff;
  }

  .btn--primary:hover:not(:disabled) {
    background: color-mix(in srgb, var(--primary) 85%, white);
  }
</style>
