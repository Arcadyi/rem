<script lang="ts">
  import Loader from './Loader.svelte'
  let { status, steamRunning, restarting, onrestart } = $props<{
    status: string | null
    steamRunning: boolean
    restarting: boolean
    onrestart: () => void
  }>()
</script>

<div class="large-loading-screen">
  <Loader />
  {#if steamRunning}
    {#if restarting}
      <span>Closing Steam, please wait...</span>
    {:else}
      <span>Could not read cookies while Steam is running.</span>
      <button class="pill-button" onclick={onrestart}>Restart Steam</button>
    {/if}
  {:else if status}
    <span>{status}</span>
  {/if}
</div>

<style>
  .large-loading-screen {
    flex: 1;
    display: flex;
    align-items: center;
    flex-direction: column;
    justify-content: center;
    color: var(--surface);
    font-size: var(--font-size-normal);
    font-weight: var(--font-weight-semibold);
  }
</style>
