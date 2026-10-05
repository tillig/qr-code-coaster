import { describe, expect, it } from 'vitest';
import { defaultContent, encodeContent, type ContentType, type QrContent } from './content';

function content<T extends ContentType>(type: T, values: Partial<QrContent[T]>): QrContent {
  const c = defaultContent();
  c.type = type;
  Object.assign(c[type] as object, values);
  return c;
}

describe('encodeContent', () => {
  it('adds https:// to links without a scheme and keeps existing schemes', () => {
    expect(encodeContent(content('link', { url: 'example.com/a' }))).toBe('https://example.com/a');
    expect(encodeContent(content('link', { url: 'http://example.com' }))).toBe('http://example.com');
  });

  it('builds mailto links with encoded fields', () => {
    expect(encodeContent(content('email', { to: 'a@b.com', subject: 'Hi there', body: 'x&y' }))).toBe(
      'mailto:a@b.com?subject=Hi%20there&body=x%26y',
    );
  });

  it('strips phone formatting', () => {
    expect(encodeContent(content('phone', { number: '+1 (555) 123-4567' }))).toBe('tel:+15551234567');
    expect(encodeContent(content('sms', { number: '555 1234', message: 'Hello' }))).toBe('SMSTO:5551234:Hello');
    expect(encodeContent(content('whatsapp', { number: '+1 555 1234', message: 'Hi' }))).toBe(
      'https://wa.me/15551234?text=Hi',
    );
  });

  it('escapes Wi-Fi delimiters and omits the password for open networks', () => {
    expect(encodeContent(content('wifi', { ssid: 'My;Net', password: 'p:a,s"s\\', security: 'WPA' }))).toBe(
      'WIFI:T:WPA;S:My\\;Net;P:p\\:a\\,s\\"s\\\\;;',
    );
    expect(
      encodeContent(content('wifi', { ssid: 'Cafe', password: 'ignored', security: 'nopass', hidden: true })),
    ).toBe('WIFI:T:nopass;S:Cafe;H:true;;');
  });

  it('builds a vCard', () => {
    const text = encodeContent(
      content('vcard', { firstName: 'Ada', lastName: 'Lovelace', organization: 'Engines, Ltd', city: 'London' }),
    );
    expect(text.split('\n')).toEqual([
      'BEGIN:VCARD',
      'VERSION:3.0',
      'N:Lovelace;Ada;;;',
      'FN:Ada Lovelace',
      'ORG:Engines\\, Ltd',
      'ADR;TYPE=WORK:;;;London;;;',
      'END:VCARD',
    ]);
  });

  it('builds a calendar event with floating local times', () => {
    const text = encodeContent(
      content('event', { title: 'Party', start: '2026-10-31T19:00', end: '2026-10-31T23:30' }),
    );
    expect(text.split('\n')).toEqual([
      'BEGIN:VEVENT',
      'SUMMARY:Party',
      'DTSTART:20261031T190000',
      'DTEND:20261031T233000',
      'END:VEVENT',
    ]);
  });

  it('returns an empty string until required fields are filled in', () => {
    for (const type of ['link', 'text', 'email', 'phone', 'sms', 'whatsapp', 'wifi', 'vcard', 'event'] as const) {
      const c = defaultContent();
      c.type = type;
      c.link.url = '';
      expect(encodeContent(c), type).toBe('');
    }
  });
});
