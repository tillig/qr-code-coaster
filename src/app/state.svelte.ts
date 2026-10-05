import { defaultSettings } from '../lib/coaster/settings';
import type { LogoArt } from '../lib/logo/art';

/** Everything the user has chosen. It lives only in this page's memory and is never saved or sent anywhere. */
export const settings = $state(defaultSettings());

class Uploads {
  // Raw state: artwork can hold thousands of points that never need fine-grained reactivity.
  logo = $state.raw<LogoArt | null>(null);
  logoName = $state('');
  logoWarnings = $state<string[]>([]);
  fonts = $state<{ id: string; label: string }[]>([]);
}

export const uploads = new Uploads();
