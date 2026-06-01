<script lang="ts">
  import type { Mod } from '../../../shared/types'
  import Modal from './Modal.svelte'

  let {
    open = false,
    appId,
    availableMods = [],
    oncreate,
    onclose
  } = $props<{
    open?: boolean
    appId: number
    availableMods?: Mod[]
    oncreate?: (name: string, mods: Mod[]) => Promise<void> | void
    onclose?: () => void
  }>()

  let code = $state('')
  let name = $state('')
  let codeError = $state('')
  let nameError = $state('')
  let importing = $state(false)

  // Preview state populated after a valid code is parsed
  let resolvedMods = $state<Mod[]>([])
  let unknownCount = $state(0)
  let codeValidated = $state(false)

  // Reset whenever modal opens
  $effect(() => {
    if (open) {
      code = ''
      name = ''
      codeError = ''
      nameError = ''
      resolvedMods = []
      unknownCount = 0
      codeValidated = false
      importing = false
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

    // Resolve mod IDs against the local mod list
    const modMap = new Map<number, Mod>(availableMods.map((m: Mod) => [m.itemId, m]))
    const resolved: Mod[] = []
    let missing = 0

    for (const id of payload.modIds) {
      const mod = modMap.get(id)
      if (mod) resolved.push(mod)
      else missing++
    }

    resolvedMods = resolved
    unknownCount = missing
    codeValidated = true
    codeError = ''
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
      const modsSnapshot = $state.snapshot(resolvedMods) as Mod[]
      await oncreate?.(trimmedName, modsSnapshot)
      onclose?.()
    } finally {
      importing = false
    }
  }

  function handleCodeInput(): void {
    codeError = ''
    codeValidated = false
    resolvedMods = []
    unknownCount = 0
  }
</script>

<Modal {open} title="Import Playset" {onclose}>
  <div class="form">
    <!-- Code field -->
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
            <span class="preview-warning">
              {unknownCount}
              {unknownCount === 1 ? 'mod is' : 'mods are'} not installed and will be skipped.
            </span>
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

    <!-- Preview — shown once code is decoded successfully -->
    {#if codeValidated}
      <div class="preview">
        <span class="preview-stat">
          <span class="preview-count">{resolvedMods.length}</span>
          {resolvedMods.length === 1 ? 'mod' : 'mods'} found locally
        </span>
        {#if unknownCount > 0}
          <span class="preview-warning">
            {unknownCount}
            {unknownCount === 1 ? 'mod is' : 'mods are'} not installed and will be skipped.
          </span>
        {/if}
      </div>

      <!-- Name field — only shown after valid code -->
      <label class="field">
        <span class="label">Playset Name</span>
        <input
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
      </label>
    {/if}
  </div>

  {#snippet footer()}
    <button class="btn btn--ghost" onclick={onclose}>Cancel</button>
    {#if !codeValidated}
      <button class="btn btn--primary" onclick={validateCode} disabled={!code.trim()}>
        Validate Code
      </button>
    {:else}
      <button class="btn btn--primary" onclick={handleSubmit} disabled={importing}>
        {importing ? 'Importing…' : 'Import Playset'}
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
</style>
