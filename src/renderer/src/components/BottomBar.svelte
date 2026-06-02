<script lang="ts">
  import Tooltip from './Tooltip.svelte'
  import IconamoonSignPlus from '../assets/icons/IconamoonSignPlus.svelte'

  let { currentPage, selectedCount, onRedownload, onUnsubscribe, onAddToPlaylist, onDelete } =
    $props<{
      currentPage: string
      selectedCount: number
      onRedownload?: () => Promise<void>
      onUnsubscribe?: () => Promise<void>
      onAddToPlaylist?: () => void
      onDelete?: () => Promise<void>
    }>()

  let actionLoading = $state(false)

  async function handleRedownload(): Promise<void> {
    actionLoading = true
    try {
      await onRedownload?.()
    } finally {
      actionLoading = false
    }
  }

  async function handleUnsubscribe(): Promise<void> {
    actionLoading = true
    try {
      await onUnsubscribe?.()
    } finally {
      actionLoading = false
    }
  }

  async function handleDelete(): Promise<void> {
    actionLoading = true
    try {
      await onDelete?.()
    } finally {
      actionLoading = false
    }
  }
</script>

<div class="bottombar">
  <span class="label">
    {#if selectedCount > 0}
      {selectedCount} {currentPage}{selectedCount === 1 ? '' : ''} selected
    {:else}
      No {currentPage} selected
    {/if}
  </span>
  <div class="actions">
    {#if onAddToPlaylist}
      <!--<Tooltip text="Add selected items to a playlist"> -->
      <!--  <button -->
      <!--    class="round-button" -->
      <!--    onclick={onAddToPlaylist} -->
      <!--    disabled={actionLoading || selectedCount === 0} -->
      <!--  > -->
      <!--    <IconamoonSignPlus width={24} height={24} /> -->
      <!--  </button> -->
      <!--</Tooltip> -->
    {/if}
    {#if onRedownload}
      <Tooltip text="Force redownload of the selected items">
        <button
          class="pill-button"
          onclick={handleRedownload}
          disabled={actionLoading || selectedCount === 0}
        >
          Redownload
        </button>
      </Tooltip>
    {/if}
    {#if onUnsubscribe}
      <Tooltip text="Unsubscribe from the selected items">
        <button
          class="pill-button danger"
          onclick={handleUnsubscribe}
          disabled={actionLoading || selectedCount === 0}
        >
          Unsubscribe
        </button>
      </Tooltip>
    {/if}
    {#if onDelete}
      <Tooltip text="Delete the selected playsets">
        <button
          class="pill-button danger"
          onclick={handleDelete}
          disabled={actionLoading || selectedCount === 0}
        >
          Delete
        </button>
      </Tooltip>
    {/if}
  </div>
</div>

<style>
  .bottombar {
    display: flex;
    height: 48px;
    align-items: center;
    justify-content: space-between;
    flex-shrink: 0;
    border: 1px solid var(--border-light);
    border-radius: var(--radius-xs);
    background: var(--bg-transparent);
    padding: var(--spacing-xs);
  }
  .label {
    font-size: var(--font-size-small);
    color: var(--surface-muted);
  }
  .actions {
    display: flex;
    gap: var(--spacing-xxs);
  }
  .pill-button.danger:hover {
    background: var(--quartenary);
    border-color: var(--quartenary);
  }
</style>
