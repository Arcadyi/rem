<script lang="ts">
  import { onMount } from 'svelte'

  type CheckState = 'idle' | 'checking' | 'up-to-date' | 'available' | 'error'

  let checkState = $state<CheckState>('idle')
  let version = $state<string>('—')

  onMount(async () => {
    version = await window.updaterAPI.getVersion()
  })

  async function checkForUpdates(): Promise<void> {
    checkState = 'checking'
    try {
      await window.updaterAPI.checkForUpdates()

      window.updaterAPI.onUpdateAvailable(() => {
        checkState = 'available'
      })
      window.updaterAPI.onUpdateNotAvailable(() => {
        checkState = 'up-to-date'
        setTimeout(() => (checkState = 'idle'), 3000)
      })
      window.updaterAPI.onUpdateError(() => {
        checkState = 'error'
        setTimeout(() => (checkState = 'idle'), 3000)
      })
    } catch {
      checkState = 'error'
      setTimeout(() => (checkState = 'idle'), 3000)
    }
  }
</script>

<footer class="footer-bar">
  <span class="version">v{version}</span>

  <div class="right">
    {#if checkState === 'checking'}
      <span class="status muted">Checking…</span>
    {:else if checkState === 'up-to-date'}
      <span class="status ok">Up to date</span>
    {:else if checkState === 'available'}
      <span class="status ok">Update available</span>
    {:else if checkState === 'error'}
      <span class="status error">Check failed</span>
    {/if}

    <button
      class="check-btn"
      onclick={checkForUpdates}
      disabled={checkState === 'checking'}
      title="Check for updates"
    >
      <svg
        width="12"
        height="12"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
        class:spinning={checkState === 'checking'}
      >
        <path d="M21 12a9 9 0 1 1-6.219-8.56" />
      </svg>
      Check for updates
    </button>
  </div>
</footer>

<style>
  .footer-bar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: var(--spacing-m) var(--spacing-m);
    height: 28px;
    flex-shrink: 0;
  }

  .version {
    font-size: var(--font-size-xs, 11px);
    color: var(--surface-muted);
    font-variant-numeric: tabular-nums;
  }

  .right {
    display: flex;
    align-items: center;
    gap: var(--spacing-xs);
  }

  .status {
    font-size: var(--font-size-xs, 11px);
  }

  .status.muted {
    color: var(--surface-muted);
  }

  .status.ok {
    color: var(--color-accent, #6ee7b7);
  }

  .status.error {
    color: var(--color-danger, #f87171);
  }

  .check-btn {
    display: flex;
    align-items: center;
    gap: 5px;
    height: 22px;
    padding: 0 var(--spacing-xs);
    border: 1px solid var(--border-light);
    border-radius: var(--radius-xs);
    background: transparent;
    color: var(--surface-muted);
    font-size: var(--font-size-xs, 11px);
    cursor: pointer;
    transition:
      background var(--animation-fast),
      color var(--animation-fast);
  }

  .check-btn:hover:not(:disabled) {
    background: color-mix(in srgb, var(--surface) 8%, transparent);
    color: var(--surface);
  }

  .check-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }

  .spinning {
    animation: spin 0.8s linear infinite;
  }
</style>
