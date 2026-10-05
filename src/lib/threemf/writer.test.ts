// @vitest-environment jsdom
import { strFromU8, unzipSync } from 'fflate';
import { describe, expect, it } from 'vitest';
import { testAssets } from '../../test/helpers';
import { buildCoaster } from '../coaster/build';
import { defaultSettings } from '../coaster/settings';
import { inspectMesh } from '../mesh/validate';
import { build3mf } from './writer';

const CORE = 'http://schemas.microsoft.com/3dmanufacturing/core/2015/02';
const MATERIAL = 'http://schemas.microsoft.com/3dmanufacturing/material/2015/02';

function coaster3mf() {
  const s = defaultSettings();
  s.slots = ['#ffffff', '#000000', '#c81e1e'];
  s.frameSlot = 2;
  const result = buildCoaster(s, testAssets());
  const bytes = build3mf({
    title: 'Test coaster',
    parts: result.parts.map((p) => ({ name: p.name, color: s.slots[p.slot], mesh: p.mesh })),
  });
  return { result, files: unzipSync(bytes) };
}

describe('build3mf', () => {
  it('writes the required package files', () => {
    const { files } = coaster3mf();
    expect(Object.keys(files).sort()).toEqual(['3D/3dmodel.model', '[Content_Types].xml', '_rels/.rels']);
    expect(strFromU8(files['_rels/.rels'])).toContain('Target="/3D/3dmodel.model"');
  });

  it('writes one colored object per part, assembled into a single build item', () => {
    const { files, result } = coaster3mf();
    const doc = new DOMParser().parseFromString(strFromU8(files['3D/3dmodel.model']), 'application/xml');
    expect(doc.getElementsByTagName('parsererror')).toHaveLength(0);
    expect(doc.documentElement.namespaceURI).toBe(CORE);

    const colors = Array.from(doc.getElementsByTagNameNS(MATERIAL, 'color')).map((c) => c.getAttribute('color'));
    expect(colors).toEqual(['#FFFFFF', '#000000', '#C81E1E']);
    expect(colors.length).toBeLessThanOrEqual(4);

    const objects = Array.from(doc.getElementsByTagNameNS(CORE, 'object'));
    const meshes = objects.filter((o) => o.getElementsByTagNameNS(CORE, 'mesh').length);
    const assemblies = objects.filter((o) => o.getElementsByTagNameNS(CORE, 'components').length);
    expect(meshes).toHaveLength(result.parts.length);
    expect(assemblies).toHaveLength(1);
    for (const m of meshes) expect(Number(m.getAttribute('pindex'))).toBeLessThan(colors.length);

    const items = doc.getElementsByTagNameNS(CORE, 'item');
    expect(items).toHaveLength(1);
    expect(items[0].getAttribute('objectid')).toBe(assemblies[0].getAttribute('id'));
  });

  it('round-trips meshes without losing watertightness', () => {
    const { files } = coaster3mf();
    const doc = new DOMParser().parseFromString(strFromU8(files['3D/3dmodel.model']), 'application/xml');
    for (const mesh of Array.from(doc.getElementsByTagNameNS(CORE, 'mesh'))) {
      const positions = Array.from(mesh.getElementsByTagNameNS(CORE, 'vertex')).flatMap((v) =>
        ['x', 'y', 'z'].map((k) => Number(v.getAttribute(k))),
      );
      const triangles = Array.from(mesh.getElementsByTagNameNS(CORE, 'triangle')).flatMap((t) =>
        ['v1', 'v2', 'v3'].map((k) => Number(t.getAttribute(k))),
      );
      expect(inspectMesh({ positions, triangles }).badEdges).toBe(0);
    }
  });
});
