/** Textes du portefeuille prépayé (ADR-046). Sans zod : l'accueil de Mon espace en lit le titre. */

export const walletTexts = {
  title: 'Mon portefeuille',
  homeLinkText: 'Votre solde prépayé KSP : rechargez-le par Mobile Money, payez vos prestations et factures.',
  lead: 'Rechargez par Mobile Money, puis payez vos prestations et vos factures depuis votre solde, sans ressaisir votre numéro.',
  scope:
    'Le portefeuille affiché est celui du compte actif : votre compte personnel, ou l’entreprise que vous représentez.',
  balance: 'Solde disponible',
  balanceOf: (name: string) => `Solde de ${name}`,
  balanceHint: 'Utilisable pour toutes les prestations KSP. Il n’est pas retirable.',
  lastEntry: (date: string) => `Dernière opération le ${date}`,
  loading: 'Chargement…',
  retry: 'Réessayer',
  genericError: 'Une erreur est survenue. Réessayez dans quelques instants.',
  readOnly:
    'Vous êtes en lecture seule dans cette entreprise : seuls ses administrateurs et ses membres peuvent recharger le portefeuille ou payer avec.',

  // Recharge.
  topUpTitle: 'Recharger',
  topUpLead:
    'Choisissez un montant, puis validez le paiement Mobile Money (MTN ou Moov) sur votre téléphone.',
  presetsLabel: 'Montants proposés',
  amountLabel: 'Autre montant (FCFA)',
  amountHint: (min: string, max: string) => `Entre ${min} et ${max}.`,
  amountErrors: {
    empty: 'Indiquez le montant à recharger.',
    invalid: 'Indiquez un montant en francs CFA, en chiffres, sans décimales.',
    tooLow: (min: string) => `Le montant minimum d’une recharge est de ${min}.`,
    tooHigh: (max: string) => `Le montant maximum d’une recharge est de ${max}.`,
  },
  topUp: (amount: string) => `Recharger ${amount}`,
  topUpSubmit: 'Recharger',
  topUpOpening: 'Ouverture de la page de paiement…',
  topUpUnavailable: 'La recharge n’est pas encore disponible. Réessayez plus tard.',
  noCheckout: 'La page de paiement n’est pas encore prête. Réessayez dans quelques instants.',
  topUpCredited:
    'Le solde est crédité dès que le prestataire confirme le paiement, en général en moins d’une minute.',

  // Relevé.
  statementTitle: 'Relevé',
  statementEmpty: 'Aucune opération pour le moment.',
  statementEmptyHint: 'Vos recharges, paiements et remboursements apparaîtront ici.',
  loadMore: 'Afficher plus',
  loadingMore: 'Chargement…',
  balanceAfter: (amount: string) => `Solde après : ${amount}`,
  kinds: {
    top_up: 'Recharge',
    service_payment: 'Paiement',
    refund: 'Remboursement',
  } as Record<string, string>,
  otherKind: 'Opération',
  missionCredit: 'Crédit d’une prestation arrêtée',
  credit: 'Crédit',
  debit: 'Débit',
  seeMission: 'Voir la prestation',
  seeInvoice: 'Voir la facture',

  // Reversements (fonds dus au titulaire, ADR-041).
  payoutsTitle: 'Reversements',
  payoutsLead: 'Les sommes qui vous sont dues sont versées sur votre compte Mobile Money.',
  paidOut: 'Déjà reversé',
  inProgress: 'En cours',
  payoutsEmpty: 'Aucun reversement pour le moment.',
  payoutTo: (operator: string, phone: string) => `Vers ${operator} ${phone}`,
  payoutCompleted: (date: string) => `Versé le ${date}`,
  payoutFailed: (date: string) => `Échec le ${date} : le montant est revenu à votre solde.`,
  payoutStatuses: {
    pending_submission: 'En préparation',
    submitted: 'En cours',
    completed: 'Versé',
    failed: 'Échoué',
  } as Record<string, string>,
  operators: { mtn: 'MTN', moov: 'Moov', celtiis: 'Celtiis' } as Record<string, string>,

  // Retour d'une recharge (page de retour du prestataire).
  topUpDone: 'Recharge confirmée : votre portefeuille est crédité.',
  newBalance: (amount: string) => `Nouveau solde : ${amount}`,
  resumePayment: 'Reprendre mon paiement',
  seeWallet: 'Voir mon portefeuille',

  // Payer avec le portefeuille (fiche d'une mission, d'une facture).
  pay: 'Payer avec mon portefeuille',
  payDeposit: 'Payer l’acompte avec mon portefeuille',
  payBalance: 'Payer le solde avec mon portefeuille',
  amountToPay: 'Montant à payer',
  amountByKsp: 'Montant calculé par KSP au moment du paiement.',
  currentBalance: 'Solde du portefeuille',
  balanceAfterPay: 'Solde après paiement',
  confirmTitle: 'Confirmer le paiement',
  confirm: (amount: string) => `Confirmer le paiement de ${amount}`,
  confirmUnknown: 'Confirmer le paiement',
  confirmHint: 'Le montant est débité de votre portefeuille tout de suite, sans autre validation.',
  cancel: 'Annuler',
  paying: 'Paiement en cours…',
  paid: (amount: string) => `Paiement de ${amount} effectué depuis votre portefeuille.`,
  paidUnknown: 'Paiement effectué depuis votre portefeuille.',
  balanceNow: (amount: string) => `Solde restant : ${amount}.`,
  insufficient: (missing: string) => `Solde insuffisant : il vous manque ${missing}.`,
  insufficientUnknown: 'Solde insuffisant pour ce paiement.',
  insufficientHint:
    'Rechargez votre portefeuille par Mobile Money : vous revenez ensuite ici pour payer, rien n’est débité avant.',
  topUpMinimum: (amount: string) => `La recharge minimum est de ${amount}.`,
  payWithWalletHint: 'Payé depuis votre solde prépayé KSP, rechargeable par Mobile Money.',
} as const;

/**
 * Référence d'un crédit au prorata d'une mission récurrente arrêtée (ADR-049 §7, ADR-048 §14) : wallet
 * l'écrit comme un remboursement (`refund`) de référence `mission-credit:<creditId>`. Format lu dans le
 * service wallet, pas encore décrit par le contrat : sans lui, la ligne reste un « Remboursement ».
 */
const MISSION_CREDIT = 'mission-credit:';

/** Libellé du type d'une ligne du relevé ; type inconnu : libellé neutre. */
export function statementKindLabel(line: { kind: string; reference?: string }): string {
  if (line.kind === 'refund' && line.reference?.startsWith(MISSION_CREDIT)) return walletTexts.missionCredit;
  return walletTexts.kinds[line.kind] ?? walletTexts.otherKind;
}
