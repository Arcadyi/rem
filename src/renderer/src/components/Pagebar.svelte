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
    class:selected={currentPage === 'playsets'}
    onclick={() => (currentPage = 'playsets')}
  >
    Playsets
  </button>
</div>

<style>
  .pagebar {
    display: flex;
    align-items: center;
    height: 48px;
    justify-content: start;
    padding: var(--spacing-xs);
    border-radius: var(--radius-xs);
    flex-shrink: 0;
    -webkit-app-region: no-drag;
  }

  .pill-button:first-child {
    border-radius: var(--radius-xl) 0 0 var(--radius-xl);
  }

  .pill-button:last-child {
    border-radius: 0 var(--radius-xl) var(--radius-xl) 0;
  }

  .pill-button.selected {
    color: var(--surface);
    border-color: var(--primary);
    background: color-mix(in srgb, var(--primary) 15%, transparent);
  }
</style>
