import { api, parseResponse } from '@/lib/api';
import {
  type Money,
  type PayoutList,
  type Statement,
  type TopUp,
  type Wallet,
  payoutListSchema,
  statementSchema,
  topUpSchema,
  walletSchema,
} from './schemas';

/**
 * Portefeuille prépayé du titulaire connecté (ADR-046) : l'organisation active en contexte entreprise,
 * sinon le compte lui-même. Session requise.
 */
const WALLET = '/api/v1/wallet/me';

export const PAGE_SIZE = 10;

export async function getWallet(): Promise<Wallet> {
  return parseResponse(walletSchema, await api.get(WALLET));
}

/** Relevé du seul portefeuille prépayé (`account=prepaid`), les écritures les plus récentes d'abord. */
export async function listStatement(cursor?: string): Promise<Statement> {
  return parseResponse(
    statementSchema,
    await api.get(`${WALLET}/statement`, { query: { account: 'prepaid', limit: PAGE_SIZE, cursor } }),
  );
}

/** Recharge par Mobile Money : le portefeuille est crédité à la confirmation par le prestataire. */
export async function createTopUp(amount: Money, idempotencyKey: string): Promise<TopUp> {
  return parseResponse(topUpSchema, await api.post(`${WALLET}/top-ups`, { amount }, { idempotencyKey }));
}

/** Reversements du titulaire (ADR-041), les plus récents d'abord, page par page (curseur). */
export async function listPayouts(cursor?: string): Promise<PayoutList> {
  return parseResponse(
    payoutListSchema,
    await api.get(`${WALLET}/payouts`, { query: { limit: PAGE_SIZE, cursor } }),
  );
}
