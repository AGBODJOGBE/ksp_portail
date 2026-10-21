import type {
  CtaContent,
  FaqItem,
  MetierHeroContent,
  Offer,
  PageAction,
  PendingContent,
  SectionIntro,
  Step,
} from '@/components/sections/types';

/*
 * Page Recouvrement (phase 1). Textes provisoires (à valider), prêts pour Payload CMS.
 * Parcours P1 de la spécification des fronts. Aucun taux de commission, délai ni chiffre n'est donné :
 * les conditions sont présentées au client avant la signature du mandat.
 */

const depositAction: PageAction = { kind: 'account', label: 'Déposer un dossier' };
const adviceAction: PageAction = {
  kind: 'contact',
  label: 'Demander un conseil',
  subject: 'recouvrement-conseil',
};

export const recouvrementContent = {
  metadata: {
    title: 'Recouvrement de créances',
    description:
      'Confiez vos créances impayées au Groupe KSP : dépôt du dossier en ligne, mandat signé par code, relances, paiement du débiteur par mobile money et suivi en direct dans Mon espace KSP.',
  },
  hero: {
    metierId: 'recouvrement',
    title: 'Récupérez vos impayés, suivez chaque dossier en direct',
    lead: 'Factures clients, sommes prêtées, loyers en retard : confiez votre créance à KSP. Nous relançons votre débiteur, il paie par mobile money, et vous suivez chaque étape depuis votre espace.',
    actions: [depositAction, adviceAction],
    note: 'Le dépôt d’un dossier se fait depuis Mon espace KSP, avec un seul compte pour tous les services du groupe.',
    highlightsTitle: 'Avec KSP Recouvrement',
    highlights: [
      'Dossier et pièces déposés en ligne',
      'Mandat signé par code, sans déplacement',
      'Paiement du débiteur par mobile money',
      'Étapes, paiements et reversements suivis en direct',
    ],
  } satisfies MetierHeroContent,
  offers: {
    intro: {
      eyebrow: 'Nos offres',
      title: 'Une offre pour chaque créancier',
      lead: 'Entreprise, particulier ou bailleur : le parcours est le même, adapté à votre situation.',
    } satisfies SectionIntro,
    items: [
      {
        title: 'Entreprises',
        text: 'Vos factures clients restent impayées ? Confiez-nous vos dossiers et concentrez-vous sur votre activité.',
        points: [
          'Un dossier par créance',
          'Relances et mise en demeure',
          'Suivi de tous vos dossiers au même endroit',
        ],
      },
      {
        title: 'Particuliers',
        text: 'Une somme prêtée ou due qui ne revient pas : KSP prend le relais auprès de votre débiteur.',
        points: [
          'Démarche entièrement en ligne',
          'Échéancier signé par le débiteur',
          'Chaque paiement visible en direct',
        ],
      },
      {
        title: 'Bailleurs',
        text: 'Des loyers en retard : KSP relance votre locataire et organise le règlement de la dette.',
        points: [
          'Relances du locataire',
          'Paiement par mobile money',
          'Reversements suivis dans votre espace',
        ],
      },
    ] satisfies ReadonlyArray<Offer>,
  },
  steps: {
    intro: {
      eyebrow: 'Comment ça marche',
      title: 'Les étapes d’un dossier',
      lead: 'Du dépôt à l’encaissement, vous savez toujours où en est votre dossier et qui agit.',
    } satisfies SectionIntro,
    items: [
      {
        actor: 'client',
        title: 'Vous déposez votre dossier',
        text: 'Connectez-vous à Mon espace KSP et déposez votre dossier avec ses pièces justificatives.',
      },
      {
        actor: 'ksp',
        title: 'KSP analyse et accepte le dossier',
        text: 'Notre équipe étudie le dossier, l’accepte puis le confie à un agent de recouvrement.',
      },
      {
        actor: 'client',
        title: 'Vous signez le mandat',
        text: 'Vous recevez le mandat dans votre espace et le signez en ligne, avec un code de confirmation.',
      },
      {
        actor: 'ksp',
        title: 'L’agent relance votre débiteur',
        text: 'Relances, mise en demeure si nécessaire, puis mise en place d’un échéancier signé par le débiteur.',
      },
      {
        actor: 'tiers',
        actorLabel: 'Votre débiteur',
        title: 'Le débiteur paie par mobile money',
        text: 'Il reçoit un lien par SMS et règle chaque échéance par mobile money.',
      },
      {
        actor: 'ksp',
        title: 'Vous êtes crédité',
        text: 'Chaque somme encaissée vous est reversée, déduction faite de la commission de KSP.',
      },
      {
        actor: 'client',
        title: 'Vous suivez tout en direct',
        text: 'Étapes, actions menées, échéancier, paiements et reversements : tout est visible dans Mon espace KSP.',
      },
    ] satisfies ReadonlyArray<Step>,
  },
  remuneration: {
    eyebrow: 'Rémunération',
    title: 'Une commission sur les sommes recouvrées',
    text: 'KSP se rémunère par une commission prélevée sur les sommes encaissées auprès de votre débiteur. Les conditions vous sont présentées avant la signature du mandat : vous vous engagez en connaissance de cause.',
  },
  advice: {
    eyebrow: 'Conseil',
    title: 'Un avis avant d’agir',
    text: 'Vous hésitez sur la marche à suivre, ou sur les pièces à réunir ? Décrivez-nous votre situation : nos équipes vous orientent avant tout dépôt de dossier.',
    action: adviceAction,
  },
  trainings: {
    eyebrow: 'Formations',
    title: 'Catalogue des formations',
    lead: 'KSP propose des formations au recouvrement. Le catalogue sera publié ici ; en attendant, dites-nous ce qui vous intéresse.',
    pendingTitle: 'Formation à venir',
    pendingText: 'Programme, durée et modalités publiés prochainement.',
    count: 3,
    action: {
      kind: 'contact',
      label: 'Être informé des formations',
      subject: 'recouvrement-formation',
    } satisfies PageAction,
  } satisfies PendingContent & { action: PageAction },
  faq: [
    {
      question: 'Quelles créances pouvez-vous recouvrer ?',
      answer:
        'Factures impayées d’une entreprise, somme due à un particulier, loyers en retard. Décrivez votre situation : nous vous disons si le dossier peut être pris en charge.',
    },
    {
      question: 'Quelles pièces dois-je fournir ?',
      answer:
        'Tout document qui établit la créance et les échanges avec votre débiteur. La liste des pièces attendues vous est indiquée au moment du dépôt du dossier.',
    },
    {
      question: 'Dois-je créer un compte ?',
      answer:
        'Oui, pour déposer un dossier et le suivre. Un seul compte KSP, créé avec votre numéro de téléphone ou votre adresse e-mail, vous donne accès à tous les services du groupe.',
    },
    {
      question: 'Comment se passe la signature du mandat ?',
      answer:
        'Une fois votre dossier accepté, le mandat est mis à votre disposition dans votre espace. Vous le signez en ligne avec un code de confirmation, sans vous déplacer.',
    },
    {
      question: 'Combien coûte le recouvrement ?',
      answer:
        'KSP se rémunère par une commission sur les sommes recouvrées. Les conditions vous sont présentées avant la signature du mandat.',
    },
    {
      question: 'Comment mon débiteur paie-t-il ?',
      answer:
        'Il reçoit un lien par SMS et paie par mobile money, en une fois ou selon l’échéancier qu’il a signé. Chaque paiement apparaît dans votre espace.',
    },
  ] satisfies ReadonlyArray<FaqItem>,
  cta: {
    eyebrow: 'Passer à l’action',
    title: 'Un impayé à régler ?',
    lead: 'Déposez votre dossier en ligne, ou parlez-en d’abord avec nos équipes.',
    actions: [depositAction, adviceAction],
    whatsappMessage: 'Bonjour KSP, je souhaite des informations sur le recouvrement d’une créance.',
  } satisfies CtaContent,
};
