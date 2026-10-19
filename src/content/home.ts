import type { MetierId } from './metiers';

/*
 * Contenus de l'accueil. Textes provisoires (à valider), prêts à être remplacés par Payload CMS.
 * Règle de confiance : aucun chiffre, aucune réalisation ni aucun témoignage n'est inventé.
 * Tant que les listes ci-dessous sont vides, l'accueil affiche des emplacements « à venir ».
 */

export type KeyFigure = {
  /** Valeur entière, formatée à l'affichage (séparateur de milliers). */
  value: number;
  /** Suffixe éventuel (« ans », « % »…). */
  unit?: string;
  label: string;
};

export type Realisation = {
  id: string;
  title: string;
  metierId: MetierId;
  place?: string;
  /** Catégorie servant de filtre dans les galeries (type de projet, secteur…), fournie par le CMS. */
  category?: string;
  href: string;
  image: { src: string; alt: string; width: number; height: number };
};

export type Testimonial = {
  id: string;
  quote: string;
  author: string;
  /** Fonction ou ville, avec l'accord de la personne. */
  context?: string;
  metierId: MetierId;
};

export const homeContent = {
  hero: {
    eyebrow: 'Groupe KSP',
    title: 'Vos services du quotidien,',
    titleAccent: 'réunis par un seul groupe',
    lead: 'Recouvrement, immobilier clés en main, nettoyage, impression, marketplace et livraison : le Groupe KSP vous accompagne, avec un seul compte pour tous ses services.',
    primaryAction: { label: 'Découvrir nos métiers', href: '#metiers' },
    secondaryAction: { label: 'Nous contacter', href: '/contact' },
    panelTitle: 'Un seul compte pour tous les services KSP',
    panelText: 'Dossiers, commandes, factures et paiements, réunis au même endroit.',
  },
  metiers: {
    eyebrow: 'Nos métiers',
    title: 'Six métiers, un seul groupe',
    lead: 'Choisissez un service : chaque métier a son équipe, et un seul compte vous suit partout.',
  },
  keyFigures: {
    eyebrow: 'Le groupe en chiffres',
    title: 'Chiffres clés',
    pending: 'Les chiffres clés du groupe seront publiés ici dès qu’ils seront validés.',
    items: [] as ReadonlyArray<KeyFigure>,
  },
  realisations: {
    eyebrow: 'Réalisations',
    title: 'Nos réalisations récentes',
    pending: 'Nos chantiers et prestations récents seront présentés ici, photos à l’appui.',
    allLabel: 'Toutes nos réalisations',
    allHref: '/realisations',
    items: [] as ReadonlyArray<Realisation>,
  },
  testimonials: {
    eyebrow: 'Témoignages',
    title: 'La parole à nos clients',
    pending: 'Les témoignages de nos clients seront publiés ici, avec leur accord.',
    items: [] as ReadonlyArray<Testimonial>,
  },
  closing: {
    eyebrow: 'Un projet, une question ?',
    title: 'Parlons de votre besoin',
    lead: 'Décrivez-nous votre situation : nous vous orientons vers le bon service.',
    primaryAction: { label: 'Nous contacter', href: '/contact' },
  },
};

export type HomeContent = typeof homeContent;
