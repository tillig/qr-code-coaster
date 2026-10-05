import { describe, expect, it } from 'vitest';
import { testAssets } from '../../test/helpers';
import { buildCoaster } from '../coaster/build';
import { defaultSettings, type CoasterSettings } from '../coaster/settings';
import { findIcon, iconArt } from '../logo/icons';
import { scanCoaster } from './scan';

function scan(change: (s: CoasterSettings) => void) {
  const s = defaultSettings();
  change(s);
  const logo = s.logo.source === 'icon' ? iconArt(findIcon(s.logo.iconId)!) : null;
  return scanCoaster(buildCoaster(s, testAssets(logo)), s.slots);
}

describe('scanCoaster', () => {
  it('reads the encoded content back from the design', () => {
    expect(scan(() => {})).toBe('https://example.com');
  });

  it('reads back non-ASCII content exactly', () => {
    const text = 'Café 👋 漢字\nline two';
    expect(
      scan((s) => {
        s.content.type = 'text';
        s.content.text.text = text;
      }),
    ).toBe(text);
  });

  it('reads light-on-dark designs in their real colors', () => {
    expect(scan((s) => (s.slots = ['#1d3557', '#f1faee']))).toBe('https://example.com');
  });

  it('fails when the colors are too close to tell apart', () => {
    expect(scan((s) => (s.slots = ['#ffffff', '#f2f2f2']))).toBeNull();
  });

  it('fails when the logo hides too much of the code', () => {
    const result = scan((s) => {
      s.content.type = 'vcard';
      Object.assign(s.content.vcard, {
        firstName: 'Ada',
        lastName: 'Lovelace',
        organization: 'Analytical Engines',
        phone: '+1 555 123 4567',
        email: 'ada@example.com',
        website: 'https://example.com/ada',
      });
      s.logo = { ...s.logo, source: 'icon', iconId: 'person', size: 40 };
    });
    expect(result).toBeNull();
  });

  it('returns null when there is no code', () => {
    expect(scan((s) => (s.content.link.url = ''))).toBeNull();
  });
});
