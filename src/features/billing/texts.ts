import type { BadgeTone } from '@/components/ui/badge';

/** Textes de « Mes factures » (fonctionnalité billing), chargés seulement par ses pages. */

export const billingPaths = {
  list: '/mon-espace/factures',
  invoice: (id: string) => `/mon-espace/factures/${encodeURIComponent(id)}`,
} as const;

export const billingTexts = {
  title: 'Mes factures',
  lead: 'Factures mensuelles de vos contrats d’entreprise, avec leur échéance et les règlements reçus.',
  scope:
    'Les factures affichées sont celles du compte actif : votre compte personnel, ou l’entreprise que vous représentez.',
  empty: 'Aucune facture pour le moment.',
  emptyFiltered: 'Aucune facture dans cet état.',
  emptyHint:
    'Les factures concernent les contrats d’entreprise : une facture est émise chaque mois, au début du mois suivant. Les prestations d’un particulier se règlent directement auprès de l’équipe KSP.',
  loading: 'Chargement…',
  retry: 'Réessayer',
  loadMore: 'Afficher plus',
  loadingMore: 'Chargement…',
  back: 'Retour à mes factures',
  notFound: 'Cette facture est introuvable. Elle appartient peut-être à un autre compte.',
  filtersLabel: 'Filtrer par état',
  filterAll: 'Toutes',
  invoice: (number: string) => `Facture ${number}`,
  period: (start: string, end: string) => `Période du ${start} au ${end}`,
  month: (index: number) => `Mois ${index} du contrat`,
  issuedOn: (date: string) => `Émise le ${date}`,
  dueOn: (date: string) => `Échéance le ${date}`,
  paidOn: (date: string) => `Réglée le ${date}`,
  balanceLeft: (amount: string) => `Reste à régler : ${amount}`,
  source: { cleaning: 'Nettoyage' } as Record<string, string>,
  billedTo: 'Facturé à',
  ifu: 'IFU',
  rccm: 'RCCM',
  headerFrozen: 'En-tête enregistré à l’émission de la facture.',
  linesTitle: 'Détail',
  prorata:
    'Montant établi par KSP au prorata des jours facturables du mois : premier et dernier mois partiels, jours de suspension déduits.',
  line: 'Libellé',
  quantity: 'Quantité',
  unitPrice: 'Prix unitaire',
  amount: 'Montant',
  total: 'Total',
  paid: 'Déjà réglé',
  balance: 'Reste à régler',
  paymentsTitle: 'Règlements reçus',
  noPayments: 'Aucun règlement enregistré pour le moment.',
  overdueNotice:
    'Cette facture est impayée : son échéance est passée. Réglez-la au plus vite : au-delà du seuil d’impayés fixé par KSP, le service est suspendu, puis reprend dès le règlement.',
  pendingNotice: (date: string) => `À régler avant le ${date}.`,
  howToPay:
    'Règlement en espèces, par virement ou Mobile Money auprès de l’équipe KSP, qui l’enregistre ici.',
  cancelledNotice: 'Cette facture a été annulée par KSP (correction) : elle n’est plus à régler.',
  seeMission: 'Voir la mission',
} as const;

type StatusLabel = { label: string; tone: BadgeTone };

export const invoiceStatuses: Record<string, StatusLabel> = {
  pending_payment: { label: 'En attente de paiement', tone: 'warning' },
  overdue: { label: 'Impayée', tone: 'danger' },
  paid: { label: 'Payée', tone: 'success' },
  cancelled: { label: 'Annulée', tone: 'neutral' },
};

/** Valeurs du filtre dans l'adresse (`?etat=`), en français. */
export const statusParams: Record<string, string> = {
  pending_payment: 'en-attente',
  overdue: 'impayee',
  paid: 'payee',
  cancelled: 'annulee',
};

export const invoiceMethods: Record<string, string> = {
  cash: 'Espèces',
  bank_transfer: 'Virement',
  mobile_money_offline: 'Mobile Money',
};

export function invoiceStatus(status: string): StatusLabel {
  return invoiceStatuses[status] ?? { label: status, tone: 'neutral' };
}
