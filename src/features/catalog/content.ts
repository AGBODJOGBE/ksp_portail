import type {
  CtaContent,
  MetierHeroContent,
  Offer,
  PageAction,
  SectionIntro,
  Step,
} from '@/components/sections/types';

/*
 * Page Marketplace : présentation en phase 1, ouverture en phase 4 sur KSP Shop (shop.ksp.bj).
 * Aucun taux de commission ni nombre de vendeurs ou de produits. Textes provisoires (à valider).
 */

const shopAction: PageAction = { kind: 'site', label: 'Découvrir KSP Shop', site: 'shop' };
const sellerAction: PageAction = {
  kind: 'contact',
  label: 'Devenir vendeur',
  subject: 'marketplace-vendeur',
};

export const marketplaceContent = {
  metadata: {
    title: 'Marketplace',
    description:
      'Achetez en ligne auprès des vendeurs de la plateforme KSP, ou ouvrez votre boutique : KSP encaisse, livre et reverse aux vendeurs. Ouverture prochaine sur KSP Shop.',
  },
  hero: {
    metierId: 'marketplace',
    status: 'Ouverture prochaine',
    title: 'Acheter et vendre en ligne, sans souci de paiement ni de livraison',
    lead: 'Sur KSP Shop, des vendeurs ouvrent leur boutique et vous achetez chez plusieurs d’entre eux en une seule commande. KSP encaisse, livre, puis reverse aux vendeurs après la livraison.',
    actions: [shopAction, sellerAction],
    note: 'La marketplace ouvrira sur KSP Shop, le site de vente en ligne du groupe.',
    highlightsTitle: 'Avec KSP Shop',
    highlights: [
      'Plusieurs vendeurs dans un seul panier',
      'Paiement par mobile money, carte ou à la livraison',
      'Livraison par KSP et suivi en direct',
      'Vendeurs payés après livraison confirmée',
    ],
  } satisfies MetierHeroContent,
  sides: {
    intro: {
      eyebrow: 'Acheter ou vendre',
      title: 'Une plateforme, deux façons d’en profiter',
    } satisfies SectionIntro,
    items: [
      {
        title: 'Acheter sur KSP',
        text: 'Trouvez vos produits, comparez les vendeurs et commandez en une fois.',
        points: [
          'Recherche et filtres par prix, catégorie et vendeur',
          'Produits de plusieurs vendeurs dans un même panier',
          'Paiement par mobile money, carte ou à la livraison',
          'Suivi de la commande et du livreur en temps réel',
        ],
      },
      {
        title: 'Devenir vendeur',
        text: 'Ouvrez votre boutique en ligne et concentrez-vous sur vos produits.',
        points: [
          'Votre boutique : logo, présentation et produits',
          'KSP encaisse les paiements et livre vos clients',
          'Reversement après livraison confirmée',
          'Commandes et solde suivis dans votre espace vendeur',
        ],
      },
    ] satisfies ReadonlyArray<Offer>,
  },
  sellerSteps: {
    intro: {
      eyebrow: 'Vendre sur KSP',
      title: 'Les étapes pour vendre',
      lead: 'Les inscriptions des vendeurs ouvriront avec la marketplace. Vous pouvez déjà nous faire part de votre intérêt.',
    } satisfies SectionIntro,
    items: [
      {
        actor: 'client',
        title: 'Vous demandez à devenir vendeur',
        text: 'Vous présentez votre activité et vos produits.',
      },
      {
        actor: 'ksp',
        title: 'KSP valide votre boutique',
        text: 'Notre équipe vérifie votre demande avant l’ouverture de la boutique.',
      },
      {
        actor: 'client',
        title: 'Vous publiez vos produits',
        text: 'Photos, descriptions, variantes, prix et stock.',
      },
      {
        actor: 'ksp',
        title: 'KSP encaisse et livre',
        text: 'Le client paie sur KSP Shop ; KSP Livraison lui remet la commande.',
      },
      {
        actor: 'client',
        title: 'Vous êtes payé',
        text: 'Après livraison confirmée, vous demandez le retrait de votre solde.',
      },
    ] satisfies ReadonlyArray<Step>,
  },
  cta: {
    eyebrow: 'Vous vendez des produits ?',
    title: 'Préparez l’ouverture de votre boutique',
    lead: 'Faites-nous part de votre intérêt dès maintenant, avant l’ouverture de la marketplace.',
    actions: [sellerAction, shopAction],
    whatsappMessage: 'Bonjour KSP, je souhaite des informations sur la marketplace.',
  } satisfies CtaContent,
};
