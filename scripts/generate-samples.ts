// Builds representative coasters into samples/ for the slicer smoke test, failing if any mesh is not watertight.
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { buildCoaster } from '../src/lib/coaster/build';
import { defaultSettings, type CoasterSettings } from '../src/lib/coaster/settings';
import { findIcon, iconArt } from '../src/lib/logo/icons';
import { inspectMesh } from '../src/lib/mesh/validate';
import { build3mf } from '../src/lib/threemf/writer';
import { testAssets } from '../src/test/helpers';

const outDir = process.argv[2] ?? 'samples';

const samples: { name: string; configure: (s: CoasterSettings) => void }[] = [
  { name: 'round-link', configure: () => {} },
  {
    name: 'square-wifi-logo',
    configure: (s) => {
      s.shape = 'square';
      s.slots = ['#ffffff', '#1f2937', '#1d4ed8'];
      s.content.type = 'wifi';
      s.content.wifi = { ssid: 'Sample Network', password: 'not-a-real-password', security: 'WPA', hidden: false };
      s.moduleStyle = 'rounded';
      s.frameStyle = 'rounded';
      s.frameSlot = 2;
      s.logo = { ...s.logo, source: 'icon', iconId: 'wifi', badge: 'circle', badgeSlot: 2, iconSlot: 0 };
      s.bottomText = { ...s.bottomText, text: 'Scan to join', curved: false, slot: 2 };
    },
  },
  {
    name: 'round-four-colors',
    configure: (s) => {
      s.size = 90;
      s.slots = ['#f5f0e6', '#111111', '#c81e1e', '#1d4ed8'];
      s.moduleStyle = 'liquid';
      s.frameStyle = 'leaf';
      s.centerStyle = 'star';
      s.frameSlot = 2;
      s.centerSlot = 3;
      s.topText = { ...s.topText, text: 'Hello', curved: true, slot: 2 };
      s.bottomText = { ...s.bottomText, text: 'World', curved: true, slot: 3, fontId: 'pacifico' };
    },
  },
];

mkdirSync(outDir, { recursive: true });
const manifest: { file: string; parts: number; filaments: number }[] = [];
let failed = false;

for (const sample of samples) {
  const settings = defaultSettings();
  sample.configure(settings);
  const logo = settings.logo.source === 'icon' ? iconArt(findIcon(settings.logo.iconId)!) : null;
  const result = buildCoaster(settings, testAssets(logo));
  for (const part of result.parts) {
    const report = inspectMesh(part.mesh);
    if (report.badEdges || report.volume <= 0) {
      console.error(`${sample.name}: ${part.name} is not a closed solid (${report.badEdges} bad edges)`);
      failed = true;
    }
  }
  const file = `${sample.name}.3mf`;
  const bytes = build3mf({
    title: sample.name,
    parts: result.parts.map((p) => ({ name: p.name, color: settings.slots[p.slot], mesh: p.mesh })),
  });
  writeFileSync(join(outDir, file), bytes);
  manifest.push({ file, parts: result.parts.length, filaments: new Set(result.parts.map((p) => p.slot)).size });
  console.log(
    `${file}: ${result.parts.length} parts, ${bytes.length} bytes${result.warnings.length ? `, warnings: ${result.warnings.join(' ')}` : ''}`,
  );
}

writeFileSync(join(outDir, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
if (failed) process.exit(1);
