import type { BadgeTone } from '@/components/ui/badge';

/** Textes de « Mes factures » (fonctionnalité billing), chargés seulement par ses pages. */

export const billingPaths = {
  list: '/mon-espace/factures',
  invoice: (id: string) => `/mon-espace/factures/${encodeURIComponent(id)}`,
  /**
   * Listes du Nettoyage (adresses fixées par cleaning, recopiées ici comme dans payment et wallet). Une
   * facture v2 ne porte que les numéros de la demande et du programme, pas leur identifiant : le lien
   * mène à la liste, où le numéro se retrouve.
   */
  cleaningRequests: '/mon-espace/nettoyage/demandes',
  cleaningPrograms: '/mon-espace/nettoyage/programmes',
} as const;

export const billingTexts = {
  title: 'Mes factures',
  lead: 'Factures de vos prestations et reçus des frais de visite, avec leur échéance et les règlements reçus.',
  scope:
    'Les factures affichées sont celles du compte actif : votre compte personnel, ou l’entreprise que vous représentez.',
  empty: 'Aucune facture pour le moment.',
  emptyFiltered: 'Aucune facture dans cet état.',
  emptyHint:
    'Vos factures et reçus apparaissent ici : facture d’une séance de nettoyage, reçu des frais de visite, facture mensuelle d’un compte entreprise.',
  loading: 'Chargement…',
  genericError: 'Une erreur est survenue. Réessayez dans quelques instants.',
  dashboard: {
    seeAll: 'Toutes mes factures',
    itemText: (balance: string, due: string) => `Reste à régler : ${balance} · échéance le ${due}.`,
    action: 'Voir la facture',
    nothing: 'Aucune facture à régler.',
    balanceLabel: 'Reste à régler',
    paidLabel: 'Réglé',
    gaugeLabel: (paid: string, total: string) => `${paid} réglés sur ${total}`,
  },
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
  dueLabel: 'Échéance',
  paymentsTitle: 'Règlements reçus',
  noPayments: 'Aucun règlement enregistré pour le moment.',
  overdueNotice:
    'Cette facture est impayée : son échéance est passée. Réglez-la au plus vite : au-delà du seuil d’impayés fixé par KSP, le service est suspendu, puis reprend dès le règlement.',
  pendingNotice: (date: string) => `À régler avant le ${date}.`,
  howToPay:
    'Réglez-la ci-dessous avec le portefeuille KSP, ou en espèces, par virement ou Mobile Money auprès de l’équipe KSP, qui l’enregistre ici.',
  payTitle: 'Payer avec le portefeuille',
  cancelledNotice: 'Cette facture a été annulée par KSP (correction) : elle n’est plus à régler.',

  // Factures v2 (Nettoyage, ADR-055).
  kinds: {
    session: 'Facture de séance',
    visit_fee: 'Reçu des frais de visite',
    monthly: 'Facture mensuelle',
  } as Record<string, string>,
  lineKinds: {
    session: 'Séance',
    missed_session: 'Séance manquée',
    late_cancellation: 'Annulation tardive',
    visit_fee: 'Frais de visite',
    visit_fee_deduction: 'Frais de visite déduits',
    adjustment: 'Ajustement',
  } as Record<string, string>,
  sessionRank: (rank: string) => `Séance ${rank}`,
  serviceOn: (date: string) => `Prestation du ${date}`,
  facts: {
    origin: 'Origine',
    kind: 'Nature',
    month: 'Mois facturé',
    request: 'Demande',
    program: 'Programme',
    session: 'Séance',
    place: 'Lieu',
    serviceDate: 'Date de la prestation',
    issued: 'Émission',
    settled: 'Règlement',
  },
  seeRequests: 'Mes demandes de nettoyage',
  seePrograms: 'Mes programmes de nettoyage',

  // Avoirs (R-PE-07).
  creditNotesTitle: 'Avoirs',
  creditNotesLead: 'Corrections émises par KSP sur cette facture.',
  creditNote: (number: string) => `Avoir ${number}`,
  creditIssuedOn: (date: string) => `Émis le ${date}`,
  creditReason: 'Motif',
  creditTotal: 'Montant de l’avoir',
  creditApplied: 'Déduit du reste à régler',
  creditToWallet: 'Crédité sur le portefeuille',

  // Paiement par Mobile Money (R-PE-04).
  mobileMoneyTitle: 'Payer par Mobile Money',
  mobileMoneyLead:
    'Validez le paiement sur votre téléphone, depuis la page du prestataire de paiement. La facture se met à jour dès qu’il confirme.',
  mobileMoneyPay: (amount: string) => `Payer ${amount} par Mobile Money`,
  mobileMoneyPayUnknown: 'Payer par Mobile Money',
  mobileMoneyOpening: 'Ouverture de la page de paiement…',
  mobileMoneyContinue: 'Continuer vers la page de paiement',
  mobileMoneyNoCheckout: 'La page de paiement n’est pas encore prête. Réessayez dans quelques instants.',
  mobileMoneyStale:
    'Cette facture ne peut plus être payée : elle est déjà réglée ou annulée. Elle a été relue.',
  mobileMoneyKeyReused: 'Le paiement n’a pas pu être préparé. Réessayez.',
  mobileMoneyUnavailable:
    'Le service de paiement Mobile Money est momentanément indisponible. Réessayez dans quelques instants.',
  mobileMoneyTooMany: 'Trop de tentatives en peu de temps. Patientez une minute avant de réessayer.',
  mobileMoneyForbidden:
    'Vous êtes en lecture seule dans cette entreprise : seuls ses administrateurs et ses membres peuvent payer ses factures.',
  mobileMoneyPendingText:
    'Bientôt, vous pourrez régler une facture directement par Mobile Money. En attendant, rechargez votre portefeuille, puis payez avec.',
  reference: (message: string, id: string) => `${message} (référence : ${id})`,

  // Prélèvement automatique (R-PE-04), fiche d'un compte entreprise.
  preferencesTitle: 'Prélèvement automatique',
  preferencesLead:
    'À son échéance, chaque facture mensuelle est réglée par le portefeuille de l’entreprise si son solde suffit ; sinon, elle reste à payer.',
  autoDebitLabel: 'État actuel',
  autoDebitOn: 'Activé',
  autoDebitOff: 'Désactivé',
  enable: 'Activer le prélèvement automatique',
  disable: 'Désactiver le prélèvement automatique',
  confirmEnableTitle: 'Activer le prélèvement automatique ?',
  confirmEnableText:
    'Les prochaines factures mensuelles seront débitées du portefeuille de l’entreprise à leur échéance, sans autre validation.',
  confirmEnable: 'Oui, activer',
  cancel: 'Annuler',
  saving: 'Enregistrement…',
  enabled: 'Prélèvement automatique activé.',
  disabled: 'Prélèvement automatique désactivé.',
  preferencesAdminOnly: 'Seul un administrateur de l’entreprise peut changer ce réglage.',
  preferencesNotInUse:
    'Utilisez ce compte entreprise (bouton en haut de la page) pour voir et régler son prélèvement automatique.',
  preferencesUpdated: (date: string) => `Dernière modification le ${date}.`,
  preferencesPendingText:
    'Bientôt, les factures mensuelles de l’entreprise pourront être réglées automatiquement par son portefeuille, à leur échéance.',
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
  /** Paiement Mobile Money direct confirmé par le prestataire (ADR-031, déprécié, gardé pour l'historique). */
  mobile_money_online: 'Mobile Money en ligne',
  /** Payé depuis le portefeuille prépayé (ADR-046). */
  wallet: 'Portefeuille KSP',
};

export function invoiceStatus(status: string): StatusLabel {
  return invoiceStatuses[status] ?? { label: status, tone: 'neutral' };
}

/** « Factures et paiements » : historique unifié (lot 2 de Mon espace). Textes provisoires. */
export const historyTexts = {
  pageTitle: 'Factures et paiements',
  pageLead:
    'Vos factures et vos paiements en ligne au même endroit : ce qui reste à régler, son échéance, et le reçu de chaque paiement.',
  title: 'Historique',
  dueTitle: 'Reste à régler',
  dueCount: (count: number) =>
    count > 1
      ? `${count} factures attendent votre règlement : leur montant et leur échéance sont indiqués ci-dessous.`
      : 'Une facture attend votre règlement : son montant et son échéance sont indiqués ci-dessous.',
  nothingDue: 'Rien à régler pour le moment.',
  invoiceKind: 'Facture',
  paymentKind: 'Paiement en ligne',
  balance: 'Reste dû',
  dueAt: (date: string) => `Échéance : ${date}`,
  pay: 'Payer cette facture',
  receipt: 'Voir le reçu',
  details: 'Voir le paiement',
  empty: 'Aucune facture ni aucun paiement pour le moment.',
  more: 'Afficher plus',
} as const;
