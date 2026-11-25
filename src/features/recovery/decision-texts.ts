import type { BadgeTone } from '@/components/ui/badge';

/*
 * Textes des décisions du créancier (liste, page d'une décision, rubrique « À faire »). Sans zod. Un type
 * ou un état inconnus s'affichent avec un libellé neutre : la gateway peut en ajouter.
 */

type StatusView = { label: string; tone: BadgeTone };

interface KindView {
  /** Titre court (liste, À faire). */
  title: string;
  /** Ce qui est demandé au créancier. */
  lead: string;
  /** Conséquence d'une absence de réponse à l'échéance (`expiresAt`). */
  withoutAnswer: string;
}

const KINDS: Record<string, KindView> = {
  plan_off_scale: {
    title: 'Échéancier hors barème',
    lead: 'Un échéancier sort du barème que vous avez accepté : il ne peut être proposé au débiteur qu’avec votre accord.',
    withoutAnswer: 'l’échéancier est refusé',
  },
  settlement_discount: {
    title: 'Remise pour paiement immédiat',
    lead: 'Le débiteur paierait tout de suite une partie de sa dette si vous renoncez au reste.',
    withoutAnswer: 'la remise est refusée',
  },
  bailiff_escalation: {
    title: 'Passage à l’huissier',
    lead: 'La relance amiable et la mise en demeure n’ont pas suffi. Un huissier propose son devis : pour engager la procédure, acceptez-le et versez la provision.',
    withoutAnswer: 'le dossier est clos, comme abandonné par vous',
  },
  litigation_escalation: {
    title: 'Procédure judiciaire',
    lead: 'Le recouvrement doit passer devant la justice. Un avocat propose son devis : pour engager la procédure, acceptez-le et versez la provision.',
    withoutAnswer: 'le dossier est clos, comme abandonné par vous',
  },
  dispute_response: {
    title: 'Contestation du débiteur',
    lead: 'Le débiteur conteste la créance : le recouvrement est suspendu. Répondez avec vos explications et vos pièces ; le juriste de KSP décide ensuite.',
    withoutAnswer: 'le juriste de KSP décide sans votre réponse',
  },
  stage_skip: {
    title: 'Saut d’étape',
    lead: 'KSP propose de passer directement à une étape plus avancée du recouvrement, sans attendre la fin de l’étape en cours.',
    withoutAnswer: 'le saut d’étape est abandonné',
  },
};

export function decisionKind(kind: string): KindView {
  return (
    KINDS[kind] ?? {
      title: 'Décision',
      lead: 'Une décision vous est demandée sur ce dossier.',
      withoutAnswer: 'KSP poursuit sans votre réponse',
    }
  );
}

const STATUSES: Record<string, StatusView> = {
  pending: { label: 'En attente de votre réponse', tone: 'warning' },
  approved: { label: 'Acceptée', tone: 'success' },
  rejected: { label: 'Refusée', tone: 'neutral' },
  answered: { label: 'Réponse envoyée', tone: 'success' },
  expired: { label: 'Sans réponse dans le délai', tone: 'neutral' },
};

export function decisionStatus(status: string): StatusView {
  return STATUSES[status] ?? { label: 'État inconnu', tone: 'neutral' };
}

const DISPUTE_REASONS: Record<string, string> = {
  already_paid: 'Le débiteur dit avoir déjà payé',
  wrong_amount: 'Le débiteur conteste le montant',
  service_not_rendered: 'Le débiteur dit que la prestation ou la livraison n’a pas eu lieu',
  wrong_person: 'Le débiteur dit ne pas être la bonne personne',
  other: 'Autre motif',
};
export const disputeReason = (reason: string) => DISPUTE_REASONS[reason] ?? 'Autre motif';

const VIOLATIONS: Record<string, string> = {
  duration: 'Durée plus longue que celle de votre barème',
  first_payment: 'Premier versement plus faible que votre minimum',
  installment_minimum: 'Échéances plus petites que votre minimum',
};
export const violationLabel = (violation: string) => VIOLATIONS[violation] ?? 'Hors de votre barème';

const RHYTHMS: Record<string, string> = {
  weekly: 'chaque semaine',
  biweekly: 'toutes les deux semaines',
  monthly: 'chaque mois',
};
export const rhythmLabel = (rhythm: string) => RHYTHMS[rhythm] ?? rhythm;

const PARTNERS: Record<string, string> = { bailiff: 'Huissier', lawyer: 'Avocat' };
export const partnerLabel = (kind: string) => PARTNERS[kind] ?? 'Partenaire';

export const decisionTexts = {
  // Liste.
  listTitle: 'Décisions',
  listLead:
    'Les choix qui vous reviennent pendant le recouvrement : échéancier hors barème, remise, devis d’huissier ou d’avocat, réponse à une contestation, saut d’étape.',
  back: 'Mon recouvrement',
  loading: 'Chargement des décisions…',
  retry: 'Réessayer',
  pendingTitle: 'En attente de votre réponse',
  pendingNone: 'Aucune décision n’attend votre réponse.',
  pastTitle: 'Décisions passées',
  pastNone: 'Aucune décision passée.',
  truncated: 'Les 100 décisions les plus récentes sont affichées.',
  caseNumber: (number: string) => `Dossier ${number}`,
  answerBefore: (date: string) => `Répondre avant le ${date}`,
  withoutAnswer: (date: string, consequence: string) => `Sans réponse avant le ${date}, ${consequence}.`,
  answeredOn: (date: string) => `Répondue le ${date}`,
  closedOn: (date: string) => `Close le ${date}`,
  open: 'Voir et répondre',
  see: 'Voir',

  // Page d'une décision.
  notFound:
    'Cette décision est introuvable. Elle concerne peut-être un autre compte : vérifiez le compte actif, ou retrouvez-la dans la liste des décisions.',
  allDecisions: 'Toutes les décisions',
  caseLink: 'Voir le dossier',
  caseLabel: 'Dossier',
  requestedLabel: 'Demandée le',
  answeredLabel: 'Répondue le',
  deadlineTitle: 'Date limite',
  readOnly:
    'Votre rôle dans cette entreprise permet de consulter cette décision : seuls les administrateurs et les membres peuvent répondre.',
  closedNotice: 'Cette décision est close : elle ne peut plus recevoir de réponse.',
  commentLabel: 'Commentaire (facultatif)',
  commentHint: '2 000 caractères au plus. Il est transmis à votre chargé de dossier.',
  counter: (count: number, max: number) => `${count} / ${max}`,
  approve: 'Accepter',
  reject: 'Refuser',
  confirmReject: 'Confirmer le refus',
  confirmApprove: 'Confirmer l’accord',
  cancel: 'Annuler',
  sending: 'Envoi…',
  approved: 'Votre accord est enregistré.',
  rejected: 'Votre refus est enregistré.',
  answered: 'Votre réponse est envoyée au juriste de KSP.',
  closedRefresh: 'Cette décision vient d’être prise ou a expiré : voici son état actuel.',

  // Échéancier.
  planTitle: 'Échéancier proposé',
  proposedBy: (by: string) =>
    by === 'agent' ? 'Proposé par votre chargé de dossier.' : 'Proposé par le débiteur.',
  renegotiation: 'Il remplace un échéancier précédent qui n’a pas été tenu.',
  firstPayment: 'Premier versement',
  firstDueDate: 'Date du premier versement',
  rhythm: 'Échéances suivantes',
  rhythmText: (count: number, rhythm: string) => `${count} échéance${count > 1 ? 's' : ''}, ${rhythm}`,
  total: 'Total de l’échéancier',
  outOfScale: 'Ce qui sort de votre barème',
  installments: 'Échéances',
  installment: (rank: number) => `Échéance ${rank}`,
  approvePlan:
    'Si vous acceptez, l’échéancier est envoyé à la signature du débiteur. Si vous refusez, KSP poursuit le recouvrement.',

  // Remise.
  settlementTitle: 'Remise proposée',
  payNow: 'Payé tout de suite par le débiteur',
  waived: 'Somme abandonnée',
  discount: 'Remise',
  validUntil: 'Offre valable jusqu’au',
  approveSettlement:
    'Si vous acceptez, l’offre est faite au débiteur : s’il paie la somme convenue avant la date indiquée, vous renoncez au reste.',

  // Devis.
  quoteTitle: 'Devis',
  partner: 'Partenaire',
  quoteLines: 'Détail du devis',
  quoteTotal: 'Total du devis',
  provision: 'Provision à verser maintenant',
  quoteValidUntil: 'Devis valable jusqu’au',
  readQuote: 'Lire le devis',
  approveQuote: (amount: string) =>
    `En acceptant, vous versez une provision de ${amount}, débitée de votre portefeuille : la procédure est alors engagée.`,
  payProvision: 'Accepter le devis et verser la provision',
  rejectQuote: 'Refuser le devis',

  // Contestation.
  disputeTitle: 'Contestation',
  reason: 'Motif',
  debtorText: 'Explication du débiteur',
  debtorFiles: (count: number) =>
    count ? `${count} pièce${count > 1 ? 's' : ''} jointe${count > 1 ? 's' : ''} par le débiteur.` : '',
  disputeOpened: (date: string) => `Contestation ouverte le ${date}.`,
  yourAnswer: 'Votre réponse',
  answerLabel: 'Votre réponse au débiteur',
  answerHint: 'Vos explications, 2 000 caractères au plus. Le juriste de KSP les lit avant de décider.',
  answerRequired: 'Écrivez votre réponse, ou joignez au moins une pièce.',
  filesLegend: 'Pièces (facultatif)',
  filesHint: 'Factures, bons de livraison, échanges… PDF, JPEG, PNG ou WebP, 10 Mo au plus par pièce.',
  sendAnswer: 'Envoyer ma réponse',
  resolution: 'Décision du juriste',

  // Saut d'étape.
  skipTitle: 'Étape actuelle du dossier',
  skipDetailsMissing:
    'L’étape proposée et la raison du saut vous sont précisées par votre chargé de dossier. Contactez-le en cas de doute avant de répondre.',
  approveSkip: 'Si vous acceptez, le dossier passe aussitôt à l’étape proposée.',

  // Rubrique « À faire ».
  todoTitle: (title: string, number: string) => `${title} · dossier ${number}`,
  todoText: (date: string) => `À répondre avant le ${date}`,
  todoAction: 'Répondre',
  contact: 'Contacter KSP',
} as const;
