<script lang="ts">
  import type { Game } from '../../shared/types'

  let games: Game[] = []
  let error: string | null = null

  async function loadGames(): Promise<void> {
    try {
      games = await window.steamAPI.getInstalledGames()
    } catch (e) {
      error = e instanceof Error ? e.message : String(e)
    }
  }

  loadGames()
</script>

<main>
  {#if error}
    <p style="color: red">{error}</p>
  {:else if games.length === 0}
    <p>Loading...</p>
  {:else}
    <p>Found {games.length} games</p>
    <ul>
      {#each games as game (game.appId)}
        <li>
          <strong>[{game.appId}]</strong> {game.name}
          <br />
          <small>{game.path}</small>
          <br />
          <small>Workshop: {game.workshopPath}</small>
        </li>
      {/each}
    </ul>
  {/if}
</main>
