<script lang="ts">
  import type { Game } from '../../../shared/types'
  import MdiSteam from '../assets/icons/MdiSteam.svelte'

  import { onMount } from 'svelte'

  let {
    game,
    selected = false,
    onclick,
    expanded
  } = $props<{
    game: Game
    selected?: boolean
    onclick: () => void
    expanded: boolean
  }>()

  let iconSrc = $state<string | null>(null)
  let gameHeader = $state<string | null>(null)

  onMount(async () => {
    const images = await window.steamAPI.getGameImages(game.appId)
    iconSrc = images.icon
    gameHeader = images.header
  })
</script>

<div
  class="card"
  class:selected
  class:expanded
  role="button"
  tabindex="0"
  {onclick}
  onkeydown={(e) => e.key === 'Enter' && onclick()}
>
  {#if iconSrc}
    <img class="card-icon" class:expanded src={iconSrc ?? `...`} alt={game.name} />
  {:else}
    <div class="card-icon" class:expanded>
      <MdiSteam width={32} height={32} />
    </div>
  {/if}

  {#if expanded}
    <div class="card-header">
      {#if gameHeader}
        <img class="header-image" src={gameHeader} alt={game.name} />
      {:else}
        <div class="header-image">
          <MdiSteam width={64} height={64} />
        </div>
      {/if}
      <span class="header-text">{game.name}</span>
    </div>
  {/if}
</div>

<style>
  .card {
    display: flex;
    align-items: center;
    gap: var(--spacing-xxxs);
    min-height: 48px;
    height: auto;
    flex-shrink: 0;
    padding: var(--spacing-xxs) var(--spacing-xs);
    cursor: pointer;
    transition:
      background var(--animation-fast),
      opacity var(--animation-slow);
    color: var(--surface);
    opacity: 65%;
  }

  .card.expanded {
    align-items: start;
  }

  .card:hover {
    background: var(--border-light);
  }
  .card.selected {
    background: var(--border-light);
    border-left: 3px solid var(--primary);
    opacity: 100%;
  }
  .card-icon {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 32px;
    height: 32px;
    object-fit: cover;
    border-radius: var(--radius-xs);
    flex-shrink: 0;
    border: 1px solid var(--border-light);
  }

  .card-icon.expanded {
    margin-top: 14px;
  }

  .card-header {
    display: flex;
    flex-direction: column;
    overflow: hidden;
    padding: var(--spacing-xs);
  }

  .header-image {
    width: 184px;
    height: 80px;
    display: flex;
    justify-content: center;
    align-items: center;
    color: var(--border-light);
    border: 1px solid var(--border-light);
    border-radius: var(--radius-xs);
  }
  .header-text {
    font-size: var(--font-size-small);
    font-weight: var(--font-weight-semibold);
    color: var(--surface);
    text-align: center;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    width: 100%;
  }
</style>
