import { metiers } from '@/content/metiers';

export type NavItem = { label: string; href: string };

/** Navigation publique du portail. Les pages arrivent section par section ; les adresses sont fixées ici. */
export const navigation = {
  metiers: metiers.map(({ label, href, id, summary }) => ({ id, label, href, summary })),
  group: [
    { label: 'À propos', href: '/a-propos' },
    { label: 'Réalisations', href: '/realisations' },
    { label: 'Actualités', href: '/actualites' },
    { label: 'Contact', href: '/contact' },
  ] satisfies ReadonlyArray<NavItem>,
  /** Espace client commun à tous les sites. Page « bientôt » tant que les contrats de la gateway ne sont pas prêts. */
  account: { label: 'Mon espace KSP', href: '/mon-espace' } satisfies NavItem,
} as const;
