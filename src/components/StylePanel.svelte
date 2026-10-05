<script lang="ts">
  import { settings } from '../app/state.svelte';
  import { centerThumbnail, frameThumbnail, moduleThumbnail } from '../app/thumbnails';
  import { CENTER_STYLES, FRAME_STYLES, MODULE_STYLES } from '../lib/qr/styles';
  import Panel from './Panel.svelte';
  import SlotPicker from './SlotPicker.svelte';
  import StylePicker from './StylePicker.svelte';

  const LABELS: Record<string, string> = {
    square: 'Square',
    rounded: 'Rounded',
    liquid: 'Liquid',
    dots: 'Dots',
    leaf: 'Leaf',
    horizontal: 'Rows',
    vertical: 'Columns',
    diamond: 'Diamonds',
    circle: 'Circle',
    'point-in': 'Point in',
    'point-out': 'Point out',
    star: 'Star',
    burst: 'Burst',
    plus: 'Plus',
  };

  const modules = MODULE_STYLES.map((id) => ({ id, label: LABELS[id], path: moduleThumbnail(id) }));
  const frames = FRAME_STYLES.map((id) => ({ id, label: LABELS[id], path: frameThumbnail(id) }));
  const centers = CENTER_STYLES.map((id) => ({
    id,
    label: id === 'diamond' ? 'Diamond' : LABELS[id],
    path: centerThumbnail(id),
  }));
</script>

<Panel title="4. QR code style">
  <section class="stack">
    <h3>Pattern</h3>
    <StylePicker label="Pattern style" options={modules} bind:value={settings.moduleStyle} />
    <SlotPicker label="Pattern color" bind:value={settings.moduleSlot} />
  </section>
  <section class="stack">
    <h3>Corner frames</h3>
    <StylePicker label="Corner frame style" options={frames} bind:value={settings.frameStyle} />
    <SlotPicker label="Frame color" bind:value={settings.frameSlot} />
  </section>
  <section class="stack">
    <h3>Corner centers</h3>
    <StylePicker label="Corner center style" options={centers} bind:value={settings.centerStyle} />
    <SlotPicker label="Center color" bind:value={settings.centerSlot} />
  </section>
  <details>
    <summary>Advanced</summary>
    <div class="row advanced">
      <label>
        Error correction
        <select bind:value={settings.errorCorrection}>
          <option value="auto">Automatic</option>
          <option value="L">Low (7%)</option>
          <option value="M">Medium (15%)</option>
          <option value="Q">Quartile (25%)</option>
          <option value="H">High (30%)</option>
        </select>
        <span class="hint">Automatic uses High when there is a logo, otherwise Medium.</span>
      </label>
      <label>
        Quiet zone (modules)
        <input type="number" min="0" max="6" step="1" bind:value={settings.quietZone} />
        <span class="hint">Blank space around the code, measured in the code's small squares.</span>
      </label>
    </div>
  </details>
</Panel>

<style>
  h3 {
    font-size: 0.95rem;
  }

  .advanced {
    margin-top: 0.75rem;
  }

  summary {
    cursor: pointer;
    font-size: 0.9rem;
  }
</style>
