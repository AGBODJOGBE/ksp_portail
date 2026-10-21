import type {
  CtaContent,
  MetierHeroContent,
  Offer,
  PageAction,
  PendingContent,
  SectionIntro,
  Step,
} from '@/components/sections/types';

/*
 * Page Livraison et courses : présentation en phase 1, commande en ligne en phase 3.
 * Le bouton « Commander une course » est affiché inactif avec une note (à valider).
 * Zones couvertes inconnues : emplacement « à venir ». Textes provisoires (à valider).
 */

const contactAction: PageAction = { kind: 'contact', label: 'Nous contacter', subject: 'livraison' };
const orderAction: PageAction = {
  kind: 'soon',
  label: 'Commander une course',
  note: 'Commande en ligne bientôt disponible',
};

export const livraisonContent = {
  metadata: {
    title: 'Livraison et courses',
    description:
      'Faites livrer un colis ou vos courses par KSP Livraison, et suivez votre livreur. Commande en ligne bientôt disponible.',
  },
  hero: {
    metierId: 'livraison',
    title: 'Vos colis et vos courses, livrés et suivis',
    lead: 'Un colis à faire porter, des courses à faire livrer : KSP Livraison s’en charge, et vous suivez votre livreur jusqu’à la remise.',
    actions: [orderAction, contactAction],
    highlightsTitle: 'Avec KSP Livraison',
    highlights: [
      'Enlèvement et livraison de vos colis',
      'Livraison de vos courses',
      'Suivi du livreur en direct',
      'Preuve de livraison à la remise',
    ],
  } satisfies MetierHeroContent,
  offer: {
    intro: {
      eyebrow: 'Notre offre',
      title: 'Ce que nous livrons',
      lead: 'Pour vous, et pour les commandes passées sur les sites du groupe.',
    } satisfies SectionIntro,
    items: [
      {
        title: 'Colis',
        text: 'Un livreur enlève votre colis et le remet à son destinataire, avec une preuve de livraison.',
      },
      {
        title: 'Courses',
        text: 'Faites livrer vos courses, sans vous déplacer.',
      },
      {
        title: 'Commandes KSP',
        text: 'Les commandes passées sur KSP Shop et KSP Print sont livrées par KSP Livraison.',
      },
    ] satisfies ReadonlyArray<Offer>,
  },
  steps: {
    intro: {
      eyebrow: 'Comment ça marche',
      title: 'Une course, de la commande à la remise',
      lead: 'La commande en ligne arrive prochainement ; voici comment elle se déroulera.',
    } satisfies SectionIntro,
    items: [
      {
        actor: 'client',
        title: 'Vous commandez la course',
        text: 'Vous indiquez le point d’enlèvement et l’adresse de livraison.',
      },
      {
        actor: 'ksp',
        title: 'Un livreur est affecté',
        text: 'KSP confie la course à un livreur disponible.',
      },
      {
        actor: 'ksp',
        title: 'Le livreur enlève et livre',
        text: 'La remise est confirmée par une preuve de livraison.',
      },
      {
        actor: 'client',
        title: 'Vous suivez en direct',
        text: 'Vous suivez le livreur jusqu’à la remise, depuis votre espace.',
      },
    ] satisfies ReadonlyArray<Step>,
  },
  zones: {
    eyebrow: 'Zones couvertes',
    title: 'Où livrons-nous ?',
    lead: 'Les zones de livraison seront publiées ici. En attendant, contactez-nous pour savoir si nous livrons votre adresse.',
    pendingTitle: 'Zones de livraison à venir',
    pendingText: 'La liste des zones couvertes sera publiée prochainement.',
    count: 1,
  } satisfies PendingContent,
  cta: {
    eyebrow: 'Une livraison à prévoir ?',
    title: 'Parlons de votre besoin',
    lead: 'La commande en ligne arrive bientôt. D’ici là, contactez-nous.',
    actions: [contactAction],
    whatsappMessage: 'Bonjour KSP, je souhaite des informations sur la livraison.',
  } satisfies CtaContent,
};
