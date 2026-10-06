<script lang="ts">
  import { settings } from '../app/state.svelte';
  import { MAX_SLOTS, maxInlayDepth, MIN_INLAY_DEPTH, NOZZLES, removeSlot } from '../lib/coaster/settings';
  import Panel from './Panel.svelte';
  import SlotPicker from './SlotPicker.svelte';

  const NEW_COLORS = ['#000000', '#d62828', '#1d4ed8', '#f59e0b'];

  let depthLimit = $derived(maxInlayDepth(settings.thickness));

  function addSlot() {
    if (settings.slots.length >= MAX_SLOTS) return;
    settings.slots.push(NEW_COLORS.find((c) => !settings.slots.includes(c)) ?? '#808080');
  }
</script>

<Panel title="3. Filament colors">
  <p class="hint">
    Up to {MAX_SLOTS} colors, one per filament. They match the filament slots in your slicer, so you can line them up with
    your AMS.
  </p>
  <ol class="slots">
    {#each settings.slots as color, i (i)}
      <li>
        <span class="number">{i + 1}</span>
        <input type="color" aria-label={`Filament ${i + 1} color`} bind:value={settings.slots[i]} />
        <input
          type="text"
          class="hex"
          aria-label={`Filament ${i + 1} hex color`}
          value={color}
          onchange={(e) => {
            const v = e.currentTarget.value.trim();
            if (/^#[\da-f]{6}$/i.test(v)) settings.slots[i] = v.toLowerCase();
            else e.currentTarget.value = settings.slots[i];
          }}
        />
        {#if settings.slots.length > 1}
          <button type="button" class="button" onclick={() => removeSlot(settings, i)}>Remove</button>
        {/if}
      </li>
    {/each}
  </ol>
  {#if settings.slots.length < MAX_SLOTS}
    <button type="button" class="button add" onclick={addSlot}>Add a color</button>
  {/if}
  <SlotPicker label="Coaster body" bind:value={settings.baseSlot} />
  <div class="row">
    <label>
      Printer nozzle
      <select bind:value={settings.nozzle}>
        {#each NOZZLES as n (n)}<option value={n}>{n} mm</option>{/each}
      </select>
      <span class="hint">Used to check which details are too fine to print.</span>
    </label>
    <label>
      Color depth (mm)
      <input
        type="number"
        min={MIN_INLAY_DEPTH}
        max={depthLimit}
        step="0.1"
        bind:value={settings.inlayDepth}
        onchange={() =>
          (settings.inlayDepth = Math.min(
            Math.max(settings.inlayDepth || MIN_INLAY_DEPTH, MIN_INLAY_DEPTH),
            depthLimit,
          ))}
      />
      <span class="hint">
        How deep the colors go into the top. The default of 0.6 mm is three 0.2 mm layers; for other layer heights, use
        about three layers' worth. Up to {depthLimit} mm for this thickness.
      </span>
      {#if settings.inlayDepth > depthLimit}
        <span class="hint limited">Using {depthLimit} mm, the most this thickness allows.</span>
      {/if}
    </label>
  </div>
</Panel>

<style>
  .limited {
    color: var(--warn);
  }

  .slots {
    list-style: none;
    padding: 0;
    margin: 0;
    display: grid;
    gap: 0.5rem;
  }

  li {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .number {
    width: 1.5rem;
    font-weight: 700;
    text-align: center;
  }

  input[type='color'] {
    width: 3rem;
    height: 2.2rem;
    padding: 0.1rem;
    border: 1px solid var(--border);
    border-radius: 6px;
    background: #fff;
  }

  .hex {
    max-width: 8rem;
    font-family: ui-monospace, monospace;
  }

  .add {
    justify-self: start;
  }
</style>
