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
 */
export const walletSchema = z.object({
  prepaid: z.optional(z.object({ balance: moneySchema, lastEntryAt: z.nullable(z.string()) })),
  topUpLimits: z.optional(z.object({ min: moneySchema, max: moneySchema })),
});

/** `WalletObjectReference` : mission ou facture payée, chez le service qui a débité. */
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

/** `OrganizationMembership` d'identity, réduit au rôle : un `org_viewer` ne recharge ni ne paie. */
export const membershipRoleSchema = z.object({ role: z.string() });

export type Money = z.infer<typeof moneySchema>;
export type Wallet = z.infer<typeof walletSchema>;
export type StatementLine = z.infer<typeof statementLineSchema>;
export type Statement = z.infer<typeof statementSchema>;
export type TopUp = z.infer<typeof topUpSchema>;
