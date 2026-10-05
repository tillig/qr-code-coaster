<script lang="ts">
  import { settings } from '../app/state.svelte';
  import { MAX_SLOTS, removeSlot } from '../lib/coaster/settings';
  import Panel from './Panel.svelte';
  import SlotPicker from './SlotPicker.svelte';

  const NEW_COLORS = ['#000000', '#d62828', '#1d4ed8', '#f59e0b'];

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
</Panel>

<style>
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
