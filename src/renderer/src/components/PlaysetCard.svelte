<script lang="ts">
  import type { Playset } from '../../../shared/types'
  import Checkbox from './Checkbox.svelte'
  import Tooltip from './Tooltip.svelte'

  let {
    playset,
    selected = false,
    onselect,
    onclick,
    ondelete
  } = $props<{
    playset: Playset
    selected?: boolean
    onselect: () => void
    onclick?: () => void
    ondelete?: () => void
  }>()

  let codeCopied = $state(false)

  async function handleCopyCode(e: MouseEvent): Promise<void> {
    e.stopPropagation()
    await navigator.clipboard.writeText(playset.code)
    codeCopied = true
    setTimeout(() => (codeCopied = false), 1500)
  }

  function handleDelete(e: MouseEvent): void {
    e.stopPropagation()
    ondelete?.()
  }

  function handleClick(): void {
    onclick?.()
  }
</script>

<div
  class="playset-card"
  class:selected
  onclick={handleClick}
  role="button"
  tabindex="0"
  onkeydown={(e) => e.key === 'Enter' && handleClick()}
>
  <Checkbox
    checked={selected}
    onchange={() => {
      onselect()
    }}
  />

  <div class="playset-info">
    <div class="playset-title-wrapper">
      <span class="playset-name">{playset.name}</span>
    </div>
    <span class="playset-meta">
      {playset.mods.length}
      {playset.mods.length === 1 ? 'mod' : 'mods'}
    </span>
  </div>

  <div class="playset-code">
    <span class="code-text">{playset.code}</span>
  </div>

  <div class="playset-actions">
    <Tooltip text={codeCopied ? 'Copied!' : 'Copy code'}>
      <button
        class="action-btn"
        class:copied={codeCopied}
        aria-label="Copy playset code"
        onclick={handleCopyCode}
      >
        {#if codeCopied}
          <!-- Checkmark -->
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <polyline points="20 6 9 17 4 12" />
          </svg>
        {:else}
          <!-- Copy -->
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
          </svg>
        {/if}
      </button>
    </Tooltip>

    <Tooltip text="Delete playset">
      <button class="action-btn danger" aria-label="Delete playset" onclick={handleDelete}>
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <polyline points="3 6 5 6 21 6" />
          <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
          <path d="M10 11v6M14 11v6" />
          <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
        </svg>
      </button>
    </Tooltip>
  </div>
</div>

<style>
  .playset-card {
    display: flex;
    align-items: center;
    gap: var(--spacing-xs);
    padding: var(--spacing-xs);
    background: var(--bg-transparent);
    backdrop-filter: var(--bg-blur);
    border: 1px solid var(--border-light);
    border-radius: var(--radius-xs);
    cursor: pointer;
    transition: background var(--animation-fast);
    min-height: 40px;
    flex-shrink: 0;
  }
  .playset-card:hover {
    background: var(--border-light);
  }
  .playset-card.selected {
    background: color-mix(in srgb, var(--secondary) 30%, transparent);
    border-color: var(--primary);
  }

  .playset-info {
    flex: 1;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    min-width: 0;
  }

  .playset-title-wrapper {
    display: flex;
    align-items: center;
    gap: var(--spacing-xs);
    min-width: 0;
  }

  .playset-name {
    font-size: var(--font-size-small);
    font-weight: var(--font-weight-semibold);
    color: var(--surface);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .playset-meta {
    font-size: var(--font-size-tiny);
    color: var(--surface-muted);
    margin-top: 2px;
  }

  .playset-code {
    display: flex;
    align-items: center;
    padding: 2px var(--spacing-xs);
    background: color-mix(in srgb, var(--border-light) 60%, transparent);
    border: 1px solid var(--border-light);
    border-radius: var(--radius-xs);
    max-width: 140px;
    overflow: hidden;
  }

  .code-text {
    font-size: var(--font-size-tiny);
    color: var(--surface-muted);
    font-family: monospace;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .playset-actions {
    display: flex;
    align-items: center;
    gap: 2px;
    opacity: 0.5;
    transition: opacity var(--animation-fast);
    flex-shrink: 0;
  }
  .playset-card:hover .playset-actions {
    opacity: 1;
  }

  .action-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 26px;
    height: 26px;
    border: 1px solid transparent;
    border-radius: var(--radius-xs);
    background: none;
    color: var(--surface-muted);
    cursor: pointer;
    transition:
      background var(--animation-fast),
      color var(--animation-fast),
      border-color var(--animation-fast);
  }
  .action-btn:hover {
    background: var(--bg-transparent);
    border-color: var(--border-light);
    color: var(--surface);
  }
  .action-btn.copied {
    color: var(--tertiary);
    border-color: var(--tertiary);
  }
  .action-btn.danger:hover {
    color: var(--status-error);
    border-color: var(--status-error);
  }
</style>
