<script lang="ts">
  import { addFont } from '../app/builder';
  import { settings, uploads } from '../app/state.svelte';
  import type { Alignment, TextSettings } from '../lib/coaster/settings';
  import { BUNDLED_FONTS } from '../lib/text/fonts';
  import SlotPicker from './SlotPicker.svelte';

  let { text, label }: { text: TextSettings; label: string } = $props();
  const id = $props.id();

  const ALIGNMENTS: { id: Alignment; label: string }[] = [
    { id: 'left', label: 'Left' },
    { id: 'center', label: 'Center' },
    { id: 'right', label: 'Right' },
  ];

  let curved = $derived(settings.shape === 'circle' && text.curved);

  async function uploadFont(event: Event & { currentTarget: HTMLInputElement }) {
    const file = event.currentTarget.files?.[0];
    event.currentTarget.value = '';
    if (!file) return;
    const fontId = `upload-${uploads.fonts.length + 1}`;
    addFont(fontId, await file.arrayBuffer());
    uploads.fonts.push({ id: fontId, label: file.name.replace(/\.(ttf|otf|woff)$/i, '') });
    text.fontId = fontId;
  }
</script>

<fieldset class="stack">
  <legend>{label}</legend>
  <label>Text <input type="text" maxlength="60" bind:value={text.text} /></label>
  <div class="row">
    <label>
      Font
      <select bind:value={text.fontId}>
        {#each BUNDLED_FONTS as font (font.id)}<option value={font.id}>{font.label}</option>{/each}
        {#each uploads.fonts as font (font.id)}<option value={font.id}>{font.label}</option>{/each}
      </select>
    </label>
    <label>
      Letter height (mm)
      <input type="number" min="2" max="30" step="0.5" bind:value={text.capHeight} />
    </label>
  </div>
  <label class="file" for={`${id}-font`}>
    <span class="hint">Or use your own font (.ttf, .otf, or .woff), read only on this device:</span>
    <input id={`${id}-font`} type="file" accept=".ttf,.otf,.woff" onchange={uploadFont} />
  </label>
  {#if settings.shape === 'circle'}
    <label class="inline"><input type="checkbox" bind:checked={text.curved} /> Curve along the edge</label>
  {/if}
  {#if !curved}
    <div class="segmented" role="group" aria-label={`${label} alignment`}>
      {#each ALIGNMENTS as a (a.id)}
        <button type="button" aria-pressed={text.align === a.id} onclick={() => (text.align = a.id)}>{a.label}</button>
      {/each}
    </div>
  {/if}
  <SlotPicker label="Text color" bind:value={text.slot} />
</fieldset>

<style>
  fieldset {
    border: 1px solid var(--border);
    border-radius: 8px;
    padding: 0.75rem;
    margin: 0;
  }

  legend {
    font-weight: 600;
    padding: 0 0.3rem;
  }

  .file input {
    font-size: 0.85rem;
  }
</style>
