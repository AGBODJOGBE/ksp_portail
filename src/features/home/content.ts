import type { Realisation } from '@/components/sections/types';
import type { MetierId } from '@/config/metiers';

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
    /* Atouts vérifiables du portail (aucun chiffre) : affichés sous les boutons. */
    highlights: [
      'Connexion par code WhatsApp, sans mot de passe',
      'Devis et suivi en ligne',
      'Paiement par Mobile Money',
    ],
    /*
     * Aperçu illustré de Mon espace KSP : libellés réels de l'espace, aucune donnée (ni montant, ni date).
     * Purement décoratif : masqué aux lecteurs d'écran, qui lisent `panelTitle` et `panelText`.
     */
    preview: {
      caption: 'Aperçu de Mon espace KSP',
      items: [
        { label: 'Devis à accepter', service: 'Nettoyage', tone: 'action' },
        { label: 'Facture à régler', service: 'Mobile Money', tone: 'accent' },
        { label: 'Dossier en cours', service: 'Recouvrement', tone: 'brand' },
      ],
    },
  },
  metiers: {
    eyebrow: 'Nos métiers',
    title: 'Six métiers, un seul groupe',
    lead: 'Choisissez un service : chaque métier a son équipe, et un seul compte vous suit partout.',
  },
  journey: {
    eyebrow: 'Comment ça marche',
    title: 'Du besoin au service rendu, en quatre étapes',
    lead: 'Le même fil pour tous les métiers : vous faites la demande, KSP s’occupe du reste et vous suivez chaque étape.',
    steps: [
      {
        title: 'Choisissez un service',
        text: 'Nettoyage, recouvrement, immobilier, impression, marketplace ou livraison.',
      },
      {
        title: 'Faites votre demande en ligne',
        text: 'Décrivez votre besoin : devis, dossier ou commande, sans vous déplacer.',
      },
      {
        title: 'Suivez chaque étape',
        text: 'Devis, rendez-vous, passages et factures se retrouvent dans Mon espace KSP.',
      },
      {
        title: 'Réglez en toute simplicité',
        text: 'Paiement par Mobile Money, reçu disponible dans votre espace.',
      },
    ],
  },
  trust: {
    eyebrow: 'Pourquoi KSP',
    title: 'Un groupe, des engagements clairs',
    lead: 'Ce que vous trouvez sur chaque service du groupe, dès aujourd’hui.',
    items: [
      {
        icon: 'user',
        title: 'Un seul compte',
        text: 'Le même numéro de téléphone vous connecte à tous les services KSP, sans mot de passe.',
      },
      {
        icon: 'file',
        title: 'Des conditions claires',
        text: 'Devis, mandat ou contrat : vous validez avant que KSP n’intervienne.',
      },
      {
        icon: 'clock',
        title: 'Un suivi en direct',
        text: 'Chaque demande avance étape par étape, visible depuis votre espace.',
      },
      {
        icon: 'card',
        title: 'Un paiement en ligne',
        text: 'Mobile Money, factures et reçus réunis au même endroit.',
      },
    ],
  },
  zones: {
    eyebrow: 'Zones desservies',
    title: 'Où intervient KSP Nettoyage',
    lead: 'Les communes où nos équipes interviennent aujourd’hui, tenues à jour par le service Nettoyage.',
    action: { label: 'Demander un devis de nettoyage', href: '/nettoyage/demande' },
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
