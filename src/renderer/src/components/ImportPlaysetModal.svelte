<script lang="ts">
  import type { Game, Mod } from '../../../shared/types'
  import Modal from './Modal.svelte'
  import { SvelteSet } from 'svelte/reactivity'

  let {
    open = false,
    appId,
    game = null,
    availableMods = [],
    oncreate,
    onclose
  } = $props<{
    open?: boolean
    appId: number
    game?: Game | null
    availableMods?: Mod[]
    oncreate?: (name: string, mods: Mod[]) => Promise<void> | void
    onclose?: () => void
  }>()

  let code = $state('')
  let name = $state('')
  let codeError = $state('')
  let nameError = $state('')
  let importing = $state(false)

  let resolvedMods = $state<Mod[]>([])
  let missingIds = $state<number[]>([])
  let unknownCount = $derived(missingIds.length)
  let codeValidated = $state(false)

  // Subscribe + poll state
  let subscribing = $state(false)
  let polling = $state(false)
  let downloadedCount = $state(0)
  let totalToDownload = $state(0)
  let pollSkipped = $state(false)

  // Mutable cancel ref — not reactive, just a flag
  let cancelPoll = { value: false }

  $effect(() => {
    if (open) {
      code = ''
      name = ''
      codeError = ''
      nameError = ''
      resolvedMods = []
      missingIds = []
      codeValidated = false
      importing = false
      subscribing = false
      polling = false
      downloadedCount = 0
      totalToDownload = 0
      pollSkipped = false
      cancelPoll = { value: false }
    }
  })

  async function validateCode(): Promise<void> {
    const trimmed = code.trim()
    if (!trimmed) {
      codeError = 'Paste a share code to continue.'
      return
    }

    let payload: { appId: number; modIds: number[] } | null = null
    try {
      payload = await window.steamAPI.decodeShareCode(trimmed)
    } catch {
      codeError = 'Failed to decode the code. Please try again.'
      return
    }

    if (!payload) {
      codeError = 'Invalid share code. Make sure you copied it in full.'
      return
    }

    if (payload.appId !== appId) {
      codeError = `This code is for a different game (App ID ${payload.appId}).`
      return
    }

    const modMap = new Map<number, Mod>(availableMods.map((m: Mod) => [m.itemId, m]))
    const resolved: Mod[] = []
    const ids: number[] = []

    for (const id of payload.modIds) {
      const mod = modMap.get(id)
      if (mod) resolved.push(mod)
      else ids.push(id)
    }

    resolvedMods = resolved
    missingIds = ids
    codeValidated = true
    codeError = ''
  }

  async function pollForDownloads(subscribedIds: number[]): Promise<Mod[]> {
    if (!game) return []

    polling = true
    totalToDownload = subscribedIds.length
    downloadedCount = 0
    cancelPoll.value = false

    const remaining = new SvelteSet(subscribedIds)
    const found: Mod[] = []
    const deadline = Date.now() + 3 * 60 * 1000 // 3 min timeout

    while (remaining.size > 0 && Date.now() < deadline && !cancelPoll.value) {
      await new Promise<void>((r) => setTimeout(r, 3000))
      if (cancelPoll.value) break

      const localMods = await window.steamAPI.getModsForGameLocal($state.snapshot(game) as Game)
      const localMap = new Map(localMods.map((m) => [m.itemId, m]))

      for (const id of [...remaining]) {
        const mod = localMap.get(id)
        if (mod) {
          found.push(mod)
          remaining.delete(id)
          downloadedCount = found.length
        }
      }
    }

    polling = false
    pollSkipped = cancelPoll.value && remaining.size > 0
    return found
  }

  function skipPolling(): void {
    cancelPoll.value = true
  }

  async function handleSubmit(): Promise<void> {
    if (!codeValidated) {
      await validateCode()
      if (!codeValidated) return
    }

    const trimmedName = name.trim()
    if (!trimmedName) {
      nameError = 'A name is required.'
      return
    }

    importing = true
    try {
      if (missingIds.length > 0) {
        subscribing = true
        const results = await window.steamAPI.subscribeMods(
          $state.snapshot(missingIds) as number[],
          appId
        )
        subscribing = false

        const succeededIds = results.filter((r) => r.success).map((r) => r.itemId)
        if (succeededIds.length > 0) {
          const newMods = await pollForDownloads(succeededIds)
          if (newMods.length > 0) {
            const enriched = await window.steamAPI.enrichMods($state.snapshot(newMods) as Mod[])
            const enrichedNewMods = newMods.map((m) => ({
              ...m,
              name: enriched[m.itemId]?.name ?? m.name,
              previewUrl: enriched[m.itemId]?.previewUrl ?? null
            }))
            resolvedMods = [...resolvedMods, ...enrichedNewMods]
          }
        }
      }

      const modsSnapshot = $state.snapshot(resolvedMods) as Mod[]
      await oncreate?.(trimmedName, modsSnapshot)
      onclose?.()
    } finally {
      importing = false
      subscribing = false
      polling = false
    }
  }

  function handleCodeInput(): void {
    codeError = ''
    codeValidated = false
    resolvedMods = []
    missingIds = []
  }

  const isBusy = $derived(subscribing || polling || importing)
</script>

<Modal {open} title="Import Playset" {onclose}>
  <div class="form">
    <div class="field">
      <label class="label" for="share-code-input">Share Code</label>
      <div class="code-row">
        <input
          id="share-code-input"
          bind:value={code}
          class="input"
          class:input--error={!!codeError}
          class:input--valid={codeValidated}
          type="text"
          placeholder="REM-…"
          autocomplete="off"
          spellcheck="false"
          oninput={handleCodeInput}
          onkeydown={async (e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              await validateCode()
            }
          }}
        />
        <button
          class="btn btn--ghost validate-btn"
          onclick={validateCode}
          disabled={!code.trim() || codeValidated}
        >
          {codeValidated ? '✓' : 'Validate'}
        </button>
      </div>
      {#if codeError}
        <span class="error">{codeError}</span>
      {/if}
    </div>

    {#if codeValidated}
      <div class="preview">
        <span class="preview-stat">
          <span class="preview-count">{resolvedMods.length}</span>
          {resolvedMods.length === 1 ? 'mod' : 'mods'} found locally
        </span>
        {#if unknownCount > 0}
          {#if subscribing}
            <span class="preview-info">Subscribing to {unknownCount} missing mods…</span>
          {:else if polling}
            <div class="poll-status">
              <span class="preview-info">
                Waiting for Steam to download mods — {downloadedCount} / {totalToDownload} ready…
              </span>
              <button class="btn btn--ghost skip-btn" onclick={skipPolling}> Skip waiting </button>
            </div>
          {:else if pollSkipped}
            <span class="preview-warning">
              Skipped — {downloadedCount} of {totalToDownload} mods downloaded before import.
            </span>
          {:else}
            <span class="preview-warning">
              {unknownCount}
              {unknownCount === 1 ? 'mod is' : 'mods are'} not installed — they'll be subscribed and downloaded
              automatically on import.
            </span>
          {/if}
        {/if}
      </div>

      <div class="field">
        <label class="label" for="playset-name-input">Playset Name</label>
        <input
          id="playset-name-input"
          bind:value={name}
          class="input"
          class:input--error={!!nameError}
          type="text"
          placeholder="My Imported Playset"
          maxlength={80}
          autocomplete="off"
          spellcheck="false"
          oninput={() => (nameError = '')}
          onkeydown={(e) => e.key === 'Enter' && handleSubmit()}
        />
        {#if nameError}
          <span class="error">{nameError}</span>
        {/if}
      </div>
    {/if}
  </div>

  {#snippet footer()}
    <button class="btn btn--ghost" onclick={onclose}>Cancel</button>
    {#if !codeValidated}
      <button class="btn btn--primary" onclick={validateCode} disabled={!code.trim()}>
        Validate Code
      </button>
    {:else}
      <button class="btn btn--primary" onclick={handleSubmit} disabled={isBusy}>
        {#if subscribing}
          Subscribing…
        {:else if polling}
          Downloading…
        {:else if importing}
          Importing…
        {:else if unknownCount > 0}
          Subscribe & Import
        {:else}
          Import Playset
        {/if}
      </button>
    {/if}
  {/snippet}
</Modal>

<style>
  .form {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-xs);
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

  .code-row {
    display: flex;
    gap: var(--spacing-xxs);
    align-items: stretch;
  }

  .code-row .input {
    flex: 1;
    font-family: monospace;
  }

  .validate-btn {
    flex-shrink: 0;
    white-space: nowrap;
  }

  .validate-btn:disabled {
    opacity: 0.4;
    cursor: default;
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

  .input--error:focus {
    box-shadow: 0 0 0 2px color-mix(in srgb, var(--quartenary) 20%, transparent);
  }

  .input--valid {
    border-color: var(--tertiary);
  }

  .input--valid:focus {
    box-shadow: 0 0 0 2px color-mix(in srgb, var(--tertiary) 20%, transparent);
  }

  .error {
    font-size: var(--font-size-tiny);
    color: var(--quartenary);
  }

  /* Preview banner */
  .preview {
    display: flex;
    flex-direction: column;
    gap: 4px;
    padding: var(--spacing-xxs) var(--spacing-xs);
    background: color-mix(in srgb, var(--tertiary) 8%, transparent);
    border: 1px solid color-mix(in srgb, var(--tertiary) 30%, transparent);
    border-radius: var(--radius-xs);
  }

  .preview-stat {
    font-size: var(--font-size-tiny);
    color: var(--surface-muted);
  }

  .preview-count {
    font-weight: var(--font-weight-semibold);
    color: var(--tertiary);
  }

  .preview-warning {
    font-size: var(--font-size-tiny);
    color: color-mix(in srgb, var(--quartenary) 80%, var(--surface-muted));
  }

  .preview-info {
    font-size: var(--font-size-tiny);
    color: var(--tertiary);
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
      color var(--animation-fast);
    white-space: nowrap;
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

  .btn--primary:active:not(:disabled) {
    background: color-mix(in srgb, var(--primary) 75%, black);
  }

  .btn--primary:disabled {
    opacity: 0.5;
    cursor: default;
  }

  .poll-status {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--spacing-xs);
  }

  .skip-btn {
    flex-shrink: 0;
    font-size: var(--font-size-tiny);
    padding: 2px var(--spacing-xxs);
    height: auto;
  }
</style>
