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
 * Page Nettoyage et assainissement (v2, ADR-054 à 056) : contenus statiques de la vitrine, prêts pour
 * Payload CMS. Aucun prix, délai, zone ni chiffre n'est écrit ici : ils viennent de la gateway (simulateur,
 * demande, devis) ou des conditions générales. Textes provisoires (à valider).
 */

const simulateAction: PageAction = { kind: 'link', label: 'Simuler un prix', href: '#simulateur' };
const requestAction: PageAction = { kind: 'link', label: 'Demander un devis', href: '/nettoyage/demande' };
const contactAction: PageAction = { kind: 'contact', label: 'Nous contacter', subject: 'nettoyage' };

export const nettoyageContent = {
  metadata: {
    title: 'Nettoyage et assainissement',
    description:
      'Bureaux, domicile, fin de chantier, vidange et désinsectisation : estimez le prix en ligne, demandez un devis après une visite des lieux, puis suivez chaque séance depuis Mon espace KSP.',
  },
  hero: {
    metierId: 'nettoyage',
    title: 'Des locaux propres et sains, sans y passer vos journées',
    lead: 'Décrivez votre lieu : une estimation s’affiche aussitôt. Demandez ensuite votre devis en ligne, nous visitons les lieux, puis chaque séance est planifiée et suivie depuis votre espace.',
    actions: [simulateAction, requestAction],
    highlightsTitle: 'Avec KSP Nettoyage',
    highlights: [
      'Particuliers et entreprises',
      'Séance ponctuelle ou programme régulier',
      'Estimation en ligne, devis après visite',
      'Suivi de chaque séance dans Mon espace KSP',
    ],
  } satisfies MetierHeroContent,
  simulator: {
    eyebrow: 'Estimation en ligne',
    title: 'Combien coûtera votre nettoyage ?',
    lead: 'Choisissez votre lieu, les types de nettoyage et répondez à quelques questions. L’estimation se met à jour à chaque réponse.',
  } satisfies SectionIntro,
  steps: {
    intro: {
      eyebrow: 'Comment ça marche',
      title: 'De l’estimation à chaque séance',
      lead: 'Un dossier par lieu : un devis, un programme, et toutes ses séances au même endroit.',
    } satisfies SectionIntro,
    items: [
      {
        title: 'Vous décrivez votre lieu',
        text: 'Type de lieu, types de nettoyage, superficie et quelques précisions : une estimation non contractuelle s’affiche aussitôt.',
        actor: 'client',
      },
      {
        title: 'Vous demandez un devis',
        text: 'Placez votre lieu sur la carte, choisissez votre rythme et proposez vos créneaux de visite. Les frais de visite sont réglés depuis votre portefeuille KSP ou par Mobile Money.',
        actor: 'client',
      },
      {
        title: 'KSP visite les lieux',
        text: 'Un agent confirme sur place ce que vous avez déclaré. Vous voyez ce qui a été retenu, et pourquoi.',
        actor: 'ksp',
      },
      {
        title: 'Vous recevez votre devis',
        text: 'Prix par séance, nombre de séances, total et dates du programme, avec la déduction des frais de visite.',
        actor: 'ksp',
      },
      {
        title: 'Vous acceptez',
        text: 'Vous acceptez les conditions générales et, si vous le souhaitez, choisissez la date de début : toutes les séances sont planifiées.',
        actor: 'client',
      },
      {
        title: 'Chaque séance est suivie',
        text: 'Agents, photos avant et après, paiement après chaque séance depuis votre portefeuille ; pour une entreprise, une facture par mois.',
        actor: 'ksp',
      },
    ] satisfies ReadonlyArray<Step>,
  },
  services: {
    intro: {
      eyebrow: 'Nos prestations',
      title: 'Nos prestations, une seule équipe',
      lead: 'Pour les particuliers comme pour les entreprises, en séance ponctuelle ou en programme régulier.',
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
  faq: [
    {
      question: 'Comment le prix est-il calculé ?',
      answer:
        'Selon votre lieu, les types de nettoyage choisis et vos réponses (superficie, pièces, extérieurs…), d’après le tarif en vigueur. Le simulateur donne une estimation non contractuelle : le prix est confirmé par le devis, après la visite des lieux.',
    },
    {
      question: 'Pourquoi une visite des lieux avant le devis ?',
      answer:
        'Elle permet de confirmer ce que vous avez déclaré. Si un élément diffère, le devis vous montre ce qui a été retenu, le motif et son effet sur le prix. Les frais de visite sont annoncés avant l’envoi de votre demande, et les conditions générales disent quand ils sont remboursés, conservés ou déduits de vos séances.',
    },
    {
      question: 'Intervenez-vous chez moi ?',
      answer:
        'Le simulateur liste les communes desservies. Pour votre demande, la commune est retrouvée à partir de la position de votre lieu sur la carte : vous savez tout de suite si elle est desservie.',
    },
    {
      question: 'Comment payer ?',
      answer:
        'Tout passe par votre portefeuille KSP, que vous rechargez par Mobile Money. Un particulier paie après chaque séance ; une entreprise reçoit une facture par mois pour les séances réalisées.',
    },
    {
      question: 'Puis-je annuler ou déplacer une séance ?',
      answer:
        'Oui, depuis Mon espace KSP, dans les délais prévus par les conditions générales. Une demande de devis peut aussi être annulée tant que le devis n’est pas accepté.',
    },
    {
      question: 'Une entreprise peut-elle commander ?',
      answer:
        'Oui, depuis le compte de l’entreprise dans Mon espace KSP. Les membres préparent les demandes ; un administrateur accepte ou refuse le devis.',
    },
  ] satisfies ReadonlyArray<FaqItem>,
  cta: {
    eyebrow: 'Passer à l’action',
    title: 'Un local à remettre au propre ?',
    lead: 'Estimez le prix en ligne, puis demandez votre devis : notre équipe visite les lieux et vous l’envoie.',
    actions: [requestAction, contactAction],
    whatsappMessage: 'Bonjour KSP, je souhaite des informations sur vos prestations de nettoyage.',
  } satisfies CtaContent,
};
