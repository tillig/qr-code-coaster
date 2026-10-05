<script lang="ts">
  import { settings } from '../app/state.svelte';
  import { luminance } from '../lib/coaster/settings';

  let {
    value = $bindable(),
    label,
    allowNone = false,
  }: { value: number | null; label: string; allowNone?: boolean } = $props();
</script>

<div class="slot-picker" role="radiogroup" aria-label={label}>
  <span class="label">{label}</span>
  <div class="swatches">
    {#each settings.slots as color, i (i)}
      <button
        type="button"
        role="radio"
        aria-checked={value === i}
        aria-label={`Filament ${i + 1}`}
        title={`Filament ${i + 1} (${color})`}
        style:background={color}
        style:color={luminance(color) > 0.55 ? '#111' : '#fff'}
        onclick={() => (value = i)}
      >
        {i + 1}
      </button>
    {/each}
    {#if allowNone}
      <button
        type="button"
        role="radio"
        class="none"
        aria-checked={value === null}
        title="Leave this color out"
        onclick={() => (value = null)}>Skip</button
      >
    {/if}
  </div>
</div>

<style>
  .slot-picker {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    flex-wrap: wrap;
    font-size: 0.9rem;
  }

  .label {
    min-width: 6rem;
  }

  .swatches {
    display: flex;
    gap: 0.3rem;
  }

  button {
    width: 2rem;
    height: 2rem;
    border-radius: 50%;
    border: 2px solid var(--border);
    cursor: pointer;
    font-size: 0.8rem;
    font-weight: 700;
  }

  button[aria-checked='true'] {
    border-color: var(--accent);
    box-shadow: 0 0 0 2px var(--accent-soft);
  }

  button.none {
    width: auto;
    border-radius: 1rem;
    padding: 0 0.6rem;
    background: #fff;
    font-weight: 400;
  }
</style>
