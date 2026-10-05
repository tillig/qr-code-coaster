import { strToU8, zipSync } from 'fflate';
import type { Mesh } from '../mesh/extrude';

export interface ThreeMfPart {
  name: string;
  /** #rrggbb */
  color: string;
  mesh: Mesh;
}

export interface ThreeMfModel {
  title: string;
  parts: ThreeMfPart[];
}

const CORE_NS = 'http://schemas.microsoft.com/3dmanufacturing/core/2015/02';
// Slicers match the literal "m:" prefix for colors, so it must stay "m".
const MATERIAL_NS = 'http://schemas.microsoft.com/3dmanufacturing/material/2015/02';

const escapeXml = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

// Coordinates come from 1 µm integer geometry, so three decimals are exact.
const coord = (v: number) => String(Number(v.toFixed(3)) || 0);

function meshXml(mesh: Mesh): string {
  const out: string[] = ['<mesh><vertices>'];
  const p = mesh.positions;
  for (let i = 0; i < p.length; i += 3) {
    out.push(`<vertex x="${coord(p[i])}" y="${coord(p[i + 1])}" z="${coord(p[i + 2])}"/>`);
  }
  out.push('</vertices><triangles>');
  const t = mesh.triangles;
  for (let i = 0; i < t.length; i += 3) out.push(`<triangle v1="${t[i]}" v2="${t[i + 1]}" v3="${t[i + 2]}"/>`);
  out.push('</triangles></mesh>');
  return out.join('');
}

/**
 * Builds a standard 3MF package: one object made of one component per part, each part tagged with
 * its display color. Bambu Studio offers to map those colors onto filaments when the file is opened.
 */
export function buildModelXml(model: ThreeMfModel): string {
  const colors = [...new Set(model.parts.map((p) => p.color.toUpperCase()))];
  const colorGroupId = 1;
  const firstPartId = 2;
  const assemblyId = firstPartId + model.parts.length;
  const out: string[] = [
    '<?xml version="1.0" encoding="UTF-8"?>\n',
    `<model unit="millimeter" xml:lang="en-US" xmlns="${CORE_NS}" xmlns:m="${MATERIAL_NS}">\n`,
    `<metadata name="Title">${escapeXml(model.title)}</metadata>\n`,
    '<metadata name="Application">QR Code Coaster</metadata>\n',
    `<metadata name="CreationDate">${new Date().toISOString().slice(0, 10)}</metadata>\n`,
    '<resources>\n',
    `<m:colorgroup id="${colorGroupId}">${colors.map((c) => `<m:color color="${c}"/>`).join('')}</m:colorgroup>\n`,
  ];
  model.parts.forEach((part, i) => {
    const pindex = colors.indexOf(part.color.toUpperCase());
    out.push(
      `<object id="${firstPartId + i}" name="${escapeXml(part.name)}" type="model" pid="${colorGroupId}" pindex="${pindex}">`,
      meshXml(part.mesh),
      '</object>\n',
    );
  });
  out.push(`<object id="${assemblyId}" name="${escapeXml(model.title)}" type="model"><components>`);
  model.parts.forEach((_, i) => out.push(`<component objectid="${firstPartId + i}"/>`));
  out.push('</components></object>\n</resources>\n');
  out.push(`<build><item objectid="${assemblyId}"/></build>\n</model>\n`);
  return out.join('');
}

export function build3mf(model: ThreeMfModel): Uint8Array {
  const contentTypes =
    '<?xml version="1.0" encoding="UTF-8"?>\n' +
    '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">' +
    '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>' +
    '<Default Extension="model" ContentType="application/vnd.ms-package.3dmanufacturing-3dmodel+xml"/>' +
    '</Types>\n';
  const rels =
    '<?xml version="1.0" encoding="UTF-8"?>\n' +
    '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
    '<Relationship Target="/3D/3dmodel.model" Id="rel0" Type="http://schemas.microsoft.com/3dmanufacturing/2013/01/3dmodel"/>' +
    '</Relationships>\n';
  return zipSync(
    {
      '[Content_Types].xml': strToU8(contentTypes),
      '_rels/.rels': strToU8(rels),
      '3D/3dmodel.model': strToU8(buildModelXml(model)),
    },
    { level: 6 },
  );
}
