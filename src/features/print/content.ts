import type { Realisation } from '@/components/sections/types';
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
 * Page Impression : présentation en phase 1, commande en ligne en phase 3 sur KSP Print (print.ksp.bj).
 * Gammes et techniques reprises de la spécification des fronts (liste définitive à valider avec l'équipe
 * Impression). Aucun prix, délai ni réalisation inventé. Textes provisoires (à valider).
 */

const printAction: PageAction = { kind: 'site', label: 'Découvrir KSP Print', site: 'print' };
const quoteAction: PageAction = { kind: 'contact', label: 'Demander un devis', subject: 'impression-devis' };

export const impressionContent = {
  metadata: {
    title: 'Impression',
    description:
      'Papeterie, grand format, textile et objets publicitaires : l’impression du Groupe KSP, pour les particuliers comme pour les entreprises. Commande en ligne sur KSP Print.',
  },
  hero: {
    metierId: 'impression',
    status: 'Commande en ligne bientôt disponible',
    title: 'Vos supports imprimés, de la carte de visite à la bâche',
    lead: 'Papeterie, grand format, textile et objets publicitaires : configurez votre produit, envoyez ou créez votre visuel, et notre équipe le vérifie avant l’impression.',
    actions: [printAction, quoteAction],
    note: 'La commande en ligne se fera sur KSP Print, le site d’impression du groupe.',
    highlightsTitle: 'Avec KSP Print',
    highlights: [
      'Quatre gammes de produits',
      'Votre fichier, ou un visuel créé à partir d’un modèle',
      'Bon à tirer vérifié avant production',
      'Retrait en boutique ou livraison',
    ],
  } satisfies MetierHeroContent,
  ranges: {
    intro: {
      eyebrow: 'Nos gammes',
      title: 'Quatre gammes de produits',
      lead: 'Pour vos événements, votre entreprise, votre école ou votre commerce.',
    } satisfies SectionIntro,
    items: [
      {
        title: 'Papeterie',
        text: 'Les supports du quotidien de votre communication.',
        points: ['Cartes de visite', 'Flyers', 'Dépliants'],
      },
      {
        title: 'Grand format',
        text: 'Pour être vu de loin, en intérieur comme en extérieur.',
        points: ['Affiches', 'Kakémonos', 'Bâches'],
      },
      {
        title: 'Textile',
        text: 'Vos couleurs portées par vos équipes et vos invités.',
        points: ['T-shirts', 'Casquettes'],
      },
      {
        title: 'Objets publicitaires',
        text: 'Des objets utiles qui gardent votre nom en tête.',
        points: ['Mugs', 'Stylos'],
      },
    ] satisfies ReadonlyArray<Offer>,
  },
  techniques: {
    intro: {
      eyebrow: 'Nos techniques',
      title: 'La bonne technique pour chaque support',
      lead: 'Le choix dépend du support, de la quantité et du rendu souhaité.',
    } satisfies SectionIntro,
    items: [
      {
        title: 'Impression numérique',
        text: 'Pour les petites et moyennes séries, avec un rendu fidèle des couleurs.',
      },
      { title: 'Sérigraphie', text: 'Encre déposée à travers un écran, pour les textiles et les objets.' },
      { title: 'Broderie', text: 'Votre logo cousu sur le textile, pour une finition durable.' },
      { title: 'DTF', text: 'Transfert d’un film imprimé sur le textile, pour les visuels détaillés.' },
    ] satisfies ReadonlyArray<Offer>,
  },
  steps: {
    intro: {
      eyebrow: 'Comment commander',
      title: 'De la configuration à l’impression',
      lead: 'La commande en ligne ouvrira sur KSP Print ; voici comment elle se déroulera.',
    } satisfies SectionIntro,
    items: [
      {
        actor: 'client',
        title: 'Vous configurez votre produit',
        text: 'Format, papier ou matière, finitions, technique et quantité.',
      },
      {
        actor: 'client',
        title: 'Vous fournissez votre visuel',
        text: 'Envoyez votre fichier, ou créez votre visuel à partir d’un modèle.',
      },
      {
        actor: 'client',
        title: 'Vous payez la commande',
        text: 'Le paiement se fait en ligne, au moment de la commande.',
      },
      {
        actor: 'ksp',
        title: 'Notre équipe valide avant production',
        text: 'Le bon à tirer est vérifié par notre prépresse avant l’impression, puis votre commande est produite.',
      },
    ] satisfies ReadonlyArray<Step>,
  },
  realisations: {
    eyebrow: 'Réalisations',
    title: 'Nos impressions',
    lead: 'Nos réalisations seront présentées ici, par secteur : événements, entreprises, écoles, églises, commerces.',
    pendingTitle: 'Réalisation à venir',
    pendingText: 'Photos et description publiées prochainement.',
    count: 3,
  } satisfies PendingContent,
  /** Réalisations réelles uniquement (CMS). Vide : la page affiche des emplacements « à venir ». */
  realisationItems: [] as ReadonlyArray<Realisation>,
  cta: {
    eyebrow: 'Un besoin particulier ?',
    title: 'Grandes quantités, produits spéciaux',
    lead: 'Pour les besoins d’entreprise ou hors catalogue, demandez un devis sur mesure.',
    actions: [quoteAction, printAction],
    whatsappMessage: 'Bonjour KSP, je souhaite des informations sur vos impressions.',
  } satisfies CtaContent,
};
