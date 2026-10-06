<script lang="ts">
  import { settings } from '../app/state.svelte';
  import { maxEdge } from '../lib/coaster/settings';
  import Panel from './Panel.svelte';

  let edgeLimit = $derived(maxEdge(settings.thickness, settings.size));
</script>

<Panel title="2. Coaster">
  <div class="segmented" role="group" aria-label="Shape">
    <button type="button" aria-pressed={settings.shape === 'circle'} onclick={() => (settings.shape = 'circle')}>
      Round
    </button>
    <button type="button" aria-pressed={settings.shape === 'square'} onclick={() => (settings.shape = 'square')}>
      Square
    </button>
  </div>
  <div class="row">
    <label>
      {settings.shape === 'circle' ? 'Diameter' : 'Side length'} (mm)
      <input type="number" min="40" max="250" step="1" bind:value={settings.size} />
    </label>
    <label>
      Thickness (mm)
      <input type="number" min="1" max="10" step="0.1" bind:value={settings.thickness} />
    </label>
    <label>
      Edge margin (mm)
      <input type="number" min="0" max="20" step="0.5" bind:value={settings.margin} />
      <span class="hint">Blank space between the edge and the design.</span>
    </label>
  </div>
  <div class="row">
    <label>
      Edge rounding (mm)
      <input
        type="number"
        min="0"
        max={edgeLimit}
        step="0.1"
        bind:value={settings.edge}
        onchange={() => (settings.edge = Math.min(Math.max(settings.edge || 0, 0), edgeLimit))}
      />
      <span class="hint">
        Rounds the top edge. The bottom edge gets a 45° bevel half as wide, which prints without supports. 0 leaves both
        sharp. Up to {edgeLimit} mm for this thickness.
      </span>
      {#if settings.edge > edgeLimit}
        <span class="hint limited">Using {edgeLimit} mm, the most this thickness allows.</span>
      {/if}
    </label>
    {#if settings.shape === 'square'}
      <label>
        Corner radius (mm)
        <input type="number" min="0" max="40" step="1" bind:value={settings.cornerRadius} />
        <span class="hint">0 for sharp corners.</span>
      </label>
    {/if}
  </div>
</Panel>

<style>
  .limited {
    color: var(--warn);
  }
</style>
