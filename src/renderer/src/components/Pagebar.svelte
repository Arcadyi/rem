<script lang="ts">
  import type { Page } from '../../../shared/types'

  let { currentPage = $bindable<Page>('mods') } = $props<{
    currentPage?: Page
  }>()
</script>

<div class="pagebar">
  <button
    class="pill-button"
    class:selected={currentPage === 'mods'}
    onclick={() => (currentPage = 'mods')}
  >
    Mods
  </button>
  <button
    class="pill-button"
    class:selected={currentPage === 'playlists'}
    onclick={() => (currentPage = 'playlists')}
  >
    Playlists
  </button>
</div>

<style>
  .pagebar {
    display: flex;
    align-items: center;
    height: 48px;
    justify-content: start;
    gap: var(--spacing-xxs);
    padding: var(--spacing-xs);
    border-radius: var(--radius-xs);
    flex-shrink: 0;
    -webkit-app-region: no-drag;
  }

  .pill-button.selected {
    color: var(--surface);
    border-color: var(--primary);
    background: color-mix(in srgb, var(--primary) 15%, transparent);
  }
</style>
