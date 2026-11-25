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
import { recoveryPaths } from './paths';
import { FEE_RULE } from './texts';

/*
 * Page Recouvrement. Textes provisoires (à valider), prêts pour Payload CMS. Parcours réel du service
 * (ADR-060) : dossier déposé en ligne, mandat signé par code, frais de dossier payés par le portefeuille,
 * examen par KSP, relances du débiteur, sommes créditées au portefeuille. Aucun taux de commission ni
 * montant n'est donné : ils sont calculés par KSP et présentés avant la signature du mandat. Les frais de
 * dossier sont des frais d'étude, jamais remboursés (décision du 25 novembre 2026).
 */

const depositAction: PageAction = { kind: 'link', label: 'Déposer un dossier', href: recoveryPaths.newCase };
const adviceAction: PageAction = {
  kind: 'contact',
  label: 'Demander un conseil',
  subject: 'recouvrement-conseil',
};

export const recouvrementContent = {
  metadata: {
    title: 'Recouvrement de créances',
    description:
      'Confiez vos créances impayées au Groupe KSP : dossier déposé en ligne, mandat signé par code, relances par WhatsApp, SMS ou e-mail, paiement du débiteur par mobile money et sommes créditées à votre portefeuille.',
  },
  hero: {
    metierId: 'recouvrement',
    title: 'Récupérez vos impayés, suivez chaque dossier en direct',
    lead: 'Factures clients, sommes prêtées, ventes ou services impayés : confiez votre créance à KSP. Nous relançons votre débiteur, il paie par mobile money, et les sommes recouvrées sont créditées à votre portefeuille.',
    actions: [depositAction, adviceAction],
    note: 'Le dépôt d’un dossier se fait depuis Mon espace KSP, avec un seul compte pour tous les services du groupe.',
    highlightsTitle: 'Avec KSP Recouvrement',
    highlights: [
      'Dossier et pièces déposés en ligne',
      'Frais et commission connus avant la signature',
      'Mandat signé par code, sans déplacement',
      'Sommes recouvrées créditées à votre portefeuille',
    ],
  } satisfies MetierHeroContent,
  offers: {
    intro: {
      eyebrow: 'Nos offres',
      title: 'Une offre pour chaque créancier',
      lead: 'Entreprise ou particulier : le parcours est le même, adapté à votre débiteur.',
    } satisfies SectionIntro,
    items: [
      {
        title: 'Entreprises',
        text: 'Vos factures clients restent impayées ? Confiez-nous vos dossiers et concentrez-vous sur votre activité.',
        points: [
          'Jusqu’à 200 factures d’un même débiteur par dossier',
          'Relances, puis mise en demeure si nécessaire',
          'Suivi de tous vos dossiers au même endroit',
        ],
      },
      {
        title: 'Particuliers',
        text: 'Une somme prêtée ou due qui ne revient pas : KSP prend le relais auprès de votre débiteur.',
        points: [
          'Démarche entièrement en ligne',
          'Échéancier signé par le débiteur, dans les limites que vous fixez',
          'Chaque paiement visible en direct',
        ],
      },
      {
        title: 'Bailleurs',
        status: 'Bientôt',
        text: 'Des loyers en retard : le recouvrement des loyers impayés arrive avec la gestion locative de KSP.',
        points: [
          'Relances du locataire',
          'Paiement par mobile money',
          'Sommes créditées à votre portefeuille',
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
        text: 'Dans Mon espace KSP : votre débiteur, vos factures ou sommes dues, vos pièces justificatives. Les frais et la commission s’affichent pendant la saisie.',
      },
      {
        actor: 'client',
        title: 'Vous signez le mandat',
        text: 'Le mandat reprend les frais et la commission. Vous le lisez et le signez en ligne, avec un code reçu par WhatsApp, SMS ou e-mail.',
      },
      {
        actor: 'client',
        title: 'Vous payez les frais de dossier',
        text: 'Avec votre portefeuille KSP. Ces frais couvrent l’étude de votre dossier : ils ne sont pas remboursés, quelle que soit la décision.',
      },
      {
        actor: 'ksp',
        title: 'KSP examine votre dossier',
        text: 'Sous 2 jours ouvrés : le dossier est accepté, un complément vous est demandé, ou il est refusé avec son motif.',
      },
      {
        actor: 'ksp',
        title: 'KSP relance votre débiteur',
        text: 'Par WhatsApp, SMS ou e-mail, puis mise en demeure si nécessaire. Le débiteur peut proposer un échéancier dans les limites que vous avez fixées.',
      },
      {
        actor: 'tiers',
        actorLabel: 'Votre débiteur',
        title: 'Le débiteur paie par mobile money',
        text: 'Il reçoit un lien personnel et règle en une fois ou à chaque échéance.',
      },
      {
        actor: 'ksp',
        title: 'Les sommes sont créditées à votre portefeuille',
        text: 'Chaque somme encaissée est créditée à votre portefeuille KSP, commission déduite. Vous la retirez vers votre compte mobile money quand vous le souhaitez.',
      },
      {
        actor: 'client',
        title: 'Vous suivez tout en direct',
        text: 'Étapes, actions menées, échéancier et paiements : tout est visible dans Mon espace KSP.',
      },
    ] satisfies ReadonlyArray<Step>,
  },
  remuneration: {
    eyebrow: 'Rémunération',
    title: 'Des frais d’étude, puis une commission sur les sommes recouvrées',
    text: `Au dépôt, les frais de dossier sont payés avec votre portefeuille KSP. ${FEE_RULE} Ensuite, KSP se rémunère par une commission prélevée sur les sommes encaissées. Frais et commission sont calculés pendant la saisie et figés dans le mandat, avant votre signature.`,
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
        'Factures impayées d’une entreprise, somme prêtée ou due par un particulier, vente ou service non payé, chèque impayé. Les loyers impayés arrivent bientôt, avec la gestion locative.',
    },
    {
      question: 'Quelles pièces dois-je fournir ?',
      answer:
        'Tout document qui établit la créance : factures, contrat, bon de livraison, reconnaissance de dette, échanges écrits avec votre débiteur. Une pièce au moins, vingt au plus, en PDF ou en image.',
    },
    {
      question: 'Dois-je créer un compte ?',
      answer:
        'Oui, pour déposer un dossier et le suivre. Un seul compte KSP, créé avec votre numéro de téléphone, vous donne accès à tous les services du groupe. Une entreprise dépose ses dossiers depuis son compte entreprise.',
    },
    {
      question: 'Comment se passe la signature du mandat ?',
      answer:
        'Après la saisie du dossier, KSP prépare le mandat avec les frais et la commission. Vous le lisez puis le signez en ligne avec un code reçu par WhatsApp, SMS ou e-mail, sans vous déplacer.',
    },
    {
      question: 'Combien coûte le recouvrement ?',
      answer: `Des frais de dossier au dépôt, payés avec votre portefeuille KSP, puis une commission sur les sommes recouvrées. Les deux sont calculés pendant la saisie et figés dans le mandat. ${FEE_RULE}`,
    },
    {
      question: 'Que se passe-t-il si mon dossier est refusé ?',
      answer: `KSP vous indique le motif. ${FEE_RULE}`,
    },
    {
      question: 'Comment mon débiteur paie-t-il ?',
      answer:
        'Il est contacté par WhatsApp, SMS ou e-mail et reçoit un lien personnel pour payer par mobile money, en une fois ou selon l’échéancier qu’il a signé. Chaque paiement apparaît dans votre espace.',
    },
    {
      question: 'Comment suis-je payé ?',
      answer:
        'Chaque somme encaissée est créditée à votre portefeuille KSP, commission déduite. Vous la retirez vers votre compte mobile money depuis Mon espace KSP.',
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
