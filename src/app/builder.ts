import type { CoasterSettings } from '../lib/coaster/settings';
import type { LogoArt } from '../lib/logo/art';
import type { WorkerRequest, WorkerResponse } from './protocol';

type Built = Extract<WorkerResponse, { type: 'built' }>;

const worker = new Worker(new URL('./builder.worker.ts', import.meta.url), { type: 'module' });
const waiting = new Map<number, { resolve: (r: WorkerResponse) => void }>();
const fontErrors = new Set<(id: string, message: string) => void>();
let nextId = 1;

worker.onmessage = (event: MessageEvent<WorkerResponse>) => {
  const message = event.data;
  if (message.type === 'font-error') {
    fontErrors.forEach((listener) => listener(message.id, message.message));
    return;
  }
  waiting.get(message.id)?.resolve(message);
  waiting.delete(message.id);
};

function request(make: (id: number) => WorkerRequest): Promise<WorkerResponse> {
  const id = nextId++;
  return new Promise((resolve) => {
    waiting.set(id, { resolve });
    worker.postMessage(make(id));
  });
}

export async function buildPreview(settings: CoasterSettings, upload: LogoArt | null): Promise<Built> {
  const response = await request((id) => ({ type: 'build', id, settings, upload }));
  if (response.type === 'error') throw new Error(response.message);
  return response as Built;
}

export async function export3mf(settings: CoasterSettings, upload: LogoArt | null, title: string): Promise<Uint8Array> {
  const response = await request((id) => ({ type: 'export', id, settings, upload, title }));
  if (response.type === 'error') throw new Error(response.message);
  return (response as Extract<WorkerResponse, { type: 'exported' }>).bytes;
}

export function addFont(id: string, buffer: ArrayBuffer) {
  worker.postMessage({ type: 'font', id, buffer } satisfies WorkerRequest, [buffer]);
}

export function onFontError(listener: (id: string, message: string) => void) {
  fontErrors.add(listener);
  return () => fontErrors.delete(listener);
}
