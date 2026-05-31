<script lang="ts">
  import IconamoonArrowLeft2 from '../assets/icons/IconamoonArrowLeft2.svelte'
  import type { Game } from '../../../shared/types'
  import GameCard from './GameCard.svelte'

  let expanded = $state(false)
  let { games = $bindable<Game[]>([]), selectedGame = $bindable<Game | null>(null) } = $props<{
    games?: Game[]
    selectedGame?: Game | null
  }>()
</script>

<div class="sidebar" class:expanded>
  <button class="sidebar-toggle-button" onclick={() => (expanded = !expanded)}>
    <IconamoonArrowLeft2 width={32} height={32} />
  </button>
  <div class="sidebar-list surface">
    {#each games as game (game.appId)}
      <GameCard
        {game}
        selected={selectedGame?.appId === game.appId}
        onclick={() => (selectedGame = game)}
        {expanded}
      />
    {/each}
  </div>
</div>

<style>
  .sidebar {
    width: 60px;
    height: 100%;
    background: none;
    transition: width var(--animation-normal);
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }
  .sidebar.expanded {
    width: 268px;
  }
  .sidebar-toggle-button {
    display: flex;
    width: 100%;
    height: 48px;
    background: var(--bg-transparent);
    padding: var(--spacing-xxs);
    border: 1px solid var(--border-light);
    border-radius: var(--radius-l) var(--radius-l) 0 0;
    align-items: center;
    justify-content: center;
    color: var(--surface);
    transition: background var(--animation-slow);
  }
  .sidebar-toggle-button:hover {
    background: var(--border-light);
  }
  .sidebar-toggle-button :global(svg) {
    transition: transform var(--animation-slow);
  }
  .sidebar-toggle-button:hover :global(svg) {
    transform: rotate(-180deg);
  }
  .sidebar.expanded .sidebar-toggle-button :global(svg) {
    transform: rotate(-180deg);
  }
  .sidebar.expanded .sidebar-toggle-button:hover :global(svg) {
    transform: rotate(0deg);
  }
  .sidebar-toggle-button:active {
    background: var(--surface);
  }
  .sidebar-list {
    display: flex;
    flex: 1;
    flex-direction: column;
    border-radius: 0 0 var(--radius-xs) var(--radius-xs);
    border: 1px solid var(--border-light);
    opacity: 1;
    transition: opacity var(--animation-slow);
    overflow-y: auto;
    scrollbar-width: thin;
    scrollbar-color: var(--border-light) transparent;
  }

  .sidebar-list::-webkit-scrollbar {
    width: 4px;
  }

  .sidebar-list::-webkit-scrollbar-track {
    background: transparent;
  }

  .sidebar-list::-webkit-scrollbar-thumb {
    background: var(--border-light);
    border-radius: var(--radius-xs);
  }

  .sidebar-list::-webkit-scrollbar-thumb:hover {
    background: var(--surface);
  }
</style>
