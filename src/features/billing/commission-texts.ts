import type { BadgeTone } from '@/components/ui/badge';

/*
 * Textes des factures de commission et des reçus des frais du Recouvrement (ADR-064). Sans zod. Les
 * adresses du Recouvrement et du portefeuille sont recopiées ici (comme celles du Nettoyage dans
 * `texts.ts`) : le Recouvrement importe billing pour ces listes, l'inverse ferait un cycle. Règle des frais
 * de dossier (décision du 25 novembre 2026) : frais d'étude, jamais remboursés.
 */

export const commissionPaths = {
  invoice: (id: string) => `/mon-espace/factures/commissions/${encodeURIComponent(id)}`,
  /** Liste des factures de commission : onglet de la page « Reversements et relevés » du Recouvrement. */
  list: '/mon-espace/recouvrement/releves?onglet=factures',
  receipts: '/mon-espace/recouvrement/releves?onglet=recus',
  recoveryCase: (id: string) => `/mon-espace/recouvrement/dossiers/${encodeURIComponent(id)}`,
  wallet: '/mon-espace/portefeuille',
} as const;

type StatusView = { label: string; tone: BadgeTone };

const STATUSES: Record<string, StatusView> = {
  pending_payment: { label: 'À régler', tone: 'warning' },
  paid: { label: 'Réglée', tone: 'success' },
  cancelled: { label: 'Annulée', tone: 'neutral' },
};
export const commissionStatus = (status: string): StatusView =>
  STATUSES[status] ?? { label: 'État inconnu', tone: 'neutral' };

const SOURCES: Record<string, string> = {
  payment_link: 'Paiement en ligne du débiteur',
  offline_cash: 'Espèces reçues par KSP',
  offline_transfer: 'Virement reçu par KSP',
  partner: 'Encaissé par le partenaire',
  direct_to_creditor: 'Reçu directement par vous',
};
export const commissionSource = (source: string) => SOURCES[source] ?? 'Encaissement';

const SETTLEMENTS: Record<string, string> = {
  deducted: 'Retenue à l’encaissement',
  invoiced: 'Débitée de votre portefeuille',
};
export const commissionSettlement = (settlement: string) => SETTLEMENTS[settlement] ?? 'Commission';

const RECEIPT_KINDS: Record<string, string> = {
  case_fee: 'Frais de dossier',
  study_fee: 'Forfait d’étude',
};
export const receiptKind = (kind: string) => RECEIPT_KINDS[kind] ?? 'Frais';

const MONTH = new Intl.DateTimeFormat('fr-BJ', { month: 'long', year: 'numeric', timeZone: 'UTC' });
/** « 2026-11 » → « Novembre 2026 ». */
export function periodLabel(period: string): string {
  const match = /^(\d{4})-(\d{2})$/.exec(period);
  if (!match) return period;
  const label = MONTH.format(new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, 1)));
  return label.charAt(0).toUpperCase() + label.slice(1);
}

export const commissionTexts = {
  // Raccourcis de « Mes factures ».
  sectionTitle: 'Recouvrement',
  listLinkText: 'La commission de KSP sur vos sommes recouvrées, mois par mois, hors taxe.',
  receiptsLinkText: 'Un reçu pour chaque paiement des frais d’un dossier, frais d’étude jamais remboursés.',

  // Liste.
  listTitle: 'Factures de commission',
  listLead:
    'Chaque mois, la commission de KSP sur les sommes recouvrées : retenue à l’encaissement, ou débitée de votre portefeuille pour un paiement que vous avez reçu directement. Montants hors taxe.',
  empty:
    'Aucune facture de commission pour le moment : la première est émise le 1er du mois qui suit un encaissement.',
  loading: 'Chargement des factures de commission…',
  retry: 'Réessayer',
  loadMore: 'Afficher plus',
  loadingMore: 'Chargement…',
  invoice: (number: string) => `Facture ${number}`,
  period: (label: string) => `Commission de ${label.toLowerCase()}`,
  totalHt: 'Commission (HT)',
  balance: 'Reste à débiter',
  issuedOn: (date: string) => `Émise le ${date}`,
  paidOn: (date: string) => `Réglée le ${date}`,
  debitFailed: (missing: string | null, next: string | null) =>
    [
      missing
        ? `Solde insuffisant au dernier essai : il manque ${missing}.`
        : 'Le dernier débit n’a pas abouti.',
      next ? `Prochain essai le ${next}.` : '',
    ]
      .filter(Boolean)
      .join(' '),
  topUp: 'Recharger mon portefeuille',
  open: 'Voir la facture',

  // Détail.
  back: 'Factures de commission',
  notFound:
    'Cette facture est introuvable. Elle appartient peut-être à un autre compte : vérifiez le compte actif.',
  periodRange: (start: string, end: string) => `Du ${start} au ${end}`,
  issuedLabel: 'Émise le',
  paidLabel: 'Réglée le',
  billedTo: 'Facturé à',
  ifu: 'IFU',
  rccm: 'RCCM',
  headerFrozen: 'En-tête enregistré à l’émission de la facture.',
  linesTitle: 'Encaissements du mois',
  linesNone: 'Aucun encaissement sur ce mois.',
  caseLink: (number: string) => `Dossier ${number}`,
  receivedOn: (date: string) => `Encaissé le ${date}`,
  gross: 'Encaissé',
  commission: 'Commission',
  totalsTitle: 'Récapitulatif',
  totalCollected: 'Total encaissé',
  commissionDeducted: 'Commission retenue à l’encaissement',
  commissionInvoiced: 'Commission à débiter de votre portefeuille',
  commissionTotal: 'Commission totale (HT)',
  excludingTax: 'Montants hors taxe : aucune TVA n’est appliquée.',
  debitTitle: 'Débit automatique',
  debitPending:
    'La commission à débiter est prélevée automatiquement sur votre portefeuille. Gardez un solde suffisant.',
  debitPaid: 'Commission entièrement réglée.',

  // Reçus.
  receiptsTitle: 'Reçus des frais',
  receiptsLead:
    'Un reçu pour chaque débit de votre portefeuille : frais de dossier et forfaits d’étude. Les frais de dossier sont des frais d’étude : ils ne sont jamais remboursés.',
  receiptsEmpty: 'Aucun reçu pour le moment : un reçu est émis à chaque paiement des frais d’un dossier.',
  receiptsLoading: 'Chargement des reçus…',
  receipt: (number: string) => `Reçu ${number}`,
  paidAt: (date: string) => `Payé le ${date}`,
} as const;
