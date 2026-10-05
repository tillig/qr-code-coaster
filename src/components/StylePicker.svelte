<script lang="ts" generics="T extends string">
  import { THUMBNAIL_VIEWBOX } from '../app/thumbnails';

  let {
    value = $bindable(),
    options,
    label,
  }: { value: T; options: { id: T; label: string; path: string }[]; label: string } = $props();
</script>

<div class="style-picker" role="radiogroup" aria-label={label}>
  {#each options as option (option.id)}
    <button
      type="button"
      role="radio"
      aria-checked={value === option.id}
      title={option.label}
      onclick={() => (value = option.id)}
    >
      <svg viewBox={THUMBNAIL_VIEWBOX} aria-hidden="true"><path d={option.path} /></svg>
      <span>{option.label}</span>
    </button>
  {/each}
</div>

<style>
  .style-picker {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(4.5rem, 1fr));
    gap: 0.5rem;
  }

  button {
    display: grid;
    justify-items: center;
    gap: 0.25rem;
    padding: 0.5rem 0.25rem;
    border: 1px solid var(--border);
    border-radius: 8px;
    background: #fff;
    cursor: pointer;
    font-size: 0.75rem;
  }

  button[aria-checked='true'] {
    border-color: var(--accent);
    background: var(--accent-soft);
  }

  svg {
    width: 2.5rem;
    height: 2.5rem;
    fill: var(--text);
  }
</style>
