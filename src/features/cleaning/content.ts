import type { GuidedFormContent } from '@/components/sections/guided-form-types';
import type {
  CtaContent,
  FaqItem,
  MetierHeroContent,
  Offer,
  PageAction,
  SectionIntro,
  Step,
} from '@/components/sections/types';

/*
 * Page Nettoyage et assainissement (phase 1). Textes provisoires (à valider), prêts pour Payload CMS.
 * Parcours P2 de la spécification des fronts.
 *
 * Simulateur branché sur la gateway : les prestations, options et prix viennent du service cleaning
 * (questions dans `texts.ts`, construites par `simulator-steps.ts`), les communes desservies de
 * `GET /cleaning/zones` (lues par le serveur, `getServedZones`). Aucun prix, aucune commune ni aucune
 * règle de calcul ici.
 */

export const SIMULATOR_ID = 'simulateur';

/**
 * Questions fréquentes. La réponse sur les communes cite les zones desservies de la gateway
 * (`zonesSentence`), ou renvoie au simulateur si la page n'a pas pu les lire.
 */
export function nettoyageFaq(zones: string | null): FaqItem[] {
  return [
    {
      question: 'Comment connaître le prix de ma prestation ?',
      answer:
        'Le simulateur vous donne une fourchette indicative à partir de la description de vos locaux. Le prix définitif figure dans le devis établi par KSP, après la visite des lieux.',
    },
    {
      question: 'Pourquoi une visite des lieux avant le devis ?',
      answer:
        'La visite est obligatoire pour toute demande, particulier comme entreprise : les locaux varient beaucoup, et elle permet de préparer un devis qui correspond réellement à vos espaces et à vos contraintes.',
    },
    {
      question: 'Intervenez-vous chez moi ?',
      answer: zones
        ? `KSP Nettoyage intervient aujourd’hui à ${zones}. Pour une autre commune, contactez-nous : nous vous préviendrons dès qu’elle sera desservie.`
        : 'Le simulateur indique les communes où KSP Nettoyage intervient aujourd’hui. Pour une autre commune, contactez-nous : nous vous préviendrons dès qu’elle sera desservie.',
    },
    {
      question: 'Comment réserver et payer ?',
      answer:
        'En acceptant le devis depuis Mon espace KSP, vous choisissez votre créneau. Un particulier choisit aussi sa façon de payer : acompte ou totalité, avant ou après la prestation, en espèces ou par Mobile Money. Une entreprise règle par une facture mensuelle, à retrouver dans « Mes factures ».',
    },
    {
      question: 'Que se passe-t-il en cas d’impayé ?',
      answer:
        'Au-delà du seuil d’impayés fixé par KSP (factures d’une entreprise, ou passages d’un contrat régulier), le service est suspendu : les passages à venir sont annulés, puis reprogrammés dès le règlement. Votre espace vous prévient et indique ce qui reste à régler.',
    },
    {
      question: 'Comment suivre la mission ?',
      answer:
        'Chaque passage apparaît dans votre espace, avec son équipe, son avancement et les règlements enregistrés.',
    },
  ];
}

/** La demande de devis reprend la simulation : elle commence au simulateur. */
const quoteAction: PageAction = { kind: 'link', label: 'Demander un devis', href: `#${SIMULATOR_ID}` };
const bookAction: PageAction = {
  kind: 'link',
  label: 'Mes prestations de nettoyage',
  href: '/mon-espace/nettoyage/demandes',
};

export const nettoyageContent = {
  metadata: {
    title: 'Nettoyage et assainissement',
    description:
      'Bureaux, domicile, fin de chantier, vidange et désinsectisation : décrivez vos locaux, demandez un devis au Groupe KSP et réservez votre prestation en ligne.',
  },
  hero: {
    metierId: 'nettoyage',
    title: 'Des locaux propres et sains, sans y passer vos journées',
    lead: 'Bureaux, domicile, fin de chantier, vidange ou désinsectisation : décrivez vos locaux, recevez un devis, puis réservez et suivez la prestation depuis votre espace.',
    actions: [{ kind: 'link', label: 'Simuler ma prestation', href: `#${SIMULATOR_ID}` }, bookAction],
    highlightsTitle: 'Avec KSP Nettoyage',
    highlights: [
      'Simulation en décrivant vos locaux',
      'Devis envoyé par notre équipe',
      'Visite des lieux avant chaque devis',
      'Réservation et suivi des passages depuis votre espace',
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
  simulator: {
    intro: {
      eyebrow: 'Simulateur',
      title: 'Décrivez votre besoin en quelques questions',
      lead: 'Quelques questions sur vos locaux et la prestation souhaitée, et vous obtenez une fourchette de prix indicative. Sans compte ni donnée personnelle.',
    } satisfies SectionIntro,
    form: {
      id: 'nettoyage',
      label: 'Simulateur de prestation de nettoyage',
      // Étapes construites à partir du catalogue de la gateway (simulator-steps.ts).
      steps: [],
      summaryName: 'Récapitulatif',
      summaryTitle: 'Votre demande',
      summaryHint: 'Vérifiez vos réponses : vous pouvez encore les modifier.',
      result: {
        whatsappIntro: 'Bonjour KSP, je souhaite un devis de nettoyage :',
      },
    } satisfies GuidedFormContent,
  },
  steps: {
    intro: {
      eyebrow: 'Comment ça marche',
      title: 'De la simulation au compte rendu',
      lead: 'Chaque étape se suit depuis Mon espace KSP, dans « Mes prestations de nettoyage ».',
    } satisfies SectionIntro,
    items: [
      {
        actor: 'client',
        title: 'Vous simulez votre prestation',
        text: 'Vous décrivez vos locaux et la prestation souhaitée.',
      },
      {
        actor: 'client',
        title: 'Vous demandez un devis',
        text: 'Une visite des lieux, obligatoire pour tous, précède le devis afin de préparer un prix juste.',
      },
      {
        actor: 'ksp',
        title: 'KSP vous envoie le devis',
        text: 'Vous le recevez dans votre espace, avec le détail de la prestation proposée.',
      },
      {
        actor: 'client',
        title: 'Vous acceptez et réservez',
        text: 'Vous acceptez le devis et choisissez votre créneau ; un particulier choisit aussi sa façon de payer, une entreprise règle par facture mensuelle.',
      },
      {
        actor: 'ksp',
        title: 'Nos agents réalisent la mission',
        text: 'Chaque passage est planifié, puis réalisé avec sa liste de contrôle.',
      },
      {
        actor: 'client',
        title: 'Vous suivez chaque passage',
        text: 'Votre espace montre l’avancement et les règlements ; une entreprise y retrouve ses factures mensuelles.',
      },
    ] satisfies ReadonlyArray<Step>,
    booking: {
      title: 'Devis accepté ?',
      text: 'Choisissez votre créneau depuis Mon espace KSP, et votre façon de payer si vous êtes un particulier.',
      action: bookAction,
    },
  },
  cta: {
    eyebrow: 'Passer à l’action',
    title: 'Un local à remettre au propre ?',
    lead: 'Demandez votre devis, ou réservez si vous l’avez déjà accepté.',
    actions: [quoteAction, bookAction],
    whatsappMessage: 'Bonjour KSP, je souhaite des informations sur vos prestations de nettoyage.',
  } satisfies CtaContent,
};
