import type { BadgeTone } from '@/components/ui/badge';

/** Textes de « Mes factures » (fonctionnalité billing), chargés seulement par ses pages. */

export const billingPaths = {
  list: '/mon-espace/factures',
  invoice: (id: string) => `/mon-espace/factures/${encodeURIComponent(id)}`,
} as const;

export const billingTexts = {
  title: 'Mes factures',
  lead: 'Factures de vos contrats, avec leur échéance et les règlements reçus.',
  empty: 'Aucune facture pour le moment.',
  loading: 'Chargement…',
  retry: 'Réessayer',
  loadMore: 'Afficher plus',
  loadingMore: 'Chargement…',
  back: 'Retour à mes factures',
  notFound: 'Cette facture est introuvable. Elle appartient peut-être à un autre compte.',
  invoice: (number: string) => `Facture ${number}`,
  period: (start: string, end: string) => `Période du ${start} au ${end}`,
  issuedOn: (date: string) => `Émise le ${date}`,
  dueOn: (date: string) => `Échéance le ${date}`,
  paidOn: (date: string) => `Réglée le ${date}`,
  source: { cleaning: 'Nettoyage' } as Record<string, string>,
  linesTitle: 'Détail',
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
    'Cette facture est impayée. Réglez-la au plus vite : au-delà du seuil d’impayés, le service est suspendu.',
  pendingNotice: (date: string) => `À régler avant le ${date}.`,
  howToPay:
    'Règlement en espèces, par virement ou Mobile Money auprès de l’équipe KSP, qui l’enregistre ici.',
  seeMission: 'Voir la mission',
} as const;

type StatusLabel = { label: string; tone: BadgeTone };

export const invoiceStatuses: Record<string, StatusLabel> = {
  pending_payment: { label: 'En attente de paiement', tone: 'warning' },
  overdue: { label: 'Impayée', tone: 'danger' },
  paid: { label: 'Payée', tone: 'success' },
  cancelled: { label: 'Annulée', tone: 'neutral' },
};

export const invoiceMethods: Record<string, string> = {
  cash: 'Espèces',
  bank_transfer: 'Virement',
  mobile_money_offline: 'Mobile Money',
};

export function invoiceStatus(status: string): StatusLabel {
  return invoiceStatuses[status] ?? { label: status, tone: 'neutral' };
}
