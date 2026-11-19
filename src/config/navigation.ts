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
  paiement: 'Paiement en ligne — vérification par le support',
  signature: 'Signature d’un document — aide du support',
} as const satisfies Record<string, string>;

export type ContactSubject = keyof typeof contactSubjects;

const CONTACT_HREF = '/contact';

/** Adresse de la page Contact, avec le sujet présélectionné. */
export function contactHref(subject?: ContactSubject): string {
  return subject ? `${CONTACT_HREF}?sujet=${subject}` : CONTACT_HREF;
}

/** Navigation publique du portail. Les pages arrivent section par section ; les adresses sont fixées ici. */
export const navigation = {
  /** Liens principaux de l'en-tête (v3) : tous les services, puis le suivi des demandes dans Mon espace. */
  services: { label: 'Nos services', href: '/services' } satisfies NavItem,
  track: { label: 'Suivre ma demande', href: '/mon-espace/suivi' } satisfies NavItem,
  metiers: metiers.map(({ label, href, id, summary }) => ({ id, label, href, summary })),
  group: [
    { label: 'À propos', href: '/a-propos' },
    { label: 'Réalisations', href: '/realisations' },
    { label: 'Actualités', href: '/actualites' },
    { label: 'Contact', href: CONTACT_HREF },
  ] satisfies ReadonlyArray<NavItem>,
  /** Espace client commun à tous les sites, réservé aux personnes connectées. */
  account: { label: 'Mon espace KSP', href: '/mon-espace' } satisfies NavItem,
  /** Connexion par téléphone ; `?retour=` ramène à la page demandée (chemin interne uniquement). */
  login: { label: 'Se connecter', href: '/connexion' } satisfies NavItem,
  /** Le compte se crée par téléphone sur la même page que la connexion (un code suffit). */
  signup: { label: 'Créer un compte', href: '/connexion' } satisfies NavItem,
} as const;
