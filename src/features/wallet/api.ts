import { api, parseResponse } from '@/lib/api';
import {
  type Money,
  type Statement,
  type TopUp,
  type Wallet,
  membershipRoleSchema,
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

/**
 * Rôle du membre dans l'organisation active (`GET /identity/organizations/{id}`, rôle seul) : lu ici plutôt
 * que par l'index d'identity, dont l'import ferait télécharger ses écrans et ses schémas aux pages qui
 * affichent le solde.
 */
export async function getOrganizationRole(organizationId: string): Promise<string> {
  const path = `/api/v1/identity/organizations/${encodeURIComponent(organizationId)}`;
  return parseResponse(membershipRoleSchema, await api.get(path)).role;
}
