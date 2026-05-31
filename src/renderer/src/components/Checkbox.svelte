<script lang="ts">
  let {
    checked = false,
    indeterminate = false,
    disabled = false,
    onchange
  } = $props<{
    checked?: boolean
    indeterminate?: boolean
    disabled?: boolean
    onchange?: (checked: boolean) => void
  }>()
</script>

<button
  class="checkbox"
  class:checked
  class:indeterminate
  class:disabled
  role="checkbox"
  aria-checked={indeterminate ? 'mixed' : checked}
  {disabled}
  onclick={() => !disabled && onchange?.(!checked)}
>
  {#if indeterminate}
    <span class="mark">—</span>
  {:else if checked}
    <span class="mark">✓</span>
  {/if}
</button>

<style>
  .checkbox {
    width: 20px;
    height: 20px;
    border-radius: var(--radius-xxl);
    border: 1px solid var(--border-light);
    background: transparent;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    flex-shrink: 0;
    transition:
      background var(--animation-fast),
      border-color var(--animation-fast);
    padding: 0;
    color: var(--surface);
  }

  .checkbox:hover {
    border-color: var(--surface-muted);
  }

  .checkbox.checked,
  .checkbox.indeterminate {
    background: var(--primary);
    border-color: var(--primary);
  }

  .checkbox.disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }

  .mark {
    font-size: 12px;
    line-height: 1;
    font-weight: var(--font-weight-bold);
  }
</style>
