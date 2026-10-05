<script lang="ts">
  import { settings, uploads } from '../app/state.svelte';
  import { nearestSlot, type Badge } from '../lib/coaster/settings';
  import { ICONS } from '../lib/logo/icons';
  import { parseSvg } from '../lib/logo/svg';
  import Panel from './Panel.svelte';
  import SlotPicker from './SlotPicker.svelte';

  const MAX_SVG_BYTES = 2 * 1024 * 1024;
  const logo = settings.logo;
  let error = $state('');

  const BADGES: { id: Badge; label: string }[] = [
    { id: 'none', label: 'None' },
    { id: 'circle', label: 'Circle' },
    { id: 'rounded', label: 'Rounded' },
    { id: 'square', label: 'Square' },
  ];

  async function upload(event: Event & { currentTarget: HTMLInputElement }) {
    const file = event.currentTarget.files?.[0];
    event.currentTarget.value = '';
    if (!file) return;
    error = '';
    if (file.size > MAX_SVG_BYTES) {
      error = 'That file is larger than 2 MB. Simplify the artwork and try again.';
      return;
    }
    try {
      const { art, warnings } = parseSvg(await file.text());
      uploads.logo = art;
      uploads.logoName = file.name;
      uploads.logoWarnings = warnings;
      logo.uploadSlots = Object.fromEntries(art.layers.map((l) => [l.color, nearestSlot(l.color, settings.slots)]));
      logo.source = 'upload';
    } catch (e) {
      error = e instanceof Error ? e.message : String(e);
    }
  }
</script>

<Panel title="5. Logo" open={false}>
  <div class="segmented" role="group" aria-label="Logo source">
    <button type="button" aria-pressed={logo.source === 'none'} onclick={() => (logo.source = 'none')}>No logo</button>
    <button type="button" aria-pressed={logo.source === 'icon'} onclick={() => (logo.source = 'icon')}>Icon</button>
    <button type="button" aria-pressed={logo.source === 'upload'} onclick={() => (logo.source = 'upload')}>
      Upload SVG
    </button>
  </div>

  {#if logo.source === 'icon'}
    {#each [{ group: 'general', title: 'General' }, { group: 'brand', title: 'Brands' }] as section (section.group)}
      <h3>{section.title}</h3>
      <div class="icons" role="radiogroup" aria-label={`${section.title} icons`}>
        {#each ICONS.filter((i) => i.group === section.group) as icon (icon.id)}
          <button
            type="button"
            role="radio"
            aria-checked={logo.iconId === icon.id}
            title={icon.label}
            onclick={() => (logo.iconId = icon.id)}
          >
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d={icon.path} /></svg>
            <span class="visually-hidden">{icon.label}</span>
          </button>
        {/each}
      </div>
    {/each}
    <p class="hint">Brand icons come from Simple Icons. Brand names and logos belong to their owners.</p>
    <SlotPicker label="Icon color" bind:value={logo.iconSlot} />
  {:else if logo.source === 'upload'}
    <label class="file">
      <span class="button">Choose an SVG file…</span>
      <input type="file" accept=".svg,image/svg+xml" class="visually-hidden" onchange={upload} />
    </label>
    <p class="hint">
      Use solid-color vector artwork. Each color in the file maps to one of your filaments. The file is read on this
      device and never uploaded anywhere.
    </p>
    {#if error}<p class="error" role="alert">{error}</p>{/if}
    {#if uploads.logo}
      <p><strong>{uploads.logoName}</strong></p>
      {#each uploads.logoWarnings as warning (warning)}<p class="hint">{warning}</p>{/each}
      {#each uploads.logo.layers as layer (layer.color)}
        <div class="mapping">
          <span class="swatch" style:background={layer.color} title={layer.color}></span>
          <SlotPicker label={layer.color} allowNone bind:value={logo.uploadSlots[layer.color]} />
        </div>
      {/each}
    {/if}
  {/if}

  {#if logo.source !== 'none'}
    <label>
      Size: {logo.size}% of the code width
      <input type="range" min="10" max="35" step="1" bind:value={logo.size} />
    </label>
    <div class="stack">
      <span>Background shape</span>
      <div class="segmented" role="group" aria-label="Logo background">
        {#each BADGES as badge (badge.id)}
          <button type="button" aria-pressed={logo.badge === badge.id} onclick={() => (logo.badge = badge.id)}>
            {badge.label}
          </button>
        {/each}
      </div>
      {#if logo.badge !== 'none'}
        <SlotPicker label="Background color" bind:value={logo.badgeSlot} />
      {/if}
    </div>
  {/if}
</Panel>

<style>
  h3 {
    font-size: 0.95rem;
  }

  .icons {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(2.75rem, 1fr));
    gap: 0.35rem;
  }

  .icons button {
    aspect-ratio: 1;
    border: 1px solid var(--border);
    border-radius: 8px;
    background: #fff;
    cursor: pointer;
    padding: 0.45rem;
  }

  .icons button[aria-checked='true'] {
    border-color: var(--accent);
    background: var(--accent-soft);
  }

  .icons svg {
    width: 100%;
    height: 100%;
    fill: var(--text);
  }

  .file {
    display: block;
  }

  .error {
    color: #b91c1c;
  }

  .mapping {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .swatch {
    width: 1.25rem;
    height: 1.25rem;
    border-radius: 4px;
    border: 1px solid var(--border);
    flex: none;
  }
</style>
