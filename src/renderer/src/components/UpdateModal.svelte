<script lang="ts">
  import Modal from './Modal.svelte'
  import { onMount, onDestroy } from 'svelte'

  type UpdateState = 'available' | 'downloading' | 'ready' | 'error'

  let open = $state(false)
  let updateState = $state<UpdateState>('available')
  let newVersion = $state('')
  let progress = $state(0)
  let errorMessage = $state('')
  let currentVersion = $state<string>('—')

  onMount(async () => {
    currentVersion = await window.updaterAPI.getVersion()
    window.updaterAPI.onUpdateAvailable(({ version }) => {
      newVersion = version
      updateState = 'available'
      open = true
    })

    window.updaterAPI.onDownloadProgress((percent) => {
      progress = percent
    })

    window.updaterAPI.onUpdateDownloaded(() => {
      updateState = 'ready'
    })

    window.updaterAPI.onUpdateError((msg) => {
      errorMessage = msg
      updateState = 'error'
      open = true
    })
  })

  onDestroy(() => {
    window.updaterAPI.removeAllListeners()
  })

  function dismiss(): void {
    open = false
  }

  async function startDownload(): Promise<void> {
    updateState = 'downloading'
    progress = 0
    await window.updaterAPI.downloadUpdate()
  }

  function installNow(): void {
    window.updaterAPI.installUpdate()
  }
</script>

<Modal
  {open}
  title="Update Available"
  dismissable={updateState !== 'downloading'}
  onclose={dismiss}
>
  <div class="body">
    {#if updateState === 'available'}
      <p class="message">
        <span class="version">v{newVersion}</span> is ready to download.
      </p>
      <p class="sub">You're on v{currentVersion}.</p>
    {:else if updateState === 'downloading'}
      <p class="message">Downloading update…</p>
      <div class="progress-track">
        <div class="progress-fill" style="width: {progress}%"></div>
      </div>
      <p class="sub">{progress}%</p>
    {:else if updateState === 'ready'}
      <p class="message">Update downloaded and ready to install.</p>
      <p class="sub">REM will restart to apply the update.</p>
    {:else if updateState === 'error'}
      <p class="message error">Update failed.</p>
      <p class="sub">{errorMessage}</p>
    {/if}
  </div>

  {#snippet footer()}
    {#if updateState === 'available'}
      <button class="btn secondary" onclick={dismiss}>Later</button>
      <button class="btn primary" onclick={startDownload}>Download</button>
    {:else if updateState === 'downloading'}
      <!-- no actions while downloading -->
    {:else if updateState === 'ready'}
      <button class="btn secondary" onclick={dismiss}>Later</button>
      <button class="btn primary" onclick={installNow}>Restart & Install</button>
    {:else if updateState === 'error'}
      <button class="btn primary" onclick={dismiss}>Close</button>
    {/if}
  {/snippet}
</Modal>

<style>
  .body {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-xxs);
    padding: var(--spacing-xxs) 0;
  }

  .message {
    margin: 0;
    font-size: var(--font-size-small);
    color: var(--surface);
  }

  .message.error {
    color: var(--color-danger, #f87171);
  }

  .sub {
    margin: 0;
    font-size: var(--font-size-xs, 11px);
    color: var(--surface-muted);
  }

  .version {
    font-weight: var(--font-weight-semibold);
    color: var(--color-accent, #6ee7b7);
  }

  .progress-track {
    width: 100%;
    height: 4px;
    border-radius: 99px;
    background: var(--border-light);
    overflow: hidden;
    margin-top: var(--spacing-xxs);
  }

  .progress-fill {
    height: 100%;
    border-radius: 99px;
    background: var(--color-accent, #6ee7b7);
    transition: width 0.2s ease;
  }

  .btn {
    height: 28px;
    padding: 0 var(--spacing-xs);
    border-radius: var(--radius-xs);
    border: none;
    font-size: var(--font-size-xs, 11px);
    font-weight: var(--font-weight-semibold);
    cursor: pointer;
    transition:
      background var(--animation-fast),
      opacity var(--animation-fast);
  }

  .btn.secondary {
    background: transparent;
    color: var(--surface-muted);
    border: 1px solid var(--border-light);
  }

  .btn.secondary:hover {
    background: color-mix(in srgb, var(--surface) 8%, transparent);
    color: var(--surface);
  }

  .btn.primary {
    background: var(--color-accent, #6ee7b7);
    color: #000;
  }

  .btn.primary:hover {
    opacity: 0.85;
  }
</style>
