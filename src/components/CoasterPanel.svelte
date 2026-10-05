<script lang="ts">
  import { settings } from '../app/state.svelte';
  import { NOZZLES } from '../lib/coaster/settings';
  import Panel from './Panel.svelte';
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
      Printer nozzle
      <select bind:value={settings.nozzle}>
        {#each NOZZLES as n (n)}<option value={n}>{n} mm</option>{/each}
      </select>
      <span class="hint">Used to check which details are too fine to print.</span>
    </label>
  </div>
  <details>
    <summary>Advanced</summary>
    <div class="row advanced">
      <label>
        Color depth (mm)
        <input type="number" min="0.2" max={settings.thickness - 0.4} step="0.1" bind:value={settings.inlayDepth} />
        <span class="hint">
          How deep the colors go into the top. The default of 0.6 mm is three 0.2 mm layers; for other layer heights,
          use about three layers' worth.
        </span>
      </label>
      <label>
        Edge margin (mm)
        <input type="number" min="0" max="20" step="0.5" bind:value={settings.margin} />
        <span class="hint">Blank space between the edge and the design.</span>
      </label>
    </div>
  </details>
</Panel>

<style>
  .advanced {
    margin-top: 0.75rem;
  }

  summary {
    cursor: pointer;
    font-size: 0.9rem;
  }
</style>
