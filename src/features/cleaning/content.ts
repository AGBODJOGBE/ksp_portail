import type {
  CtaContent,
  MetierHeroContent,
  Offer,
  PageAction,
  SectionIntro,
} from '@/components/sections/types';

/*
 * Page Nettoyage et assainissement, pendant la préparation de la nouvelle version du service (v2,
 * ADR-054) : contenu statique seulement, sans zones ni catalogue lus à la gateway. La demande en ligne
 * reviendra avec la v2 ; d'ici là, la page mène au contact. Textes provisoires (à valider), prêts pour
 * Payload CMS.
 */

/** Seule action de la page : la prise de contact, sujet « Nettoyage » présélectionné. */
const contactAction: PageAction = { kind: 'contact', label: 'Nous contacter', subject: 'nettoyage' };

export const nettoyageContent = {
  metadata: {
    title: 'Nettoyage et assainissement',
    description:
      'Bureaux, domicile, fin de chantier, vidange et désinsectisation : le Groupe KSP nettoie et assainit vos locaux. Nouvelle version du service en ligne en préparation : contactez-nous pour votre demande.',
  },
  hero: {
    metierId: 'nettoyage',
    title: 'Des locaux propres et sains, sans y passer vos journées',
    lead: 'Bureaux, domicile, fin de chantier, vidange ou désinsectisation : une seule équipe, pour les particuliers comme pour les entreprises. Décrivez-nous votre besoin, nous vous répondons.',
    status: 'Nouvelle version en préparation',
    actions: [contactAction],
    highlightsTitle: 'Avec KSP Nettoyage',
    highlights: [
      'Particuliers et entreprises',
      'Intervention ponctuelle ou régulière',
      'Une seule équipe pour tous vos locaux',
      'Une réponse de notre équipe à chaque demande',
    ],
  } satisfies MetierHeroContent,
  services: {
    intro: {
      eyebrow: 'Nos prestations',
      title: 'Nos prestations, une seule équipe',
      lead: 'Pour les particuliers comme pour les entreprises, en intervention ponctuelle ou régulière.',
    } satisfies SectionIntro,
    items: [
      {
        title: 'Bureaux',
        text: 'Nettoyage de vos bureaux et espaces de travail, pour accueillir vos équipes et vos clients dans de bonnes conditions.',
      },
      {
        title: 'Domicile',
        text: 'Entretien de votre maison ou de votre appartement, en une fois ou de façon régulière.',
      },
      {
        title: 'Fin de chantier',
        text: 'Remise en état après travaux : poussières, résidus et traces de chantier, avant d’emménager ou de livrer.',
      },
      {
        title: 'Vidange',
        text: 'Vidange de fosses septiques, pour des installations sanitaires qui restent saines.',
      },
      {
        title: 'Désinsectisation',
        text: 'Traitement contre les insectes nuisibles, à domicile comme dans les locaux professionnels.',
      },
    ] satisfies ReadonlyArray<Offer>,
  },
  cta: {
    eyebrow: 'Passer à l’action',
    title: 'Un local à remettre au propre ?',
    lead: 'Décrivez-nous votre besoin : notre équipe vous répond et prépare votre devis.',
    actions: [contactAction],
    whatsappMessage: 'Bonjour KSP, je souhaite des informations sur vos prestations de nettoyage.',
  } satisfies CtaContent,
};
