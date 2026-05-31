<script lang="ts">
  import type { Mod } from '../../../shared/types'
  import Checkbox from './Checkbox.svelte'
  import IconaCloudClockFill from '../assets/icons/IconamoonCloudClockFill.svelte'
  import IconaFolderFill from '../assets/icons/IconamoonFolderFill.svelte'

  let {
    mod,
    appId,
    selected = false,
    compact = true,
    onselect,
    onredownload,
    onunsubscribe
  } = $props<{
    mod: Mod
    appId: number
    selected?: boolean
    compact?: boolean
    onselect: () => void
    onredownload?: () => void
    onunsubscribe?: () => void
  }>()

  function formatSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 ** 2) return `${(bytes / 1024).toFixed(1)} KB`
    if (bytes < 1024 ** 3) return `${(bytes / 1024 ** 2).toFixed(1)} MB`
    return `${(bytes / 1024 ** 3).toFixed(2)} GB`
  }

  const statusConfig = {
    upToDate: { color: 'var(--tertiary)', label: 'Up to date' },
    outdated: { color: 'var(--primary)', label: 'Out of Date' },
    unknown: { color: 'var(--quartenary)', label: 'Unknown' }
  } satisfies Record<Mod['status'], { color: string; label: string }>

  let status = $derived(statusConfig[mod.status] ?? statusConfig.unknown)

  async function handleOpenPage(e: MouseEvent): Promise<void> {
    e.stopPropagation()
    await window.steamAPI.openModPage(mod.itemId)
  }

  async function handleOpenFolder(e: MouseEvent): Promise<void> {
    e.stopPropagation()
    await window.steamAPI.openModDirectory(mod.path)
  }

  async function handleRedownload(e: MouseEvent): Promise<void> {
    e.stopPropagation()
    onredownload?.()
  }

  async function handleUnsubscribe(e: MouseEvent): Promise<void> {
    e.stopPropagation()
    onunsubscribe?.()
  }
</script>

<div
  class="mod-card"
  class:selected
  class:compact
  class:status-outdated={mod.status === 'outdated'}
  class:status-unknown={mod.status === 'unknown'}
  class:status-ok={mod.status === 'upToDate'}
  onclick={onselect}
  role="button"
  tabindex="0"
  onkeydown={(e) => e.key === 'Enter' && onselect()}
>
  <Checkbox checked={selected} onchange={onselect} />

  {#if !compact && mod.previewUrl}
    <img class="mod-thumb" src={mod.previewUrl} alt={mod.name} />
  {:else if !compact}
    <div class="mod-thumb placeholder"></div>
  {/if}

  <div class="mod-info">
    <div class="mod-title-wrapper">
      <span class="mod-name">{mod.name}</span>
      <span class="status-dot" style="background: {status.color}"></span>
      <span class="status-label">{status.label}</span>
    </div>

    {#if !compact}
      <span class="mod-meta">
        ID: {mod.itemId} • {formatSize(mod.sizeBytes)}
      </span>
      <span class="mod-meta">
        <IconaFolderFill />
        {new Date(mod.localTimestamp).toLocaleString()}
      </span>
      <span class="mod-meta">
        <IconaCloudClockFill />
        {new Date(mod.remoteTimestamp).toLocaleString()}
      </span>
    {/if}
  </div>

  <div class="mod-actions">
    <button
      class="action-btn"
      title="Open on Steam"
      aria-label="Open on Steam"
      onclick={handleOpenPage}
    >
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
        <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
        <polyline points="15 3 21 3 21 9" />
        <line x1="10" y1="14" x2="21" y2="3" />
      </svg>
    </button>
    <button
      class="action-btn"
      title="Open folder"
      aria-label="Open folder"
      onclick={handleOpenFolder}
      disabled={!mod.path}
    >
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
        <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
      </svg>
    </button>
    <button
      class="action-btn"
      title="Force redownload"
      aria-label="Force redownload"
      onclick={handleRedownload}
    >
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
        <polyline points="1 4 1 10 7 10" />
        <path d="M3.51 15a9 9 0 1 0 .49-3.51" />
      </svg>
    </button>
    <button
      class="action-btn danger"
      title="Unsubscribe"
      aria-label="Unsubscribe"
      onclick={handleUnsubscribe}
    >
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
  </div>
</div>

<style>
  .mod-card {
    display: flex;
    align-items: center;
    gap: var(--spacing-xs);
    padding: var(--spacing-xs) var(--spacing-xs);
    background: var(--bg-transparent);
    backdrop-filter: var(--bg-blur);
    border: 1px solid var(--border-light);
    border-radius: var(--radius-xs);
    cursor: pointer;
    transition: background var(--animation-fast);
    min-height: 40px;
    flex-shrink: 0;
  }
  .mod-card:hover {
    background: var(--border-light);
  }
  .mod-card:not(.compact) {
    min-height: 72px;
    padding: var(--spacing-s);
  }

  .mod-card.status-unknown {
    background: color-mix(in hsl, var(--quartenary) 20%, transparent);
  }
  .mod-card.status-unknown:hover {
    background: color-mix(in hsl, var(--quartenary) 30%, transparent);
  }
  .mod-card.status-unknown.selected {
    background: color-mix(in hsl, var(--quartenary) 50%, transparent);
    border: 1px solid var(--primary);
  }

  .mod-card.status-outdated {
    background: color-mix(in hsl, var(--primary) 15%, transparent);
  }
  .mod-card.status-outdated:hover {
    background: color-mix(in hsl, var(--primary) 30%, transparent);
  }
  .mod-card.status-outdated.selected {
    background: color-mix(in hsl, var(--primary) 60%, transparent);
    border: 1px solid var(--primary);
  }

  .mod-card.status-missing {
    background: color-mix(in hsl, var(--primary) 15%, transparent);
  }
  .mod-card.status-missing:hover {
    background: color-mix(in hsl, var(--primary) 30%, transparent);
  }
  .mod-card.status-missing.selected {
    background: color-mix(in hsl, var(--primary) 80%, transparent);
    border: 1px solid var(--primary);
  }

  .mod-card.status-ok {
    background: var(--bg-transparent);
  }
  .mod-card.status-ok:hover {
    background: color-mix(in srgb, var(--secondary) 15%, transparent);
  }
  .mod-card.status-ok.selected {
    background: color-mix(in srgb, var(--secondary) 30%, transparent);
    border: 1px solid var(--primary);
  }

  .mod-thumb {
    width: 100px;
    height: 100px;
    object-fit: cover;
    border-radius: var(--radius-xs);
    border: 1px solid var(--border-light);
    flex-shrink: 0;
  }
  .mod-thumb.placeholder {
    background: var(--border-light);
  }

  .mod-info {
    flex: 1;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    min-width: 0;
  }

  .mod-name {
    font-size: var(--font-size-small);
    font-weight: var(--font-weight-semibold);
    color: var(--surface);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .mod-meta {
    font-size: var(--font-size-tiny);
    color: var(--surface-muted);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    margin-top: 2px;
  }

  .mod-actions {
    display: flex;
    align-items: center;
    gap: 2px;
    opacity: 0.5;
    transition: opacity var(--animation-fast);
    flex-shrink: 0;
  }
  .mod-card:hover .mod-actions {
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
  .action-btn.danger:hover {
    color: var(--status-error);
    border-color: var(--status-error);
  }
  .action-btn:disabled {
    opacity: 0.3;
    cursor: not-allowed;
  }

  .mod-title-wrapper {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .status-dot {
    display: inline-block;
    width: 10px;
    height: 10px;
    border-radius: 50%;
    flex-shrink: 0;
  }

  .status-label {
    font-size: var(--font-size-tiny);
    color: var(--surface-muted);
    white-space: nowrap;
  }
</style>
