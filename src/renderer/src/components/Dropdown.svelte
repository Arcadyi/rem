<script module lang="ts">
  export type DropdownOption<V extends string> = {
    value: V
    label: string
  }
</script>

<script lang="ts" generics="T extends string">
  let {
    options,
    value = $bindable(),
    disabled = false,
    defaultLabel = 'Select'
  } = $props<{
    options: DropdownOption<T>[]
    value: T
    disabled?: boolean
    defaultLabel?: string
  }>()

  let open = $state(false)
  let containerEl = $state<HTMLDivElement | null>(null)

  const currentLabel = $derived(options.find((o) => o.value === value)?.label ?? defaultLabel)
  const isDefault = $derived(value === options[0]?.value)

  function select(v: T): void {
    value = v
    open = false
  }

  function handleWindowClick(e: MouseEvent): void {
    if (containerEl && !containerEl.contains(e.target as Node)) {
      open = false
    }
  }

  $effect(() => {
    if (!open) return () => {}
    window.addEventListener('click', handleWindowClick)
    return () => window.removeEventListener('click', handleWindowClick)
  })
</script>

<div class="dropdown" bind:this={containerEl}>
  <button class="trigger" class:active={!isDefault} onclick={() => (open = !open)} {disabled}>
    <!-- funnel / sort lines icon -->
    <svg
      width="12"
      height="12"
      viewBox="0 0 16 16"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <path
        d="M2 4h12M4 8h8M6 12h4"
        stroke="currentColor"
        stroke-width="1.5"
        stroke-linecap="round"
      />
    </svg>
    <span class="trigger-label">{currentLabel}</span>
    <svg
      class="chevron"
      class:open
      width="10"
      height="10"
      viewBox="0 0 10 10"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <path
        d="M2 3.5L5 6.5L8 3.5"
        stroke="currentColor"
        stroke-width="1.5"
        stroke-linecap="round"
        stroke-linejoin="round"
      />
    </svg>
  </button>

  {#if open}
    <div class="menu" role="listbox">
      {#each options as opt (opt.value)}
        <button
          class="option"
          class:selected={value === opt.value}
          role="option"
          aria-selected={value === opt.value}
          onclick={() => select(opt.value)}
        >
          {#if value === opt.value}
            <svg
              width="10"
              height="10"
              viewBox="0 0 10 10"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              aria-hidden="true"
            >
              <path
                d="M1.5 5L4 7.5L8.5 2.5"
                stroke="currentColor"
                stroke-width="1.5"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
            </svg>
          {:else}
            <span class="check-placeholder"></span>
          {/if}
          {opt.label}
        </button>
      {/each}
    </div>
  {/if}
</div>

<style>
  .dropdown {
    position: relative;
    flex-shrink: 0;
  }

  .trigger {
    display: flex;
    align-items: center;
    gap: 5px;
    padding: var(--spacing-xxs) var(--spacing-xs);
    white-space: nowrap;
    border: 1px solid var(--border-light);
    border-radius: var(--radius-xxl);
    background: transparent;
    color: var(--surface-muted);
    font-family: 'Open Sans', sans-serif;
    font-size: var(--font-size-small);
    cursor: pointer;
    transition:
      border-color var(--animation-fast),
      color var(--animation-fast);
  }

  .trigger:hover:not(:disabled) {
    color: var(--surface);
    border-color: var(--surface-muted);
  }

  .trigger.active {
    color: var(--primary, #5b8cff);
    border-color: var(--primary, #5b8cff);
  }

  .trigger:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }

  .chevron {
    transition: transform var(--animation-fast);
    color: inherit;
  }

  .chevron.open {
    transform: rotate(180deg);
  }

  .menu {
    position: absolute;
    top: calc(100% + 6px);
    right: 0;
    z-index: 100;
    min-width: 160px;
    display: flex;
    flex-direction: column;
    background: var(--bg-surface, #1a1a1a);
    border: 1px solid var(--border-light);
    border-radius: var(--radius-xs);
    padding: 4px;
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4);
    animation: menu-in 120ms ease;
  }

  @keyframes menu-in {
    from {
      opacity: 0;
      transform: translateY(-4px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  .option {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 6px var(--spacing-xs);
    background: none;
    border: none;
    border-radius: var(--radius-xxs, 4px);
    color: var(--surface-muted);
    font-family: 'Open Sans', sans-serif;
    font-size: var(--font-size-small);
    cursor: pointer;
    text-align: left;
    transition:
      background var(--animation-fast),
      color var(--animation-fast);
  }

  .option:hover {
    background: var(--border-light);
    color: var(--surface);
  }

  .option.selected {
    color: var(--primary, #5b8cff);
  }

  .check-placeholder {
    display: inline-block;
    width: 10px;
    flex-shrink: 0;
  }
</style>
