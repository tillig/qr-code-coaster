/// <reference lib="webworker" />
import opentype, { type Font } from 'opentype.js';
import { buildCoaster } from '../lib/coaster/build';
import type { CoasterSettings } from '../lib/coaster/settings';
import type { LogoArt } from '../lib/logo/art';
import { findIcon, iconArt } from '../lib/logo/icons';
import { build3mf } from '../lib/threemf/writer';
import { FONT_URLS } from './fontUrls';
import type { WorkerRequest, WorkerResponse } from './protocol';

// Geometry runs here so the page stays responsive. Bundled fonts load from this site; nothing else is fetched.
const scope = self as unknown as DedicatedWorkerGlobalScope;
const fonts = new Map<string, Font>();
const pending = new Map<string, Promise<void>>();
const icons = new Map<string, LogoArt | null>();

const post = (message: WorkerResponse, transfer: Transferable[] = []) => scope.postMessage(message, transfer);

function ensureFont(id: string): Promise<void> {
  if (fonts.has(id)) return Promise.resolve();
  const url = FONT_URLS[id as keyof typeof FONT_URLS];
  if (!url) return Promise.resolve();
  if (!pending.has(id)) {
    pending.set(
      id,
      fetch(url)
        .then((r) => r.arrayBuffer())
        .then((buffer) => void fonts.set(id, opentype.parse(buffer)))
        .catch((e) => post({ type: 'font-error', id, message: String(e) })),
    );
  }
  return pending.get(id)!;
}

function logoFor(settings: CoasterSettings, upload: LogoArt | null): LogoArt | null {
  if (settings.logo.source === 'upload') return upload;
  if (settings.logo.source !== 'icon') return null;
  if (!icons.has(settings.logo.iconId)) {
    const icon = findIcon(settings.logo.iconId);
    icons.set(settings.logo.iconId, icon ? iconArt(icon) : null);
  }
  return icons.get(settings.logo.iconId) ?? null;
}

async function build(settings: CoasterSettings, upload: LogoArt | null) {
  await Promise.all(
    [settings.topText, settings.bottomText].filter((t) => t.text.trim()).map((t) => ensureFont(t.fontId)),
  );
  return buildCoaster(settings, { font: (id) => fonts.get(id), logo: logoFor(settings, upload) });
}

scope.onmessage = async (event: MessageEvent<WorkerRequest>) => {
  const message = event.data;
  try {
    switch (message.type) {
      case 'font':
        fonts.set(message.id, opentype.parse(message.buffer));
        break;
      case 'build': {
        const result = await build(message.settings, message.upload);
        const parts = result.parts.map((p) => ({
          name: p.name,
          slot: p.slot,
          positions: new Float32Array(p.mesh.positions),
          triangles: new Uint32Array(p.mesh.triangles),
        }));
        post(
          {
            type: 'built',
            id: message.id,
            parts,
            warnings: result.warnings,
            qr: result.qr,
            payloadLength: result.payload.length,
          },
          parts.flatMap((p) => [p.positions.buffer, p.triangles.buffer]),
        );
        break;
      }
      case 'export': {
        const result = await build(message.settings, message.upload);
        const bytes = build3mf({
          title: message.title,
          parts: result.parts.map((p) => ({ name: p.name, color: message.settings.slots[p.slot], mesh: p.mesh })),
        });
        post({ type: 'exported', id: message.id, bytes }, [bytes.buffer]);
        break;
      }
    }
  } catch (e) {
    if (message.type === 'font')
      post({ type: 'font-error', id: message.id, message: 'This font file could not be read.' });
    else post({ type: 'error', id: message.id, message: e instanceof Error ? e.message : String(e) });
  }
};
