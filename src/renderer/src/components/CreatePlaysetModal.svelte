<script lang="ts">
  import Modal from './Modal.svelte'

  let {
    open = false,
    oncreate,
    onclose
  } = $props<{
    open?: boolean
    appId: number
    oncreate?: (name: string) => void
    onclose?: () => void
  }>()

  let name = $state('')
  let error = $state('')
  let nameInput = $state<HTMLInputElement | null>(null)

  // Reset form whenever modal opens
  $effect(() => {
    if (open) {
      name = ''
      error = ''
      // Wait for transition to settle before focusing
      setTimeout(() => nameInput?.focus(), 60)
    }
  })

  function handleSubmit(): void {
    const trimmed = name.trim()
    if (!trimmed) {
      error = 'A name is required.'
      nameInput?.focus()
      return
    }
    oncreate?.(trimmed)
    onclose?.()
  }

  function handleClose(): void {
    onclose?.()
  }
</script>

<Modal {open} title="New Playset" {onclose}>
  <div class="form">
    <label class="field">
      <span class="label">Name</span>
      <input
        bind:this={nameInput}
        bind:value={name}
        class="input"
        class:input--error={!!error}
        type="text"
        placeholder="My Playset"
        maxlength={80}
        autocomplete="off"
        spellcheck="false"
        onkeydown={(e) => e.key === 'Enter' && handleSubmit()}
        oninput={() => (error = '')}
      />
      {#if error}
        <span class="error">{error}</span>
      {/if}
    </label>

    <p class="hint">You can add and reorder mods after creation.</p>
  </div>

  {#snippet footer()}
    <button class="btn btn--ghost" onclick={handleClose}>Cancel</button>
    <button class="btn btn--primary" onclick={handleSubmit}>Create Playset</button>
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

  .error {
    font-size: var(--font-size-tiny);
    color: var(--quartenary);
  }

  .hint {
    margin: 0;
    font-size: var(--font-size-tiny);
    color: var(--surface-muted);
    opacity: 0.7;
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

  .btn--primary:active {
    background: color-mix(in srgb, var(--primary) 75%, black);
  }
</style>
