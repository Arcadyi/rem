<script lang="ts">
  import type { Mod, Playset } from '../../../shared/types'
  import Checkbox from './Checkbox.svelte'
  import Tooltip from './Tooltip.svelte'
  import PlaysetModCard from './PlaysetModCard.svelte'
  import IconamoonSignPlus from '../assets/icons/IconamoonSignPlus.svelte'
  import IconamoonTrashSimpleFill from '../assets/icons/IconamoonTrashSimpleFill.svelte'
  import IconamoonCopy from '../assets/icons/IconamoonCopy.svelte'
  import IconamoonCheck from '../assets/icons/IconamoonCheck.svelte'

  let {
    playset,
    selected = false,
    onselect,
    onclick,
    ondelete,
    onaddmod,
    onmodschange
  } = $props<{
    playset: Playset
    selected?: boolean
    onselect: () => void
    onclick?: () => void
    ondelete?: () => void
    onaddmod?: () => void
    onmodschange?: (mods: Mod[]) => void
  }>()

  let codeCopied = $state(false)
  let draggingIndex = $state<number | null>(null)
  let dragOverIndex = $state<number | null>(null)

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

  function handleDragStart(e: DragEvent, index: number): void {
    e.stopPropagation()
    draggingIndex = index
    if (e.dataTransfer) {
      e.dataTransfer.effectAllowed = 'move'
      e.dataTransfer.setData('text/plain', index.toString())
    }
  }

  function handleDragOver(e: DragEvent, index: number): void {
    e.preventDefault()
    e.stopPropagation()
    dragOverIndex = index
    if (e.dataTransfer) {
      e.dataTransfer.dropEffect = 'move'
    }
  }

  function handleDragLeave(e: DragEvent, index: number): void {
    e.stopPropagation()
    if (dragOverIndex === index) {
      dragOverIndex = null
    }
  }

  function handleDrop(e: DragEvent, targetIndex: number): void {
    e.preventDefault()
    e.stopPropagation()
    dragOverIndex = null
    if (draggingIndex === null || draggingIndex === targetIndex) return

    const newMods = [...playset.mods]
    const [movedMod] = newMods.splice(draggingIndex, 1)
    newMods.splice(targetIndex, 0, movedMod)

    playset.mods = newMods
    draggingIndex = null
    onmodschange?.(newMods)
  }

  function handleDragEnd(): void {
    draggingIndex = null
    dragOverIndex = null
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
  <div class="playset-header">
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
            <IconamoonCheck width={16} height={16} />
          {:else}
            <IconamoonCopy width={16} height={16} />
          {/if}
        </button>
      </Tooltip>
      <Tooltip text="Delete playset">
        <button class="action-btn danger" aria-label="Delete playset" onclick={handleDelete}>
          <IconamoonTrashSimpleFill width={16} height={16} />
        </button>
      </Tooltip>
    </div>
  </div>

  <div class="playset-mod-list">
    {#each playset.mods as mod, index (mod.itemId)}
      <PlaysetModCard
        {mod}
        {index}
        isDragging={draggingIndex === index}
        isDragOver={dragOverIndex === index}
        ondragstart={(e) => handleDragStart(e, index)}
        ondragover={(e) => handleDragOver(e, index)}
        ondragleave={(e) => handleDragLeave(e, index)}
        ondrop={(e) => handleDrop(e, index)}
        ondragend={handleDragEnd}
        onremove={(e) => {
          e.stopPropagation()
          const newMods = playset.mods.filter((m: Mod) => m.itemId !== mod.itemId)
          playset.mods = newMods
          onmodschange?.(newMods)
        }}
      />
    {/each}
    <button
      class="add-mod-btn"
      onclick={(e) => {
        e.stopPropagation()
        onaddmod?.()
      }}
    >
      <IconamoonSignPlus width={14} height={14} />
      Add Mod
    </button>
  </div>
</div>

<style>
  .playset-card {
    display: flex;
    flex-direction: column;
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

  .playset-card.selected {
    background: color-mix(in srgb, var(--secondary) 30%, transparent);
    border-color: var(--primary);
  }

  .playset-header {
    display: flex;
    align-items: flex-start;
    gap: var(--spacing-xs);
    width: 100%;
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

  .playset-mod-list {
    display: flex;
    flex-direction: column;
    gap: 4px;
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
    color: var(--quartenary);
    border-color: var(--quartenary);
  }

  .add-mod-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: var(--spacing-xs);
    padding: var(--spacing-xxs);
    background: transparent;
    border: 1px dashed var(--border-light);
    color: var(--surface-muted);
    border-radius: var(--radius-xs);
    cursor: pointer;
    font-size: var(--font-size-small);
    transition: all var(--animation-fast);
    margin-top: 2px;
  }

  .add-mod-btn:hover {
    background: color-mix(in srgb, var(--primary) 10%, transparent);
    border-color: var(--primary);
    color: var(--primary);
  }
</style>
