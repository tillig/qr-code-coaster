<script lang="ts">
  import { settings } from '../app/state.svelte';
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
      Edge margin (mm)
      <input type="number" min="0" max="20" step="0.5" bind:value={settings.margin} />
      <span class="hint">Blank space between the edge and the design.</span>
    </label>
  </div>
</Panel>
