<script lang="ts">
  import type { Snippet } from 'svelte'
  import { fly, fade } from 'svelte/transition'
  import { cubicOut } from 'svelte/easing'

  let {
    open = false,
    title = '',
    dismissable = true,
    onclose,
    children,
    header,
    footer
  } = $props<{
    open?: boolean
    title?: string
    dismissable?: boolean
    onclose?: () => void
    children?: Snippet
    header?: Snippet
    footer?: Snippet
  }>()

  // Escape key handler
  $effect(() => {
    if (!open || !dismissable) return undefined

    function onkeydown(e: KeyboardEvent): void {
      if (e.key === 'Escape') onclose?.()
    }

    window.addEventListener('keydown', onkeydown)
    return () => window.removeEventListener('keydown', onkeydown)
  })

  function onBackdropClick(e: MouseEvent): void {
    if (dismissable && e.target === e.currentTarget) onclose?.()
  }
</script>

{#if open}
  <div
    class="backdrop"
    onclick={onBackdropClick}
    role="presentation"
    transition:fade={{ duration: 150 }}
  >
    <div
      class="panel"
      role="dialog"
      aria-modal="true"
      aria-labelledby={title ? 'modal-title' : undefined}
      transition:fly={{ y: 10, duration: 180, easing: cubicOut }}
    >
      <!-- Header -->
      {#if header || title}
        <div class="modal-header">
          {#if header}
            {@render header()}
          {:else}
            <h2 id="modal-title" class="modal-title">{title}</h2>
          {/if}

          {#if dismissable}
            <button class="close-btn" onclick={() => onclose?.()} aria-label="Close">
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path
                  d="M1 1l12 12M13 1L1 13"
                  stroke="currentColor"
                  stroke-width="1.75"
                  stroke-linecap="round"
                />
              </svg>
            </button>
          {/if}
        </div>
      {/if}

      <!-- Body -->
      {#if children}
        <div class="modal-body">
          {@render children()}
        </div>
      {/if}

      <!-- Footer -->
      {#if footer}
        <div class="modal-footer">
          {@render footer()}
        </div>
      {/if}
    </div>
  </div>
{/if}

<style>
  .backdrop {
    position: fixed;
    inset: 0;
    z-index: 100;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(0, 0, 0, 0.55);
    backdrop-filter: blur(3px);
    -webkit-backdrop-filter: blur(3px);
    padding: var(--spacing-m);
  }

  .panel {
    width: 100%;
    max-width: 440px;
    background: var(--bg-base, #1a1a1f);
    border: 1px solid var(--border-light);
    border-radius: var(--radius-xs);
    box-shadow:
      0 0 0 1px rgba(255, 255, 255, 0.03),
      0 20px 60px rgba(0, 0, 0, 0.6);
    overflow: hidden;
    display: flex;
    flex-direction: column;
  }

  .modal-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: var(--spacing-xs) var(--spacing-s, var(--spacing-xs));
    border-bottom: 1px solid var(--border-light);
    gap: var(--spacing-xs);
  }

  .modal-title {
    margin: 0;
    font-size: var(--font-size-small);
    font-weight: var(--font-weight-semibold);
    color: var(--surface);
    letter-spacing: -0.01em;
  }

  .close-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    width: 24px;
    height: 24px;
    border: none;
    border-radius: var(--radius-xs);
    background: transparent;
    color: var(--surface-muted);
    cursor: pointer;
    transition:
      background var(--animation-fast),
      color var(--animation-fast);
  }

  .close-btn:hover {
    background: color-mix(in srgb, var(--surface) 10%, transparent);
    color: var(--surface);
  }

  .modal-body {
    padding: var(--spacing-xs);
  }

  .modal-footer {
    display: flex;
    justify-content: flex-end;
    align-items: center;
    gap: var(--spacing-xxs);
    padding: var(--spacing-xs);
    border-top: 1px solid var(--border-light);
    background: color-mix(in srgb, var(--border-light) 30%, transparent);
  }
</style>
