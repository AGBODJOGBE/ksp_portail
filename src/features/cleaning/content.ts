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
 * Simulateur : interface seulement. La liste définitive des critères reste à valider avec l'équipe
 * Nettoyage, et le prix sera calculé par la gateway. Aucun prix ni aucune règle de calcul ici.
 */

const quoteAction: PageAction = { kind: 'contact', label: 'Demander un devis', subject: 'nettoyage-devis' };
const bookAction: PageAction = { kind: 'account', label: 'Réserver un créneau' };

export const SIMULATOR_ID = 'simulateur';

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
    actions: [{ kind: 'link', label: 'Simuler ma prestation', href: `#${SIMULATOR_ID}` }, quoteAction],
    highlightsTitle: 'Avec KSP Nettoyage',
    highlights: [
      'Simulation en décrivant vos locaux',
      'Devis envoyé par notre équipe',
      'Réservation et acompte depuis votre espace',
      'Compte rendu avec photos après la mission',
    ],
  } satisfies MetierHeroContent,
  services: {
    intro: {
      eyebrow: 'Nos prestations',
      title: 'Cinq prestations, une seule équipe',
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
      lead: 'Quelques questions sur vos locaux et la prestation souhaitée. Rien n’est envoyé tant que vous ne nous contactez pas.',
    } satisfies SectionIntro,
    form: {
      id: 'nettoyage',
      label: 'Simulateur de prestation de nettoyage',
      steps: [
        {
          kind: 'choice',
          id: 'prestation',
          name: 'Prestation',
          title: 'Quelle prestation vous intéresse ?',
          options: [
            { value: 'bureaux', label: 'Nettoyage de bureaux' },
            { value: 'domicile', label: 'Nettoyage à domicile' },
            { value: 'fin-de-chantier', label: 'Nettoyage de fin de chantier' },
            { value: 'vidange', label: 'Vidange' },
            { value: 'desinsectisation', label: 'Désinsectisation' },
          ],
        },
        {
          kind: 'choice',
          id: 'locaux',
          name: 'Locaux',
          title: 'Quel type de locaux ?',
          hint: 'Pour les entreprises, une visite technique est prévue avant le devis.',
          options: [
            { value: 'appartement', label: 'Appartement' },
            { value: 'maison', label: 'Maison ou villa' },
            { value: 'bureau', label: 'Bureaux' },
            { value: 'commerce', label: 'Commerce ou local recevant du public' },
            { value: 'entrepot', label: 'Entrepôt ou local technique' },
            { value: 'autre', label: 'Autre' },
          ],
        },
        {
          kind: 'quantity',
          id: 'taille',
          name: 'Taille',
          title: 'Quelle est la taille des locaux ?',
          hint: 'Une valeur approximative suffit. Vous pourrez la préciser avec notre équipe.',
          modes: [
            {
              value: 'surface',
              label: 'Surface',
              inputLabel: 'Surface approximative',
              format: 'number',
              unit: 'm²',
              max: 100000,
            },
            {
              value: 'pieces',
              label: 'Nombre de pièces',
              inputLabel: 'Nombre de pièces',
              format: 'number',
              unit: 'pièces',
              max: 500,
            },
          ],
          unknownLabel: 'Je ne sais pas encore',
        },
        {
          kind: 'choice',
          id: 'frequence',
          name: 'Fréquence',
          title: 'À quelle fréquence ?',
          options: [
            { value: 'ponctuelle', label: 'Une seule fois' },
            { value: 'hebdomadaire', label: 'Chaque semaine' },
            { value: 'mensuelle', label: 'Chaque mois' },
            { value: 'a-definir', label: 'À définir ensemble' },
          ],
        },
      ],
      summaryName: 'Récapitulatif',
      summaryTitle: 'Votre demande',
      summaryHint: 'Vérifiez vos réponses : vous pouvez encore les modifier.',
      result: {
        title: 'Estimation bientôt disponible',
        text: 'Le calcul du prix en ligne arrive prochainement. En attendant, demandez un devis avec ces informations : notre équipe vous répond avec un prix adapté à vos locaux.',
        actions: [quoteAction],
        whatsappIntro: 'Bonjour KSP, je souhaite un devis de nettoyage :',
      },
    } satisfies GuidedFormContent,
  },
  steps: {
    intro: {
      eyebrow: 'Comment ça marche',
      title: 'De la simulation au compte rendu',
      lead: 'Chaque étape se suit depuis Mon espace KSP, jusqu’à la facture.',
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
        text: 'Pour les entreprises, une visite technique est planifiée afin de préparer un devis juste.',
      },
      {
        actor: 'ksp',
        title: 'KSP vous envoie le devis',
        text: 'Vous le recevez dans votre espace, avec le détail de la prestation proposée.',
      },
      {
        actor: 'client',
        title: 'Vous acceptez et réservez',
        text: 'Vous acceptez le devis, payez l’acompte et choisissez votre créneau.',
      },
      {
        actor: 'ksp',
        title: 'Nos agents réalisent la mission',
        text: 'La mission est planifiée puis réalisée, photos à l’appui.',
      },
      {
        actor: 'client',
        title: 'Vous recevez compte rendu et facture',
        text: 'Le compte rendu de la mission et la facture vous sont envoyés dans votre espace.',
      },
    ] satisfies ReadonlyArray<Step>,
    booking: {
      title: 'Devis accepté ?',
      text: 'Réservez votre créneau et payez l’acompte depuis Mon espace KSP.',
      action: bookAction,
    },
  },
  faq: [
    {
      question: 'Comment connaître le prix de ma prestation ?',
      answer:
        'Le simulateur recueille la description de vos locaux ; le calcul du prix en ligne arrive prochainement. En attendant, demandez un devis : notre équipe vous répond avec un prix adapté.',
    },
    {
      question: 'Pourquoi une visite technique pour les entreprises ?',
      answer:
        'Les locaux professionnels varient beaucoup. La visite permet de préparer un devis qui correspond réellement à vos espaces et à vos contraintes.',
    },
    {
      question: 'Intervenez-vous chez moi ?',
      answer:
        'Indiquez votre adresse dans votre demande de devis : nous vous confirmons si nous intervenons dans votre zone.',
    },
    {
      question: 'Comment réserver et payer l’acompte ?',
      answer:
        'Une fois le devis accepté, vous choisissez votre créneau et payez l’acompte depuis Mon espace KSP.',
    },
    {
      question: 'Que se passe-t-il après la mission ?',
      answer:
        'Vous recevez dans votre espace le compte rendu de la mission, avec les photos, ainsi que la facture.',
    },
  ] satisfies ReadonlyArray<FaqItem>,
  cta: {
    eyebrow: 'Passer à l’action',
    title: 'Un local à remettre au propre ?',
    lead: 'Demandez votre devis, ou réservez si vous l’avez déjà accepté.',
    actions: [quoteAction, bookAction],
    whatsappMessage: 'Bonjour KSP, je souhaite des informations sur vos prestations de nettoyage.',
  } satisfies CtaContent,
};
