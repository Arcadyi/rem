<script lang="ts">
  import type { Game, Mod } from '../../shared/types'

  let games: Game[] = []
  let error: string | null = null
  let selectedGame: Game | null = null
  let mods: Mod[] = []
  let modsLoading = false
  let modsError: string | null = null

  async function loadGames(): Promise<void> {
    try {
      games = await window.steamAPI.getInstalledGames()
    } catch (e) {
      error = e instanceof Error ? e.message : String(e)
    }
  }

  async function loadMods(game: Game): Promise<void> {
    selectedGame = game
    mods = []
    modsError = null
    modsLoading = true
    try {
      mods = await window.steamAPI.getModsForGame(game)
    } catch (e) {
      modsError = e instanceof Error ? e.message : String(e)
    } finally {
      modsLoading = false
    }
  }

  loadGames()
</script>

<main class="app-container">
  {#if error}
    <p style="color: red">{error}</p>
  {:else if games.length === 0}
    <p>Loading...</p>
  {:else}
    <div style="display: flex; height: 100vh; gap: 1rem; padding: 1rem; box-sizing: border-box;">
      <!-- Game list -->
      <div
        style="width: 300px; overflow-y: auto; border-right: 1px solid #ccc; padding-right: 1rem; flex-shrink: 0;"
      >
        <p>Found {games.length} games</p>
        <ul style="list-style: none; padding: 0; margin: 0;">
          {#each games as game (game.appId)}
            <li>
              <button
                onclick={() => loadMods(game)}
                style="width: 100%; text-align: left; padding: 0.4rem 0.5rem; cursor: pointer;
                       background: {selectedGame?.appId === game.appId ? '#ddd' : 'transparent'};
                       border: none; border-radius: 4px;"
              >
                <strong>{game.name}</strong>
                <br />
                <small style="color: #888">{game.appId}</small>
              </button>
            </li>
          {/each}
        </ul>
      </div>

      <!-- Mod list -->
      <div style="flex: 1; overflow-y: auto;">
        {#if !selectedGame}
          <p style="color: #888">Select a game to see its mods</p>
        {:else if modsLoading}
          <p>Loading mods for {selectedGame.name}...</p>
        {:else if modsError}
          <p style="color: red">{modsError}</p>
        {:else if mods.length === 0}
          <p>No mods found for {selectedGame.name}</p>
        {:else}
          <p>{mods.length} mods for <strong>{selectedGame.name}</strong></p>
          <ul style="list-style: none; padding: 0; margin: 0;">
            {#each mods as mod (mod.itemId)}
              <li style="padding: 0.5rem 0; border-bottom: 1px solid #eee;">
                <strong>{mod.name}</strong>
                <span
                  style="margin-left: 0.5rem; color: {mod.status === 'upToDate'
                    ? 'green'
                    : mod.status === 'outdated'
                      ? 'orange'
                      : 'gray'}"
                >
                  [{mod.status}]
                </span>
                <br />
                <small>ID: {mod.itemId} — {(mod.sizeBytes / 1024 / 1024).toFixed(1)} MB</small>
                <br />
                <small style="color: #888">Local: {mod.localTimestamp.toLocaleString()}</small>
                <br />
                <small style="color: #888">Remote: {mod.remoteTimestamp.toLocaleString()}</small>
              </li>
            {/each}
          </ul>
        {/if}
      </div>
    </div>
  {/if}
</main>

<style>
  main {
    background: transparent;
  }
</style>
