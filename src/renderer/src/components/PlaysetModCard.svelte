<script lang="ts">
  import type { Mod } from '../../../shared/types'
  import Tooltip from './Tooltip.svelte'
  import IconamoonClose from '../assets/icons/IconamoonClose.svelte'

  let {
    mod,
    index,
    isDragging = false,
    isDragOver = false,
    ondragstart,
    ondragover,
    ondragleave,
    ondrop,
    ondragend,
    onremove
  } = $props<{
    mod: Mod
    index: number
    isDragging?: boolean
    isDragOver?: boolean
    ondragstart: (e: DragEvent) => void
    ondragover: (e: DragEvent) => void
    ondragleave: (e: DragEvent) => void
    ondrop: (e: DragEvent) => void
    ondragend: () => void
    onremove: (e: MouseEvent) => void
  }>()
</script>

<div
  class="playset-mod-card"
  class:dragging={isDragging}
  class:drag-over={isDragOver}
  draggable="true"
  {ondragstart}
  {ondragover}
  {ondragleave}
  {ondrop}
  {ondragend}
  role="listitem"
>
  <div class="drag-handle">
    <svg
      viewBox="0 0 24 24"
      width="16"
      height="16"
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
      fill="none"
    >
      <line x1="8" y1="6" x2="16" y2="6" />
      <line x1="8" y1="12" x2="16" y2="12" />
      <line x1="8" y1="18" x2="16" y2="18" />
    </svg>
  </div>
  <span class="mod-index">{index + 1}</span>

  {#if mod.previewUrl}
    <img class="mod-thumb" src={mod.previewUrl} alt={mod.name} />
  {:else}
    <div class="mod-thumb placeholder"></div>
  {/if}

  <div class="mod-info">
    <span class="mod-name">{mod.name}</span>
  </div>

  <Tooltip text="Remove from playset">
    <button class="remove-btn" onclick={onremove} aria-label="Remove mod">
      <IconamoonClose width={16} height={16} />
    </button>
  </Tooltip>
</div>

<style>
  .playset-mod-card {
    display: flex;
    align-items: center;
    gap: var(--spacing-xs);
    padding: var(--spacing-xxs);
    background: color-mix(in srgb, var(--surface) 5%, transparent);
    border: 1px solid var(--border-light);
    border-radius: var(--radius-xs);
    cursor: grab;
    transition:
      opacity 0.2s,
      background 0.2s;
    position: relative;
  }

  .playset-mod-card:active {
    cursor: grabbing;
  }

  .playset-mod-card.dragging {
    opacity: 0.4;
    border: 1px dashed var(--primary);
    background: color-mix(in srgb, var(--primary) 10%, transparent);
  }

  .playset-mod-card.drag-over::before {
    content: '';
    position: absolute;
    top: -2px;
    left: 0;
    right: 0;
    height: 2px;
    background: var(--primary);
    z-index: 10;
    border-radius: 2px;
  }

  .drag-handle {
    color: var(--surface-muted);
    display: flex;
    align-items: center;
    padding: 0 4px;
  }

  .mod-index {
    font-size: var(--font-size-small);
    color: var(--surface-muted);
    min-width: 24px;
    text-align: center;
    font-weight: var(--font-weight-semibold);
  }

  .mod-thumb {
    width: 32px;
    height: 32px;
    border-radius: var(--radius-xs);
    object-fit: cover;
  }

  .mod-thumb.placeholder {
    background: var(--border-light);
  }

  .mod-info {
    flex: 1;
    overflow: hidden;
  }

  .mod-name {
    font-size: var(--font-size-small);
    color: var(--surface);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    display: block;
  }

  .remove-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 24px;
    height: 24px;
    border: none;
    background: transparent;
    color: var(--surface-muted);
    cursor: pointer;
    border-radius: var(--radius-xs);
    transition:
      color var(--animation-fast),
      background var(--animation-fast);
  }

  .remove-btn:hover {
    color: var(--quartenary);
    background: color-mix(in srgb, var(--quartenary) 15%, transparent);
  }
</style>
