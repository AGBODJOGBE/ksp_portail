import type { ContactSubject } from '@/config/navigation';
import type { MetierId } from './metiers';

/*
 * Briques de contenu communes aux six pages métiers, prêtes à être servies par Payload CMS.
 * Règle de confiance : aucun chiffre, tarif, taux, délai, zone, témoignage ni réalisation inventé.
 * Ce qui n'est pas encore connu reste vide : la page affiche alors un emplacement « à venir ».
 */

/**
 * Action proposée par une page (bouton). Le type dit où elle mène, pas son apparence :
 * la première action d'une liste est mise en avant, les suivantes sont secondaires.
 */
export type PageAction =
  /** Page du portail ou ancre (`#simulateur`). */
  | { kind: 'link'; label: string; href: string }
  /** Action qui demande un compte : mène à « Mon espace KSP » (page d'attente pour l'instant). */
  | { kind: 'account'; label: string }
  /** Prise de contact, avec le sujet présélectionné sur la page Contact. */
  | { kind: 'contact'; label: string; subject: ContactSubject }
  /** Autre site de l'écosystème (adresse lue dans la configuration). */
  | { kind: 'site'; label: string; site: 'shop' | 'print' }
  /** Action pas encore ouverte : bouton inactif accompagné d'une note visible. */
  | { kind: 'soon'; label: string; note: string };

export type MetierHeroContent = {
  metierId: MetierId;
  title: string;
  lead: string;
  /** État du service s'il n'est pas encore ouvert (« Ouverture prochaine »). */
  status?: string;
  actions: ReadonlyArray<PageAction>;
  /** Phrase courte sous les boutons. */
  note?: string;
  /** Panneau de droite : ce que le visiteur peut faire avec ce métier. */
  highlightsTitle: string;
  highlights: ReadonlyArray<string>;
};

export type SectionIntro = {
  eyebrow: string;
  title: string;
  lead?: string;
};

/** Qui agit à une étape d'un parcours. */
export type StepActor = 'client' | 'ksp' | 'tiers';

export type Step = {
  title: string;
  text: string;
  actor: StepActor;
  /** Libellé de l'acteur quand « tiers » (ex. « Votre débiteur »). */
  actorLabel?: string;
};

export type Offer = {
  title: string;
  text: string;
  points?: ReadonlyArray<string>;
};

export type FaqItem = { question: string; answer: string };

export type CtaContent = SectionIntro & {
  actions: ReadonlyArray<PageAction>;
  /** Message prérempli du bouton WhatsApp (affiché seulement si le numéro est configuré). */
  whatsappMessage?: string;
};

/** Emplacement de contenu non encore fourni (zones, formations, réalisations…). */
export type PendingContent = SectionIntro & {
  pendingTitle: string;
  pendingText: string;
  /** Nombre d'emplacements « à venir » affichés. */
  count: number;
};
