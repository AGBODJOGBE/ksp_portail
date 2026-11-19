import localFont from 'next/font/local';

/**
 * Police des titres (F-019, qui remplace F-014) : une seule police variable, hébergée par le site (aucun
 * appel externe), sous-ensemble latin (français compris), axe des graisses uniquement, 27 Ko.
 * Police retenue : Plus Jakarta Sans.
 */
export const displayFont = localFont({
  src: '../../../node_modules/@fontsource-variable/plus-jakarta-sans/files/plus-jakarta-sans-latin-wght-normal.woff2',
  weight: '200 800',
  style: 'normal',
  display: 'swap',
  variable: '--font-ksp-display',
  fallback: ['system-ui', 'Segoe UI', 'Arial'],
  adjustFontFallback: 'Arial',
});
