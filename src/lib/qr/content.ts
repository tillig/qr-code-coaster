export const CONTENT_TYPES = ['link', 'text', 'email', 'phone', 'sms', 'whatsapp', 'wifi', 'vcard', 'event'] as const;
export type ContentType = (typeof CONTENT_TYPES)[number];

export interface QrContent {
  type: ContentType;
  link: { url: string };
  text: { text: string };
  email: { to: string; subject: string; body: string };
  phone: { number: string };
  sms: { number: string; message: string };
  whatsapp: { number: string; message: string };
  wifi: { ssid: string; password: string; security: 'WPA' | 'WEP' | 'nopass'; hidden: boolean };
  vcard: {
    firstName: string;
    lastName: string;
    organization: string;
    title: string;
    phone: string;
    mobile: string;
    email: string;
    website: string;
    street: string;
    city: string;
    region: string;
    postalCode: string;
    country: string;
  };
  event: { title: string; location: string; start: string; end: string; description: string };
}

export function defaultContent(): QrContent {
  return {
    type: 'link',
    link: { url: 'https://example.com' },
    text: { text: '' },
    email: { to: '', subject: '', body: '' },
    phone: { number: '' },
    sms: { number: '', message: '' },
    whatsapp: { number: '', message: '' },
    wifi: { ssid: '', password: '', security: 'WPA', hidden: false },
    vcard: {
      firstName: '',
      lastName: '',
      organization: '',
      title: '',
      phone: '',
      mobile: '',
      email: '',
      website: '',
      street: '',
      city: '',
      region: '',
      postalCode: '',
      country: '',
    },
    event: { title: '', location: '', start: '', end: '', description: '' },
  };
}

const phoneDigits = (value: string) => value.replace(/[^\d+]/g, '');

// Wi-Fi payloads reserve these characters as field delimiters.
const escapeWifi = (value: string) => value.replace(/([\\;,:"])/g, '\\$1');

// vCard and iCalendar share text escaping rules (RFC 6350 and RFC 5545).
const escapeText = (value: string) =>
  value
    .replace(/\\/g, '\\\\')
    .replace(/\n/g, '\\n')
    .replace(/([,;])/g, '\\$1');

function query(params: Record<string, string>): string {
  const pairs = Object.entries(params)
    .filter(([, v]) => v)
    .map(([k, v]) => `${k}=${encodeURIComponent(v)}`);
  return pairs.length ? '?' + pairs.join('&') : '';
}

/** Converts a datetime-local value (2026-10-05T19:30) to an iCalendar floating local time. */
function icalDate(value: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/.exec(value);
  return m ? `${m[1]}${m[2]}${m[3]}T${m[4]}${m[5]}00` : '';
}

/** Produces the string encoded into the QR code. Empty when there is nothing to encode yet. */
export function encodeContent(content: QrContent): string {
  switch (content.type) {
    case 'link': {
      const url = content.link.url.trim();
      if (!url) return '';
      return /^[a-z][a-z\d+.-]*:/i.test(url) ? url : `https://${url}`;
    }
    case 'text':
      return content.text.text;
    case 'email': {
      const { to, subject, body } = content.email;
      if (!to.trim()) return '';
      return `mailto:${to.trim()}${query({ subject, body })}`;
    }
    case 'phone': {
      const number = phoneDigits(content.phone.number);
      return number ? `tel:${number}` : '';
    }
    case 'sms': {
      const number = phoneDigits(content.sms.number);
      if (!number) return '';
      return content.sms.message ? `SMSTO:${number}:${content.sms.message}` : `SMSTO:${number}`;
    }
    case 'whatsapp': {
      const number = phoneDigits(content.whatsapp.number).replace(/^\+/, '');
      if (!number) return '';
      return `https://wa.me/${number}${query({ text: content.whatsapp.message })}`;
    }
    case 'wifi': {
      const { ssid, password, security, hidden } = content.wifi;
      if (!ssid) return '';
      const parts = [`T:${security}`, `S:${escapeWifi(ssid)}`];
      if (security !== 'nopass') parts.push(`P:${escapeWifi(password)}`);
      if (hidden) parts.push('H:true');
      return `WIFI:${parts.join(';')};;`;
    }
    case 'vcard': {
      const v = content.vcard;
      const fullName = [v.firstName, v.lastName].filter(Boolean).join(' ');
      if (!fullName && !v.organization) return '';
      const lines = ['BEGIN:VCARD', 'VERSION:3.0'];
      lines.push(`N:${escapeText(v.lastName)};${escapeText(v.firstName)};;;`);
      lines.push(`FN:${escapeText(fullName || v.organization)}`);
      if (v.organization) lines.push(`ORG:${escapeText(v.organization)}`);
      if (v.title) lines.push(`TITLE:${escapeText(v.title)}`);
      if (v.phone) lines.push(`TEL;TYPE=WORK,VOICE:${phoneDigits(v.phone)}`);
      if (v.mobile) lines.push(`TEL;TYPE=CELL:${phoneDigits(v.mobile)}`);
      if (v.email) lines.push(`EMAIL:${v.email.trim()}`);
      if (v.website) lines.push(`URL:${v.website.trim()}`);
      if (v.street || v.city || v.region || v.postalCode || v.country) {
        const adr = [v.street, v.city, v.region, v.postalCode, v.country].map(escapeText).join(';');
        lines.push(`ADR;TYPE=WORK:;;${adr}`);
      }
      lines.push('END:VCARD');
      return lines.join('\n');
    }
    case 'event': {
      const e = content.event;
      const start = icalDate(e.start);
      if (!e.title || !start) return '';
      const lines = ['BEGIN:VEVENT', `SUMMARY:${escapeText(e.title)}`, `DTSTART:${start}`];
      const end = icalDate(e.end);
      if (end) lines.push(`DTEND:${end}`);
      if (e.location) lines.push(`LOCATION:${escapeText(e.location)}`);
      if (e.description) lines.push(`DESCRIPTION:${escapeText(e.description)}`);
      lines.push('END:VEVENT');
      return lines.join('\n');
    }
  }
}
