import type { MetierId } from '@/config/metiers';
import { siteConfig } from '@/config/site';

/*
 * Contenus de l'accueil (v3, F-020 : présentation des portails d'e-services). Textes provisoires (à
 * valider), prêts à être remplacés par Payload CMS. Règle de confiance : aucun chiffre, aucune
 * réalisation ni aucun témoignage n'est inventé ; tant que `keyFigures.items` est vide, l'accueil
 * affiche des emplacements « à venir ».
 */

export type KeyFigure = {
  /** Valeur entière, formatée à l'affichage (séparateur de milliers). */
  value: number;
  /** Suffixe éventuel (« ans », « % »…). */
  unit?: string;
  label: string;
};

/** Diapositive du carrousel « Nouveautés » : un fait réel du portail, avec son lien. */
export type NewsSlide = {
  id: string;
  title: string;
  text: string;
  action: { label: string; href: string };
  illustration: 'cleaning' | 'mobile-money' | 'wallet';
};

/** Carte « Votre besoin » : une situation, le métier qui y répond. */
export type Need = { metierId: MetierId; title: string; text: string; href: string };

export const homeContent = {
  banner: {
    /** Phrase du bandeau d'information. */
    text: 'Nouveau : estimez le prix de votre nettoyage en ligne, puis demandez votre devis.',
    action: { label: 'Simuler un prix', href: '/nettoyage#simulateur' },
    close: 'Fermer le message d’information',
  },
  hero: {
    title: siteConfig.tagline,
    modesLabel: 'Comment souhaitez-vous trouver votre service ?',
    searchMode: 'Rechercher',
    guidedMode: 'Être guidé',
    guidedHref: '#votre-besoin',
    searchLabel: 'Trouver un service',
    searchPlaceholder: 'Trouver un service',
    searchSubmit: 'Rechercher',
    suggestionsLabel: 'Suggestions',
    noSuggestion: 'Aucun service ne correspond. Essayez un autre mot.',
    allResults: 'Voir les {total} services correspondants',
    allResultsOne: 'Voir le service correspondant',
    /** Photo libre de droits (licence Unsplash) : voir docs/credits.md. */
    image: {
      src: '/images/accueil-porto-novo.webp',
      alt: '',
      width: 1920,
      height: 1000,
    },
  },
  news: {
    label: 'Nouveautés sur KSP',
    goTo: (index: number, total: number) => `Nouveauté ${index} sur ${total}`,
    pause: 'Mettre en pause le défilement',
    play: 'Reprendre le défilement',
    slides: [
      {
        id: 'nettoyage',
        title: 'Le Nettoyage fait peau neuve',
        text: 'Estimez le prix en ligne, demandez votre devis après une visite des lieux, puis suivez votre demande depuis Mon espace KSP.',
        action: { label: 'Simuler un prix', href: '/nettoyage#simulateur' },
        illustration: 'cleaning',
      },
      {
        id: 'mobile-money',
        title: 'Payez par Mobile Money',
        text: 'Réglez vos prestations et vos factures en ligne, et retrouvez chaque reçu dans votre espace.',
        action: { label: 'Mes factures et paiements', href: '/mon-espace/paiements' },
        illustration: 'mobile-money',
      },
      {
        id: 'portefeuille',
        title: 'Un portefeuille prépayé',
        text: 'Rechargez votre portefeuille KSP par Mobile Money, puis réglez vos services en un geste.',
        action: { label: 'Mon portefeuille', href: '/mon-espace/portefeuille' },
        illustration: 'wallet',
      },
    ] satisfies ReadonlyArray<NewsSlide>,
  },
  keyFigures: {
    eyebrow: 'Le groupe en chiffres',
    title: 'Chiffres clés',
    pending: 'Les chiffres clés du groupe seront publiés ici dès qu’ils seront validés.',
    items: [] as ReadonlyArray<KeyFigure>,
  },
  needs: {
    eyebrow: 'Votre besoin',
    title: 'Dites-nous ce qu’il vous faut, nous vous orientons.',
    lead: 'Partez de votre situation : chaque carte mène au bon service.',
    all: { label: 'Voir tous nos services', href: '/services' },
    items: [
      {
        metierId: 'nettoyage',
        title: 'Je veux faire nettoyer mes locaux',
        text: 'Bureaux, maison, appartement ou fin de chantier : une seule équipe pour vos locaux.',
        href: '/nettoyage',
      },
      {
        metierId: 'recouvrement',
        title: 'J’ai une créance impayée',
        text: 'Factures, sommes prêtées ou loyers en retard : KSP relance votre débiteur et vous suivez tout.',
        href: '/recouvrement',
      },
      {
        metierId: 'immobilier',
        title: 'Je construis depuis la diaspora',
        text: 'Votre projet au pays, suivi en photos chaque semaine et payé étape par étape.',
        href: '/immobilier',
      },
      {
        metierId: 'impression',
        title: 'Je dois imprimer des supports',
        text: 'Cartes de visite, affiches, bâches, textile ou objets publicitaires.',
        href: '/impression',
      },
      {
        metierId: 'marketplace',
        title: 'Je veux acheter ou vendre en ligne',
        text: 'Achetez auprès de plusieurs vendeurs, ou ouvrez votre boutique sur KSP Shop.',
        href: '/marketplace',
      },
      {
        metierId: 'livraison',
        title: 'Je fais livrer un colis',
        text: 'Un livreur enlève votre colis et le remet à son destinataire, avec une preuve de livraison.',
        href: '/livraison',
      },
    ] satisfies ReadonlyArray<Need>,
  },
  featured: {
    eyebrow: 'E-services',
    title: 'Les services à la une',
    lead: 'Des démarches à faire en ligne, sans vous déplacer.',
    all: { label: 'Voir tous nos services', href: '/services' },
  },
};

export type HomeContent = typeof homeContent;
