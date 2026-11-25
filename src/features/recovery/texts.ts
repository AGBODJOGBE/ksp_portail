import type { BadgeTone } from '@/components/ui/badge';

/*
 * Libellés communs du Recouvrement (états, étapes, natures, rôles, canaux), sans zod. Une valeur inconnue
 * du portail s'affiche avec un libellé neutre : la gateway peut en ajouter.
 */

type StatusView = { label: string; tone: BadgeTone };

const CASE_STATUSES: Record<string, StatusView> = {
  draft: { label: 'Brouillon', tone: 'neutral' },
  awaiting_fee: { label: 'Frais à payer', tone: 'warning' },
  under_review: { label: 'En examen', tone: 'brand' },
  info_requested: { label: 'Complément demandé', tone: 'warning' },
  active: { label: 'En cours', tone: 'action' },
  suspended: { label: 'Suspendu', tone: 'warning' },
  closed: { label: 'Clos', tone: 'neutral' },
  rejected: { label: 'Refusé', tone: 'danger' },
};

export function caseStatus(status: string): StatusView {
  return CASE_STATUSES[status] ?? { label: 'État inconnu', tone: 'neutral' };
}

/** États proposés comme filtre, dans l'ordre de la vie d'un dossier ; valeur de l'adresse (`?etat=`). */
export const STATUS_FILTERS: ReadonlyArray<{ value: string; param: string }> = [
  { value: 'draft', param: 'brouillon' },
  { value: 'awaiting_fee', param: 'frais-a-payer' },
  { value: 'under_review', param: 'en-examen' },
  { value: 'info_requested', param: 'complement-demande' },
  { value: 'active', param: 'en-cours' },
  { value: 'suspended', param: 'suspendu' },
  { value: 'closed', param: 'clos' },
  { value: 'rejected', param: 'refuse' },
];

/** Les six étapes d'un dossier accepté (ADR-060), dans l'ordre. */
export const STAGES = ['notice', 'payment_plan', 'amicable', 'formal_notice', 'bailiff', 'litigation'];

const STAGE_LABELS: Record<string, string> = {
  notice: 'Notification',
  payment_plan: 'Échéancier',
  amicable: 'Relance amiable',
  formal_notice: 'Mise en demeure',
  bailiff: 'Huissier',
  litigation: 'Procédure judiciaire',
};

const STAGE_HINTS: Record<string, string> = {
  notice: 'Le débiteur est informé et invité à payer.',
  payment_plan: 'Le débiteur règle selon l’échéancier signé.',
  amicable: 'Relances par WhatsApp, SMS, e-mail ou téléphone.',
  formal_notice: 'Courrier officiel de mise en demeure.',
  bailiff: 'Après votre accord sur le devis.',
  litigation: 'Après votre accord sur le devis.',
};

export const stageLabel = (stage: string | null): string =>
  stage ? (STAGE_LABELS[stage] ?? 'Étape inconnue') : 'Pas encore commencée';
export const stageHint = (stage: string): string => STAGE_HINTS[stage] ?? '';

/** Étapes dans l'adresse (`?etape=`). */
export const STAGE_PARAMS: Record<string, string> = {
  notice: 'notification',
  payment_plan: 'echeancier',
  amicable: 'amiable',
  formal_notice: 'mise-en-demeure',
  bailiff: 'huissier',
  litigation: 'judiciaire',
};

const KIND_LABELS: Record<string, string> = {
  b2b: 'Entreprise débitrice',
  b2c: 'Particulier débiteur',
  rent: 'Loyers impayés',
};
export const kindLabel = (kind: string): string => KIND_LABELS[kind] ?? 'Autre type';

/** Types dans l'adresse (`?type=`). */
export const KIND_PARAMS: Record<string, string> = { b2b: 'entreprise', b2c: 'particulier' };

const NATURE_LABELS: Record<string, string> = {
  unpaid_invoice: 'Factures impayées',
  loan: 'Prêt d’argent',
  acknowledgment_of_debt: 'Reconnaissance de dette',
  bounced_cheque: 'Chèque impayé',
  service: 'Prestation de service',
  sale: 'Vente de biens',
  rent: 'Loyers',
  other: 'Autre créance',
};
export const natureLabel = (nature: string): string => NATURE_LABELS[nature] ?? 'Autre créance';

/** Natures proposées dans l'assistant (`rent` arrive avec la gestion locative). */
export const NATURES = [
  'unpaid_invoice',
  'service',
  'sale',
  'loan',
  'acknowledgment_of_debt',
  'bounced_cheque',
  'other',
];

const ROLE_LABELS: Record<string, string> = {
  main: 'Débiteur principal',
  co_debtor: 'Codébiteur',
  guarantor: 'Garant',
};
export const roleLabel = (role: string): string => ROLE_LABELS[role] ?? 'Débiteur';

export const DEBTOR_KINDS: Record<string, string> = { person: 'Une personne', company: 'Une société' };

const CHANNEL_LABELS: Record<string, string> = {
  phone: 'Appel téléphonique',
  sms: 'SMS',
  whatsapp: 'WhatsApp',
  email: 'E-mail',
  letter: 'Courrier',
  visit: 'Visite',
};
export const channelLabel = (channel: string): string => CHANNEL_LABELS[channel] ?? 'Autre canal';
export const CHANNELS = ['phone', 'sms', 'whatsapp', 'email', 'letter', 'visit'];

const DEADLINE_LABELS: Record<string, string> = {
  notice_response: 'Fin du délai de réponse du débiteur',
  plan_installment: 'Échéance du débiteur',
  amicable_end: 'Fin de la relance amiable',
  formal_notice_end: 'Fin du délai de la mise en demeure',
  creditor_decision: 'Votre décision est attendue',
  dispute_answer: 'Votre réponse à la contestation',
  fee_payment: 'Dossier à finaliser avant',
  info_completion: 'Complément à envoyer avant',
  review: 'Réponse de KSP au plus tard',
  prescription: 'Prescription de la créance',
  promise: 'Paiement promis par le débiteur',
  partner_update: 'Point du partenaire',
};
export const deadlineLabel = (kind: string): string => DEADLINE_LABELS[kind] ?? 'Prochaine échéance';

const JOURNAL_KINDS: Record<string, string> = {
  contact: 'Contact',
  message_sent: 'Message envoyé',
  letter: 'Courrier',
  promise: 'Promesse',
  payment: 'Paiement',
  plan: 'Échéancier',
  decision: 'Décision',
  stage_changed: 'Étape',
  status_changed: 'État du dossier',
  dispute: 'Contestation',
  document: 'Document',
  partner_act: 'Acte du partenaire',
  note: 'Note',
  system: 'Automatique',
};
export const journalKindLabel = (kind: string): string => JOURNAL_KINDS[kind] ?? 'Action';

const SOURCES: Record<string, string> = {
  payment_link: 'Paiement en ligne du débiteur',
  offline_cash: 'Espèces reçues par KSP',
  offline_transfer: 'Virement reçu par KSP',
  partner: 'Encaissé par le partenaire',
  direct_to_creditor: 'Reçu directement par vous',
};
export const sourceLabel = (source: string): string => SOURCES[source] ?? 'Encaissement';

const CLOSURE_REASONS: Record<string, string> = {
  paid: 'Créance entièrement payée',
  settlement_executed: 'Accord de règlement exécuté',
  dispute_upheld: 'Contestation du débiteur reconnue fondée',
  abandoned_by_creditor: 'Dossier arrêté',
  unrecoverable: 'Créance jugée irrécouvrable',
  prescribed: 'Créance prescrite',
};
export const closureLabel = (reason: string): string => CLOSURE_REASONS[reason] ?? 'Dossier clos';

const REJECTION_REASONS: Record<string, string> = {
  prescribed: 'La créance est prescrite.',
  illegal: 'La créance ne peut pas être recouvrée légalement.',
  no_evidence: 'Les pièces ne prouvent pas la créance.',
  debtor_unreachable: 'Le débiteur ne peut pas être joint.',
  other: 'Le dossier ne peut pas être pris en charge.',
  incomplete: 'Le complément demandé n’a pas été envoyé dans le délai.',
};
export const rejectionLabel = (reason: string | null): string | null =>
  reason ? (REJECTION_REASONS[reason] ?? 'Le dossier ne peut pas être pris en charge.') : null;

const DOCUMENT_KINDS: Record<string, string> = {
  evidence: 'Justificatif',
  mandate: 'Mandat',
  payment_plan: 'Échéancier signé',
  formal_notice: 'Mise en demeure',
  notice_delivery_proof: 'Preuve de remise',
  settlement_certificate: 'Attestation de règlement',
  fee_quote: 'Devis',
  legal_act: 'Acte',
  evidence_log: 'Journal de preuve',
  receipt: 'Reçu',
  statement: 'Relevé',
  dispute_evidence: 'Pièce de contestation',
};
export const documentKindLabel = (kind: string): string => DOCUMENT_KINDS[kind] ?? 'Document';

const INSTALLMENT_STATUSES: Record<string, StatusView> = {
  upcoming: { label: 'À venir', tone: 'neutral' },
  due: { label: 'À payer', tone: 'warning' },
  paid: { label: 'Payée', tone: 'success' },
  partial: { label: 'Payée en partie', tone: 'warning' },
  missed: { label: 'Manquée', tone: 'danger' },
};
export const installmentStatus = (status: string): StatusView =>
  INSTALLMENT_STATUSES[status] ?? { label: 'État inconnu', tone: 'neutral' };

/** Frais de dossier, tels que les renvoie recovery (`fee.status`). */
const FEE_STATUSES: Record<string, StatusView> = {
  unpaid: { label: 'À payer', tone: 'warning' },
  paid: { label: 'Payés', tone: 'success' },
  refunded: { label: 'Remboursés', tone: 'neutral' },
};
export const feeStatus = (status: string): StatusView =>
  FEE_STATUSES[status] ?? { label: 'État inconnu', tone: 'neutral' };

/** Règle des frais de dossier (décision du 25 novembre 2026) : frais d'étude, jamais remboursés. */
export const FEE_RULE =
  'Les frais de dossier couvrent l’étude de votre dossier ; ils restent acquis à KSP quelle que soit la décision.';

/** Taux en points de base (1 000 = 10 %) → « 10 % » ; « 12,5 % ». */
export function formatRate(bps: number): string {
  return `${new Intl.NumberFormat('fr-BJ', { maximumFractionDigits: 2 }).format(bps / 100)} %`;
}

export const recoveryTexts = {
  title: 'Recouvrement',
  eyebrow: 'Mon espace KSP',
  back: 'Mon recouvrement',
  homeLinkText: 'Vos dossiers de créances : dépôt, mandat, frais, suivi des étapes et des paiements.',
  retry: 'Réessayer',
  readOnly:
    'Votre rôle dans cette entreprise permet de consulter les dossiers : seuls les administrateurs et les membres peuvent agir.',
} as const;
