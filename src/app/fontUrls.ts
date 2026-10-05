import archivoBlack from '@fontsource/archivo-black/files/archivo-black-latin-400-normal.woff?url';
import bebasNeue from '@fontsource/bebas-neue/files/bebas-neue-latin-400-normal.woff?url';
import lobster from '@fontsource/lobster/files/lobster-latin-400-normal.woff?url';
import merriweather from '@fontsource/merriweather/files/merriweather-latin-700-normal.woff?url';
import montserrat from '@fontsource/montserrat/files/montserrat-latin-700-normal.woff?url';
import oswald from '@fontsource/oswald/files/oswald-latin-600-normal.woff?url';
import pacifico from '@fontsource/pacifico/files/pacifico-latin-400-normal.woff?url';
import playfairDisplay from '@fontsource/playfair-display/files/playfair-display-latin-700-normal.woff?url';
import robotoMono from '@fontsource/roboto-mono/files/roboto-mono-latin-700-normal.woff?url';
import robotoSlab from '@fontsource/roboto-slab/files/roboto-slab-latin-700-normal.woff?url';
import type { BUNDLED_FONTS } from '../lib/text/fonts';

/** Bundled font files served alongside the app. Keys must match BUNDLED_FONTS ids. */
export const FONT_URLS: Record<(typeof BUNDLED_FONTS)[number]['id'], string> = {
  montserrat,
  'archivo-black': archivoBlack,
  oswald,
  'bebas-neue': bebasNeue,
  'roboto-slab': robotoSlab,
  merriweather,
  'playfair-display': playfairDisplay,
  'roboto-mono': robotoMono,
  lobster,
  pacifico,
};
