import type { GuidedFormContent } from './guided-form';
import type { Realisation } from './home';
import type {
  CtaContent,
  FaqItem,
  MetierHeroContent,
  Offer,
  PageAction,
  PendingContent,
  SectionIntro,
  Step,
} from './metier-page';

/*
 * Page Immobilier clés en main. Le service ouvre en phase 2 : la page le signale sobrement
 * (« Ouverture prochaine », à valider) sans rien promettre de chiffré. Textes provisoires (à valider).
 * Parcours P3 et cas d'usage UC-POR-08 de la spécification des fronts (type, terrain, budget, plans).
 */

const appointmentAction: PageAction = {
  kind: 'contact',
  label: 'Prendre rendez-vous',
  subject: 'immobilier-rendez-vous',
};

export const QUOTE_ID = 'demande-de-devis';

export const immobilierContent = {
  metadata: {
    title: 'Immobilier clés en main',
    description:
      'Faites construire ou rénover au Bénin, même depuis l’étranger : demande de devis guidée, rendez-vous en visio, photos du chantier chaque semaine et paiement par étape.',
  },
  hero: {
    metierId: 'immobilier',
    status: 'Ouverture prochaine',
    title: 'Construire au Bénin, même à distance, en toute confiance',
    lead: 'Vous vivez à l’étranger ou n’avez pas le temps de suivre un chantier ? KSP mène votre projet de bout en bout : vous voyez l’avancement en photos chaque semaine et vous payez étape par étape.',
    actions: [{ kind: 'link', label: 'Préparer mon projet', href: `#${QUOTE_ID}` }, appointmentAction],
    note: 'Le service ouvre prochainement. Vous pouvez dès maintenant préparer votre projet et nous écrire.',
    highlightsTitle: 'Avec KSP Immobilier',
    highlights: [
      'Demande de devis guidée et rendez-vous en visio',
      'Contrat signé avant le début des travaux',
      'Photos du chantier publiées chaque semaine',
      'Paiement étape par étape, après validation',
    ],
  } satisfies MetierHeroContent,
  diaspora: {
    intro: {
      eyebrow: 'Offre diaspora',
      title: 'Votre projet au pays, suivi depuis l’étranger',
      lead: 'Pas besoin d’être sur place : chaque décision se prend à distance, avec un interlocuteur unique.',
    } satisfies SectionIntro,
    items: [
      {
        title: 'Un projet préparé à distance',
        text: 'Vous décrivez votre projet en ligne, puis nous en parlons ensemble lors d’un rendez-vous en visio.',
      },
      {
        title: 'Un chantier visible chaque semaine',
        text: 'Le conducteur de travaux publie des photos du chantier dans votre espace, chaque semaine.',
      },
      {
        title: 'Des paiements maîtrisés',
        text: 'Vous validez chaque étape terminée avant de payer l’appel de fonds suivant.',
      },
    ] satisfies ReadonlyArray<Offer>,
  },
  steps: {
    intro: {
      eyebrow: 'Comment ça marche',
      title: 'Les étapes d’un projet',
      lead: 'Les étapes 3 et 4 se répètent jusqu’à la fin du chantier : vous gardez la main à chaque palier.',
    } satisfies SectionIntro,
    items: [
      {
        actor: 'client',
        title: 'Vous décrivez votre projet',
        text: 'Vous remplissez la demande de devis guidée, puis prenez rendez-vous en visio avec notre équipe.',
      },
      {
        actor: 'client',
        title: 'Vous acceptez le devis et signez le contrat',
        text: 'Le devis et le contrat sont mis à votre disposition dans Mon espace KSP.',
      },
      {
        actor: 'ksp',
        title: 'Le chantier avance, en photos',
        text: 'Le conducteur de travaux publie des photos chaque semaine et déclare chaque étape terminée.',
      },
      {
        actor: 'client',
        title: 'Vous validez l’étape, puis payez la suivante',
        text: 'Après validation de l’étape, vous réglez l’appel de fonds suivant depuis votre espace.',
      },
    ] satisfies ReadonlyArray<Step>,
  },
  guarantees: [
    {
      eyebrow: 'Garantie',
      title: 'Suivi photo chaque semaine',
      text: 'Où que vous soyez, vous voyez l’avancement réel du chantier : les photos sont publiées dans votre espace par le conducteur de travaux.',
    },
    {
      eyebrow: 'Garantie',
      title: 'Paiement par étape',
      text: 'Vous ne payez l’étape suivante qu’après avoir validé celle qui vient de se terminer.',
    },
  ],
  quote: {
    intro: {
      eyebrow: 'Demande de devis guidée',
      title: 'Décrivez votre projet',
      lead: 'Quelques questions pour préparer notre premier échange. Rien n’est envoyé tant que vous ne nous contactez pas.',
    } satisfies SectionIntro,
    form: {
      id: 'immobilier',
      label: 'Demande de devis guidée pour un projet immobilier',
      steps: [
        {
          kind: 'choice',
          id: 'projet',
          name: 'Projet',
          title: 'Quel est votre projet ?',
          options: [
            { value: 'construction', label: 'Construction neuve' },
            { value: 'renovation', label: 'Rénovation' },
            { value: 'extension', label: 'Extension ou agrandissement' },
            { value: 'autre', label: 'Autre projet' },
          ],
        },
        {
          kind: 'choice',
          id: 'bien',
          name: 'Type de bien',
          title: 'Quel type de bien ?',
          options: [
            { value: 'maison', label: 'Maison ou villa' },
            { value: 'immeuble', label: 'Immeuble ou appartements' },
            { value: 'local', label: 'Local professionnel' },
            { value: 'autre', label: 'Autre' },
          ],
        },
        {
          kind: 'choice',
          id: 'terrain',
          name: 'Terrain',
          title: 'Où en êtes-vous pour le terrain ?',
          options: [
            { value: 'oui', label: 'J’ai déjà un terrain' },
            { value: 'recherche', label: 'Je cherche un terrain' },
            { value: 'sans-objet', label: 'Le bien existe déjà', hint: 'Rénovation ou extension' },
          ],
        },
        {
          kind: 'choice',
          id: 'plans',
          name: 'Plans',
          title: 'Avez-vous déjà des plans ?',
          options: [
            { value: 'oui', label: 'Oui, j’ai des plans' },
            { value: 'esquisse', label: 'J’ai une idée ou une esquisse' },
            { value: 'non', label: 'Pas encore' },
          ],
        },
        {
          kind: 'quantity',
          id: 'budget',
          name: 'Budget',
          title: 'Avez-vous un budget en tête ?',
          hint: 'Une enveloppe approximative nous aide à préparer le rendez-vous. Elle ne vous engage pas.',
          modes: [
            {
              value: 'montant',
              label: 'Oui, environ',
              inputLabel: 'Budget envisagé',
              format: 'xof',
              max: 100_000_000_000,
            },
          ],
          unknownLabel: 'Je ne sais pas encore',
        },
        {
          kind: 'choice',
          id: 'residence',
          name: 'Lieu de résidence',
          title: 'Où vivez-vous actuellement ?',
          hint: 'Pour organiser le rendez-vous en visio à un horaire qui vous convient.',
          options: [
            { value: 'benin', label: 'Au Bénin' },
            { value: 'etranger', label: 'À l’étranger' },
          ],
        },
      ],
      summaryName: 'Récapitulatif',
      summaryTitle: 'Votre projet',
      summaryHint: 'Vérifiez vos réponses : vous pouvez encore les modifier.',
      result: {
        title: 'Demande de devis en ligne : ouverture prochaine',
        text: 'L’envoi de cette demande depuis le site arrive avec l’ouverture du service. En attendant, prenez rendez-vous ou écrivez-nous en reprenant ces informations.',
        actions: [appointmentAction],
        whatsappIntro: 'Bonjour KSP, je prépare un projet immobilier :',
      },
    } satisfies GuidedFormContent,
  },
  realisations: {
    eyebrow: 'Réalisations',
    title: 'Nos chantiers',
    lead: 'Nos réalisations seront présentées ici, photos à l’appui, avec un filtre par type de projet.',
    pendingTitle: 'Réalisation à venir',
    pendingText: 'Photos et description publiées prochainement.',
    count: 3,
  } satisfies PendingContent,
  /** Réalisations réelles uniquement (CMS). Vide : la page affiche des emplacements « à venir ». */
  realisationItems: [] as ReadonlyArray<Realisation>,
  faq: [
    {
      question: 'Quand le service ouvre-t-il ?',
      answer:
        'Le service Immobilier clés en main ouvre prochainement. Vous pouvez dès maintenant préparer votre projet et prendre contact avec nous.',
    },
    {
      question: 'Puis-je suivre mon chantier depuis l’étranger ?',
      answer:
        'Oui. Le conducteur de travaux publie des photos du chantier chaque semaine dans Mon espace KSP, et vous validez chaque étape à distance.',
    },
    {
      question: 'Comment se passent les paiements ?',
      answer:
        'Par étape : quand une étape est terminée, vous la validez, puis vous réglez l’appel de fonds de l’étape suivante depuis votre espace.',
    },
    {
      question: 'Faut-il déjà avoir un terrain ?',
      answer:
        'Précisez votre situation dans la demande de devis, terrain ou non : nous en parlons ensemble lors du rendez-vous.',
    },
    {
      question: 'Comment se déroule le premier rendez-vous ?',
      answer:
        'En visio, à partir des informations de votre demande de devis : type de projet, terrain, plans et budget envisagé.',
    },
  ] satisfies ReadonlyArray<FaqItem>,
  cta: {
    eyebrow: 'Passer à l’action',
    title: 'Un projet de construction ou de rénovation ?',
    lead: 'Préparez-le dès maintenant, puis parlons-en ensemble.',
    actions: [appointmentAction, { kind: 'link', label: 'Préparer mon projet', href: `#${QUOTE_ID}` }],
    whatsappMessage: 'Bonjour KSP, je souhaite des informations sur l’immobilier clés en main.',
  } satisfies CtaContent,
};
