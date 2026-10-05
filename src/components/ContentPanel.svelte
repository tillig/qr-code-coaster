<script lang="ts">
  import {
    mdiCalendar,
    mdiCardAccountDetails,
    mdiEmail,
    mdiLink,
    mdiMessageText,
    mdiPhone,
    mdiTextBox,
    mdiWhatsapp,
    mdiWifi,
  } from '@mdi/js';
  import { settings } from '../app/state.svelte';
  import type { ContentType } from '../lib/qr/content';
  import Panel from './Panel.svelte';

  const TYPES: { id: ContentType; label: string; icon: string }[] = [
    { id: 'link', label: 'Link', icon: mdiLink },
    { id: 'text', label: 'Text', icon: mdiTextBox },
    { id: 'email', label: 'Email', icon: mdiEmail },
    { id: 'phone', label: 'Call', icon: mdiPhone },
    { id: 'sms', label: 'SMS', icon: mdiMessageText },
    { id: 'whatsapp', label: 'WhatsApp', icon: mdiWhatsapp },
    { id: 'wifi', label: 'Wi-Fi', icon: mdiWifi },
    { id: 'vcard', label: 'Contact', icon: mdiCardAccountDetails },
    { id: 'event', label: 'Event', icon: mdiCalendar },
  ];

  const c = settings.content;
  let showPassword = $state(false);
</script>

<Panel title="1. QR code content">
  <div class="types" role="tablist" aria-label="QR code type">
    {#each TYPES as type (type.id)}
      <button type="button" role="tab" aria-selected={c.type === type.id} onclick={() => (c.type = type.id)}>
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d={type.icon} /></svg>
        {type.label}
      </button>
    {/each}
  </div>

  {#if c.type === 'link'}
    <label>Website address <input type="url" placeholder="https://" bind:value={c.link.url} /></label>
  {:else if c.type === 'text'}
    <label>Text <textarea bind:value={c.text.text}></textarea></label>
  {:else if c.type === 'email'}
    <label>Send to <input type="email" bind:value={c.email.to} /></label>
    <label>Subject <input type="text" bind:value={c.email.subject} /></label>
    <label>Message <textarea bind:value={c.email.body}></textarea></label>
  {:else if c.type === 'phone'}
    <label>Phone number <input type="tel" placeholder="+1 555 123 4567" bind:value={c.phone.number} /></label>
  {:else if c.type === 'sms'}
    <label>Phone number <input type="tel" bind:value={c.sms.number} /></label>
    <label>Message <textarea bind:value={c.sms.message}></textarea></label>
  {:else if c.type === 'whatsapp'}
    <label>
      Phone number, with country code
      <input type="tel" placeholder="+1 555 123 4567" bind:value={c.whatsapp.number} />
    </label>
    <label>Message <textarea bind:value={c.whatsapp.message}></textarea></label>
  {:else if c.type === 'wifi'}
    <label>Network name (SSID) <input type="text" autocomplete="off" bind:value={c.wifi.ssid} /></label>
    <div class="row">
      <label>
        Security
        <select bind:value={c.wifi.security}>
          <option value="WPA">WPA/WPA2/WPA3</option>
          <option value="WEP">WEP</option>
          <option value="nopass">None</option>
        </select>
      </label>
      {#if c.wifi.security !== 'nopass'}
        <label>
          Password
          <input
            type={showPassword ? 'text' : 'password'}
            autocomplete="off"
            spellcheck="false"
            bind:value={c.wifi.password}
          />
        </label>
      {/if}
    </div>
    <div class="row">
      {#if c.wifi.security !== 'nopass'}
        <label class="inline"><input type="checkbox" bind:checked={showPassword} /> Show password</label>
      {/if}
      <label class="inline"><input type="checkbox" bind:checked={c.wifi.hidden} /> Hidden network</label>
    </div>
    <p class="hint">Your Wi-Fi password stays on this device. It goes only into the file you download.</p>
  {:else if c.type === 'vcard'}
    <div class="row">
      <label>First name <input type="text" bind:value={c.vcard.firstName} /></label>
      <label>Last name <input type="text" bind:value={c.vcard.lastName} /></label>
    </div>
    <div class="row">
      <label>Organization <input type="text" bind:value={c.vcard.organization} /></label>
      <label>Job title <input type="text" bind:value={c.vcard.title} /></label>
    </div>
    <div class="row">
      <label>Phone <input type="tel" bind:value={c.vcard.phone} /></label>
      <label>Mobile <input type="tel" bind:value={c.vcard.mobile} /></label>
    </div>
    <div class="row">
      <label>Email <input type="email" bind:value={c.vcard.email} /></label>
      <label>Website <input type="url" bind:value={c.vcard.website} /></label>
    </div>
    <label>Street <input type="text" bind:value={c.vcard.street} /></label>
    <div class="row">
      <label>City <input type="text" bind:value={c.vcard.city} /></label>
      <label>State or region <input type="text" bind:value={c.vcard.region} /></label>
    </div>
    <div class="row">
      <label>Postal code <input type="text" bind:value={c.vcard.postalCode} /></label>
      <label>Country <input type="text" bind:value={c.vcard.country} /></label>
    </div>
    <p class="hint">Every field you fill in makes the code denser. Keep it short for a coaster.</p>
  {:else if c.type === 'event'}
    <label>Event name <input type="text" bind:value={c.event.title} /></label>
    <div class="row">
      <label>Starts <input type="datetime-local" bind:value={c.event.start} /></label>
      <label>Ends <input type="datetime-local" bind:value={c.event.end} /></label>
    </div>
    <label>Location <input type="text" bind:value={c.event.location} /></label>
    <label>Details <textarea bind:value={c.event.description}></textarea></label>
  {/if}
</Panel>

<style>
  .types {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(6.5rem, 1fr));
    gap: 0.4rem;
  }

  .types button {
    display: flex;
    align-items: center;
    gap: 0.4rem;
    padding: 0.5rem 0.6rem;
    border: 1px solid var(--border);
    border-radius: 8px;
    background: #fff;
    cursor: pointer;
  }

  .types button[aria-selected='true'] {
    border-color: var(--accent);
    background: var(--accent-soft);
    color: var(--accent);
    font-weight: 600;
  }

  .types svg {
    width: 1.2rem;
    height: 1.2rem;
    fill: currentColor;
    flex: none;
  }
</style>
