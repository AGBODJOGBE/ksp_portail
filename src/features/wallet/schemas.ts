import * as z from 'zod/mini';

/*
 * Portefeuille prépayé lu par le client (contrat `ksp-api.v1.yaml`, routes `/api/v1/wallet/me…`, ADR-046),
 * champ par champ : un champ ajouté est ignoré, un type de ligne inconnu s'affiche avec un libellé neutre.
 * Schémas lus dans le navigateur : `zod/mini`.
 */

const moneySchema = z.object({ amount: z.int(), currency: z.literal('XOF') });

/**
 * `Wallet` de `GET /wallet/me`, réduit à ce que lit le portail : le portefeuille prépayé (`prepaid`) et les
 * montants de recharge acceptés (`topUpLimits`). Les fonds de créancier (`balance`, ADR-042) ne sont pas
 * affichés ici. `prepaid` et `topUpLimits` sont facultatifs au contrat (gateway antérieure) : absents, le
 * solde se lit comme nul et la recharge n'est pas proposée.
 *
 * `totalCollected`, `payoutsInProgress`, `totalPaidOut` (fonds de créancier, ADR-041, 042) : obligatoires au
 * contrat, lus ici seulement pour savoir si la rubrique « Reversements » concerne le titulaire. Facultatifs
 * dans ce schéma : le paiement par le portefeuille (fiche d'une facture) relit aussi
 * `GET /wallet/me` et ne doit pas échouer pour une rubrique qu'il n'affiche pas.
 */
/**
 * `PrepaidWallet` : solde prépayé. `withdrawalsInProgress` (v2, R-WL-04) : retraits vers Mobile Money
 * demandés et pas encore terminés, **déjà déduits** du solde ; facultatif (envoyé seulement s'il est utile).
 */
export const prepaidWalletSchema = z.object({
  balance: moneySchema,
  lastEntryAt: z.nullable(z.string()),
  withdrawalsInProgress: z.optional(moneySchema),
});

export const walletSchema = z.object({
  prepaid: z.optional(prepaidWalletSchema),
  topUpLimits: z.optional(z.object({ min: moneySchema, max: moneySchema })),
  totalCollected: z.optional(moneySchema),
  payoutsInProgress: z.optional(moneySchema),
  totalPaidOut: z.optional(moneySchema),
});

/** `WalletObjectReference` : objet payé (facture…), chez le service qui a débité. */
export const objectReferenceSchema = z.object({
  service: z.string(),
  objectType: z.string(),
  objectId: z.string(),
  part: z.nullable(z.string()),
});

/** `WalletStatementLine` : une écriture et le solde du compte après elle. */
export const statementLineSchema = z.object({
  transactionId: z.string(),
  account: z.string(),
  kind: z.string(),
  direction: z.string(),
  amount: moneySchema,
  balanceAfter: moneySchema,
  /** Référence de l'écriture chez wallet. */
  reference: z.string(),
  description: z.string(),
  object: z.nullable(objectReferenceSchema),
  createdAt: z.string(),
});

export const statementSchema = z.object({
  data: z.array(statementLineSchema),
  nextCursor: z.nullable(z.string()),
});

/** `WalletTopUp` : recharge en cours, suivie par `GET /payment/payments/{paymentId}`. */
export const topUpSchema = z.object({
  paymentId: z.string(),
  amount: moneySchema,
  status: z.string(),
  checkoutUrl: z.nullable(z.string()),
});

/**
 * `WalletPayout` (ADR-041) : reversement des fonds dus au titulaire vers son compte Mobile Money. Statuts
 * `pending_submission`, `submitted`, `completed`, `failed` (montant rendu au solde). Numéro toujours masqué.
 */
export const payoutSchema = z.object({
  id: z.string(),
  holder: z.object({ type: z.string(), id: z.string() }),
  amount: moneySchema,
  status: z.string(),
  paymentPayoutId: z.nullable(z.string()),
  /** `mtn`, `moov` ou `celtiis`. */
  beneficiaryOperator: z.string(),
  beneficiaryPhoneMasked: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
  completedAt: z.nullable(z.string()),
  failedAt: z.nullable(z.string()),
});

export const payoutListSchema = z.object({
  data: z.array(payoutSchema),
  nextCursor: z.nullable(z.string()),
});

/**
 * `Withdrawal` (R-WL-04, ADR-055 décision 8) : retrait du portefeuille prépayé vers Mobile Money, réduit à ce
 * que lit le client. Statuts `requested`, `awaiting_approval`, `submitted`, `completed`, `failed` (montant
 * rendu) et `rejected` (montant rendu, motif) ; un statut inconnu s'affiche avec un libellé neutre.
 */
export const withdrawalSchema = z.object({
  id: z.string(),
  amount: moneySchema,
  status: z.string(),
  /** `mtn`, `moov` ou `celtiis`. */
  beneficiaryOperator: z.string(),
  beneficiaryPhoneMasked: z.string(),
  requestedAt: z.string(),
  rejectedAt: z.nullable(z.string()),
  rejectionReason: z.nullable(z.string()),
  completedAt: z.nullable(z.string()),
  failedAt: z.nullable(z.string()),
});

export const withdrawalListSchema = z.object({
  data: z.array(withdrawalSchema),
  nextCursor: z.nullable(z.string()),
});

/** `WithdrawalCreated` : le retrait, le portefeuille prépayé après la retenue, `created` à false pour un renvoi. */
export const withdrawalCreatedSchema = z.object({
  withdrawal: withdrawalSchema,
  wallet: prepaidWalletSchema,
  created: z.boolean(),
});

export type Money = z.infer<typeof moneySchema>;
export type Withdrawal = z.infer<typeof withdrawalSchema>;
export type WithdrawalList = z.infer<typeof withdrawalListSchema>;
export type WithdrawalCreated = z.infer<typeof withdrawalCreatedSchema>;
export type Payout = z.infer<typeof payoutSchema>;
export type PayoutList = z.infer<typeof payoutListSchema>;
export type Wallet = z.infer<typeof walletSchema>;
export type StatementLine = z.infer<typeof statementLineSchema>;
export type Statement = z.infer<typeof statementSchema>;
export type TopUp = z.infer<typeof topUpSchema>;
