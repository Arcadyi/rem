<script lang="ts">
  import { type Snippet } from 'svelte'

  let {
    text,
    position = 'top',
    children
  } = $props<{
    text: string
    position?: 'top' | 'bottom'
    children: Snippet
  }>()

  let visible = $state(false)
  let wrapperEl = $state<HTMLDivElement | null>(null)
  let x = $state(0)
  let y = $state(0)

  function portal(node: HTMLElement): { destroy(): void } {
    document.body.appendChild(node)
    return {
      destroy(): void {
        node.remove()
      }
    }
  }

  function show(): void {
    if (!wrapperEl || !text) return
    const rect = wrapperEl.getBoundingClientRect()
    x = rect.left + rect.width / 2
    y = position === 'top' ? rect.top : rect.bottom
    visible = true
  }

  function hide(): void {
    visible = false
  }
</script>

<div
  class="tooltip-wrapper"
  role="group"
  bind:this={wrapperEl}
  onmouseenter={show}
  onmouseleave={hide}
>
  {@render children()}
</div>

{#if visible && text}
  <div class="tooltip {position}" style="left:{x}px; top:{y}px" use:portal>
    {text}
    <span class="arrow {position}"></span>
  </div>
{/if}

<style>
  .tooltip-wrapper {
    position: relative;
    display: inline-flex;
    align-items: center;
    justify-content: center;
  }

  :global(.tooltip) {
    position: fixed;
    z-index: 9999;
    white-space: nowrap;
    pointer-events: none;
    padding: 4px 8px;
    background: var(--bg-surface, #1a1a1a);
    border: 1px solid var(--border-light);
    border-radius: var(--radius-xs);
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.4);
    font-family: 'Open Sans', sans-serif;
    font-size: var(--font-size-tiny);
    color: var(--surface);
  }

  :global(.tooltip.top) {
    transform: translate(-50%, calc(-100% - 7px));
    animation: tooltip-in-top 100ms ease;
  }

  :global(.tooltip.bottom) {
    transform: translate(-50%, 7px);
    animation: tooltip-in-bottom 100ms ease;
  }

  :global(.tooltip .arrow) {
    position: absolute;
    left: 50%;
    transform: translateX(-50%);
    width: 0;
    height: 0;
  }

  :global(.tooltip .arrow.top) {
    top: 100%;
    border-left: 5px solid transparent;
    border-right: 5px solid transparent;
    border-top: 5px solid var(--border-light);
  }

  :global(.tooltip .arrow.bottom) {
    bottom: 100%;
    border-left: 5px solid transparent;
    border-right: 5px solid transparent;
    border-bottom: 5px solid var(--border-light);
  }

  @keyframes -global-tooltip-in-top {
    from {
      opacity: 0;
      transform: translate(-50%, calc(-100% - 3px));
    }
    to {
      opacity: 1;
      transform: translate(-50%, calc(-100% - 7px));
    }
  }

  @keyframes -global-tooltip-in-bottom {
    from {
      opacity: 0;
      transform: translate(-50%, 11px);
    }
    to {
      opacity: 1;
      transform: translate(-50%, 7px);
    }
  }
</style>
