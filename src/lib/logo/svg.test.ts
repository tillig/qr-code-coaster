// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { area } from '../geometry/shape';
import { ART_SIZE } from './art';
import { parseColor, parseSvg, parseTransform } from './svg';

const svg = (body: string, attrs = 'viewBox="0 0 10 10"') =>
  `<svg xmlns="http://www.w3.org/2000/svg" ${attrs}>${body}</svg>`;
const colorArea = (art: ReturnType<typeof parseSvg>['art'], color: string) =>
  area(art.layers.find((l) => l.color === color)?.shape ?? []);

describe('parseColor', () => {
  it('normalizes the color formats design tools emit', () => {
    expect(parseColor('#ABC')).toBe('#aabbcc');
    expect(parseColor('#112233ff')).toBe('#112233');
    expect(parseColor('rgb(255, 0, 10)')).toBe('#ff000a');
    expect(parseColor('rgb(100%, 50%, 0%)')).toBe('#ff8000');
    expect(parseColor('navy')).toBe('#000080');
    expect(parseColor('bogus')).toBeNull();
  });
});

describe('parseTransform', () => {
  it('composes transforms left to right', () => {
    const [a, b, c, d, e, f] = parseTransform('translate(10 5) scale(2)');
    expect([a, b, c, d, e, f]).toEqual([2, 0, 0, 2, 10, 5]);
  });
});

describe('parseSvg', () => {
  it('scales artwork so its longer side fills the art box', () => {
    const { art } = parseSvg(svg('<rect x="2" y="3" width="4" height="2" fill="#f00"/>'));
    expect(art.width).toBeCloseTo(ART_SIZE, 1);
    expect(art.height).toBeCloseTo(ART_SIZE / 2, 1);
  });

  it('lets later shapes cover earlier ones', () => {
    const { art } = parseSvg(
      svg('<rect width="10" height="10" fill="white"/><rect x="0" y="0" width="5" height="10" fill="black"/>'),
    );
    expect(colorArea(art, '#000000')).toBeCloseTo(colorArea(art, '#ffffff'), 0);
  });

  it('resolves classes, inline styles, inheritance, and currentColor', () => {
    const { art } = parseSvg(
      svg(
        `<style>.a { fill: #00ff00 } #b { fill: blue }</style>
         <g fill="#ff0000" color="#123456">
           <rect width="1" height="1"/>
           <rect class="a" x="2" width="1" height="1"/>
           <rect id="b" x="4" width="1" height="1"/>
           <rect x="6" width="1" height="1" style="fill: currentColor"/>
           <rect x="8" width="1" height="1" fill="none" stroke="#000" stroke-width="0.2"/>
         </g>`,
      ),
    );
    expect(art.layers.map((l) => l.color).sort()).toEqual(['#000000', '#0000ff', '#00ff00', '#123456', '#ff0000']);
  });

  it('applies nested transforms and reuses elements', () => {
    const { art } = parseSvg(
      svg(
        `<defs><rect id="r" width="1" height="1" fill="#000"/></defs>
         <g transform="translate(5 0)"><use href="#r" x="1"/></g>
         <rect width="1" height="1" fill="#000"/>`,
      ),
    );
    // Two unit squares six units apart: the box spans 7 units, so each square is 1/7 of it.
    expect(art.height).toBeCloseTo(ART_SIZE / 7, 1);
  });

  it('honors evenodd fill rules', () => {
    const { art } = parseSvg(svg('<path fill-rule="evenodd" d="M0 0H10V10H0Z M2 2H8V8H2Z" fill="#000"/>'));
    expect(area(art.layers[0].shape)).toBeCloseTo(ART_SIZE * ART_SIZE * 0.64, -1);
  });

  it('replaces gradients with their first color and warns', () => {
    const { art, warnings } = parseSvg(
      svg(
        `<linearGradient id="g"><stop offset="0" stop-color="#336699"/><stop offset="1" stop-color="#fff"/></linearGradient>
         <circle cx="5" cy="5" r="5" fill="url(#g)"/>`,
      ),
    );
    expect(art.layers[0].color).toBe('#336699');
    expect(warnings.join(' ')).toMatch(/Gradients/);
  });

  it('skips hidden content and rejects files without shapes', () => {
    expect(() => parseSvg(svg('<rect width="1" height="1" display="none"/>'))).toThrow(/No filled shapes/);
    expect(() => parseSvg('<html></html>')).toThrow(/not a valid SVG/);
  });
});
