import { metiers } from './metiers';

export type NavItem = { label: string; href: string };

/**
 * Sujets de contact proposés par les pages métiers (`/contact?sujet=…`). La page Contact (section « Pages
 * groupe ») s'en servira pour présélectionner l'objet de la demande. Liste provisoire, à valider.
 */
export const contactSubjects = {
  'recouvrement-conseil': 'Recouvrement — demande de conseil',
  'recouvrement-formation': 'Recouvrement — formations',
  'nettoyage-devis': 'Nettoyage et assainissement — demande de devis',
  'immobilier-rendez-vous': 'Immobilier clés en main — rendez-vous',
  livraison: 'Livraison et courses',
  'impression-devis': 'Impression — devis sur mesure',
  'marketplace-vendeur': 'Marketplace — devenir vendeur',
} as const satisfies Record<string, string>;

export type ContactSubject = keyof typeof contactSubjects;

const CONTACT_HREF = '/contact';

/** Adresse de la page Contact, avec le sujet présélectionné. */
export function contactHref(subject?: ContactSubject): string {
  return subject ? `${CONTACT_HREF}?sujet=${subject}` : CONTACT_HREF;
}

/** Navigation publique du portail. Les pages arrivent section par section ; les adresses sont fixées ici. */
export const navigation = {
  metiers: metiers.map(({ label, href, id, summary }) => ({ id, label, href, summary })),
  group: [
    { label: 'À propos', href: '/a-propos' },
    { label: 'Réalisations', href: '/realisations' },
    { label: 'Actualités', href: '/actualites' },
    { label: 'Contact', href: CONTACT_HREF },
  ] satisfies ReadonlyArray<NavItem>,
  /** Espace client commun à tous les sites. Page « bientôt » tant que les contrats de la gateway ne sont pas prêts. */
  account: { label: 'Mon espace KSP', href: '/mon-espace' } satisfies NavItem,
} as const;
