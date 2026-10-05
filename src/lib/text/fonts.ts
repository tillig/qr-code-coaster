/** Bundled fonts: open-licensed Latin faces chosen to print cleanly at small sizes. */
export const BUNDLED_FONTS = [
  { id: 'montserrat', label: 'Montserrat Bold', file: '@fontsource/montserrat/files/montserrat-latin-700-normal.woff' },
  {
    id: 'archivo-black',
    label: 'Archivo Black',
    file: '@fontsource/archivo-black/files/archivo-black-latin-400-normal.woff',
  },
  { id: 'oswald', label: 'Oswald Semibold', file: '@fontsource/oswald/files/oswald-latin-600-normal.woff' },
  { id: 'bebas-neue', label: 'Bebas Neue', file: '@fontsource/bebas-neue/files/bebas-neue-latin-400-normal.woff' },
  {
    id: 'roboto-slab',
    label: 'Roboto Slab Bold',
    file: '@fontsource/roboto-slab/files/roboto-slab-latin-700-normal.woff',
  },
  {
    id: 'merriweather',
    label: 'Merriweather Bold',
    file: '@fontsource/merriweather/files/merriweather-latin-700-normal.woff',
  },
  {
    id: 'playfair-display',
    label: 'Playfair Display Bold',
    file: '@fontsource/playfair-display/files/playfair-display-latin-700-normal.woff',
  },
  {
    id: 'roboto-mono',
    label: 'Roboto Mono Bold',
    file: '@fontsource/roboto-mono/files/roboto-mono-latin-700-normal.woff',
  },
  { id: 'lobster', label: 'Lobster', file: '@fontsource/lobster/files/lobster-latin-400-normal.woff' },
  { id: 'pacifico', label: 'Pacifico', file: '@fontsource/pacifico/files/pacifico-latin-400-normal.woff' },
] as const;

export const DEFAULT_FONT_ID = 'montserrat';
