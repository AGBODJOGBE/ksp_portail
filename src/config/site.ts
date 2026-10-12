import { publicEnv } from './env';

/** Identité du site et liens vers le reste de l'écosystème KSP. */
export const siteConfig = {
  id: 'portail',
  name: 'KSP',
  domain: 'ksp.bj',
  tagline: 'Vos services du quotidien, réunis par un seul groupe',
  description:
    'Recouvrement, immobilier clés en main, nettoyage, marketplace, impression et livraison : le Groupe KSP vous accompagne, avec un seul compte pour tous ses services.',
  url: publicEnv.siteUrl,
  locale: 'fr_BJ',
  ecosystem: [
    { id: 'portail', label: 'KSP', href: publicEnv.portailUrl },
    { id: 'shop', label: 'KSP Shop', href: publicEnv.shopUrl },
    { id: 'print', label: 'KSP Print', href: publicEnv.printUrl },
  ],
  legal: [
    { label: 'Mentions légales', href: '/mentions-legales' },
    { label: 'Conditions générales', href: '/conditions-generales' },
    { label: 'Confidentialité', href: '/confidentialite' },
  ],
} as const;

export type SiteId = 'portail' | 'shop' | 'print';
