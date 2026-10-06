<script lang="ts">
  import { buildPreview, export3mf, onCheck, onFontError } from './app/builder';
  import type { CheckResult, PreviewPart } from './app/protocol';
  import { settings, uploads } from './app/state.svelte';
  import type { CoasterSettings } from './lib/coaster/settings';
  import CoasterPanel from './components/CoasterPanel.svelte';
  import ColorsPanel from './components/ColorsPanel.svelte';
  import ContentPanel from './components/ContentPanel.svelte';
  import LogoPanel from './components/LogoPanel.svelte';
  import Preview from './components/Preview.svelte';
  import StylePanel from './components/StylePanel.svelte';
  import TextPanel from './components/TextPanel.svelte';

  let parts = $state.raw<PreviewPart[]>([]);
  let warnings = $state<string[]>([]);
  let info = $state('');
  let building = $state(false);
  let downloading = $state(false);
  let error = $state('');
  let fontWarning = $state('');
  // Undefined while the checks run; null when there is no code to check.
  let check = $state.raw<CheckResult | null | undefined>(null);
  let checkedNozzle = $state(0);
  let showThin = $state(true);
  let shownBuild = 0;

  onFontError((_, message) => (fontWarning = `A font could not be loaded: ${message}`));
  onCheck((buildId, result) => {
    if (buildId === shownBuild) check = result;
  });

  // Only one build runs at a time; changes made meanwhile collapse into a single follow-up build.
  let queued: { settings: CoasterSettings; upload: typeof uploads.logo } | null = null;
  async function runBuilds() {
    building = true;
    while (queued) {
      const job = queued;
      queued = null;
      try {
        const result = await buildPreview(job.settings, job.upload);
        if (queued) continue;
        parts = result.parts;
        warnings = result.warnings;
        shownBuild = result.id;
        check = result.qr ? undefined : null;
        checkedNozzle = job.settings.nozzle;
        error = '';
        info = result.qr
          ? `${result.qr.modules}×${result.qr.modules} modules, ${result.qr.moduleSize.toFixed(2)} mm each, error correction ${result.qr.errorCorrection}`
          : '';
      } catch (e) {
        error = e instanceof Error ? e.message : String(e);
      }
    }
    building = false;
  }

  $effect(() => {
    const job = { settings: $state.snapshot(settings) as CoasterSettings, upload: uploads.logo };
    const timer = setTimeout(() => {
      const idle = !queued && !building;
      queued = job;
      if (idle) runBuilds();
    }, 150);
    return () => clearTimeout(timer);
  });

  async function download() {
    downloading = true;
    error = '';
    try {
      const bytes = await export3mf($state.snapshot(settings) as CoasterSettings, uploads.logo, 'QR code coaster');
      const url = URL.createObjectURL(new Blob([bytes as BlobPart], { type: 'model/3mf' }));
      const a = document.createElement('a');
      a.href = url;
      a.download = `qr-coaster-${settings.content.type}.3mf`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 10_000);
    } catch (e) {
      error = e instanceof Error ? e.message : String(e);
    } finally {
      downloading = false;
    }
  }

  let used = $derived(new Set(parts.map((p) => p.slot)));
</script>

<header>
  <h1>QR Code Coaster</h1>
  <p>Design a multicolor, 3D-printable QR code coaster. Free, and everything stays in your browser.</p>
</header>

<main>
  <div class="controls">
    <ContentPanel />
    <CoasterPanel />
    <ColorsPanel />
    <StylePanel />
    <LogoPanel />
    <TextPanel />
  </div>

  <aside class="output">
    <Preview {parts} colors={settings.slots} size={settings.size} highlight={showThin ? check?.highlight : null} />
    <div class="legend">
      {#each settings.slots as color, i (i)}
        <span class:unused={!used.has(i)}>
          <span class="swatch" style:background={color}></span> Filament {i + 1}{used.has(i) ? '' : ' (unused)'}
        </span>
      {/each}
    </div>
    {#if info}<p class="hint">{info}</p>{/if}
    {#if check === undefined}
      <p class="hint">Checking that the code scans and prints…</p>
    {:else if check}
      {#if !check.readable}
        <p class="warning">
          A test scan couldn't read this code. Try a smaller logo, stronger contrast between colors, a simpler pattern,
          or less content.
        </p>
      {:else if !check.printReadable}
        <p class="warning">
          The design scans, but a simulated print with a {checkedNozzle} mm nozzle doesn't. Try a finer nozzle, a bigger coaster,
          a simpler pattern, or less content.
        </p>
      {:else}
        <p class="success">Test scan passed, including a simulated print with a {checkedNozzle} mm nozzle.</p>
      {/if}
      {#if check.lostArea > 0}
        <div class="thin">
          <p class="hint">
            Some details are thinner than a {checkedNozzle} mm nozzle can print and will fill in or disappear.
          </p>
          <label class="inline"><input type="checkbox" bind:checked={showThin} /> Highlight them in red</label>
        </div>
      {/if}
    {/if}
    {#each fontWarning ? [fontWarning, ...warnings] : warnings as warning (warning)}
      <p class="warning">{warning}</p>
    {/each}
    {#if error}<p class="warning" role="alert">{error}</p>{/if}
    <button type="button" class="button primary" disabled={downloading || !parts.length} onclick={download}>
      {downloading ? 'Preparing…' : 'Download .3mf'}
    </button>
    <p class="hint">
      Open the file in Bambu Studio and confirm the color mapping it offers; each color becomes its own filament.
      {building ? ' Updating preview…' : ''}
    </p>
  </aside>
</main>

<footer>
  <p>
    Nothing you enter is uploaded, stored, or tracked. The page has no server-side code, and the browser blocks it from
    contacting any other site.
  </p>
  <p>
    Made by <a href="https://www.paraesthesia.com">Travis Illig</a>.
    <a href="https://github.com/tillig/qr-code-coaster">Source code on GitHub</a>.
  </p>
</footer>

<style>
  header,
  footer {
    max-width: 80rem;
    margin: 0 auto;
    padding: 1.25rem 1rem 0.5rem;
  }

  header p,
  footer p {
    color: var(--muted);
    margin: 0.35rem 0 0;
  }

  footer {
    padding-bottom: 2rem;
    font-size: 0.85rem;
  }

  main {
    max-width: 80rem;
    margin: 0 auto;
    padding: 0.5rem 1rem;
    display: grid;
    gap: 1rem;
    grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
    align-items: start;
  }

  .controls {
    display: grid;
    gap: 0.75rem;
  }

  .output {
    position: sticky;
    top: 1rem;
    display: grid;
    gap: 0.6rem;
    background: var(--card);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    padding: 1rem;
  }

  .output p {
    margin: 0;
  }

  .legend {
    display: flex;
    flex-wrap: wrap;
    gap: 0.4rem 1rem;
    font-size: 0.9rem;
  }

  .legend > span {
    display: inline-flex;
    align-items: center;
    gap: 0.35rem;
  }

  .legend .unused {
    color: var(--muted);
  }

  .swatch {
    width: 1rem;
    height: 1rem;
    border-radius: 3px;
    border: 1px solid var(--border);
  }

  .success {
    background: var(--success-soft);
    color: var(--success);
    border-radius: 6px;
    padding: 0.5rem 0.7rem;
    font-size: 0.9rem;
  }

  .thin {
    display: grid;
    gap: 0.3rem;
  }

  .warning {
    background: var(--warn-soft);
    color: var(--warn);
    border-radius: 6px;
    padding: 0.5rem 0.7rem;
    font-size: 0.9rem;
  }

  @media (max-width: 52rem) {
    main {
      grid-template-columns: 1fr;
    }

    .output {
      position: static;
      order: -1;
    }
  }
</style>
