<script lang="ts">
  import IconamoonSignMinusFill from '../assets/icons/IconamoonSignMinusFill.svelte'
  import IconamoonScreenFull from '../assets/icons/IconamoonScreenFull.svelte'
  import IconamoonClose from '../assets/icons/IconamoonClose.svelte'
  import Pagebar from './Pagebar.svelte'
  import type { Page } from '../../../shared/types'
  import RemIcon from '../assets/icons/RemIcon.svelte'

  let { currentPage = $bindable<Page>('mods') } = $props<{
    currentPage?: Page
  }>()
</script>

<div class="titlebar">
  <div class="topbar-left">
    <div class="app-icon">
      <RemIcon class="app-icon" width={24} height={24} />
    </div>
    <span class="topbar-name">REM</span>
    <Pagebar bind:currentPage />
  </div>

  <div class="topbar-right">
    <button class="topbar-button" onclick={() => window.api.minimize()}>
      <IconamoonSignMinusFill />
    </button>
    <button class="topbar-button" onclick={() => window.api.maximize()}>
      <IconamoonScreenFull />
    </button>
    <button class="topbar-button close" onclick={() => window.api.close()}>
      <IconamoonClose />
    </button>
  </div>
</div>

<style>
  .titlebar {
    display: flex;
    height: 48px;
    justify-content: space-between;
    padding: var(--spacing-xs) var(--spacing-m);
    -webkit-app-region: drag;
  }

  .app-icon {
    margin-top: 10px;
  }

  .topbar-left {
    display: flex;
    align-items: center;
    color: var(--surface);
    gap: var(--spacing-xxs);
  }

  .topbar-right {
    width: 20%;
    display: flex;
    align-items: center;
    justify-content: flex-end;
  }

  .topbar-name {
    font-size: var(--font-size-subheader);
    font-weight: var(--font-weight-heavy);
  }

  .topbar-button {
    width: 32px;
    height: 32px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: none;
    border: 1px solid var(--border-light);
    border-radius: 0;
    cursor: pointer;
    padding: var(--spacing-xxs);
    color: var(--surface);
    transition:
      background var(--animation-slow),
      color var(--animation-slow);
    -webkit-app-region: no-drag;
  }

  .topbar-button:first-child {
    border-radius: var(--radius-xl) 0 0 var(--radius-xl);
  }

  .topbar-button:last-child {
    border-radius: 0 var(--radius-xl) var(--radius-xl) 0;
  }

  .topbar-button:hover {
    background: var(--border-light);
  }

  .topbar-right .topbar-button.close:hover {
    background: var(--primary);
  }

  .topbar-button:active {
    background: var(--surface);
  }

  .topbar-button:focus:not(:focus-visible) {
    outline: none;
  }
</style>
