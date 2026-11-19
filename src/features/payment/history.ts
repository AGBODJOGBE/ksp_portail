import type { PaymentList } from './schemas';

/**
 * Historique des paiements, exporté par l'index pour « Factures et paiements » (billing). Relais sans
 * directive : le client de la gateway (`api.ts`, module client) n'est chargé qu'au premier appel. Exporté
 * directement, il devenait une référence client de toute page serveur qui importe l'index, et Next
 * l'ajoutait à son premier téléchargement avec zod (+19,6 Ko mesurés sur `/payer/[token]`).
 */
export async function listPayments(cursor?: string): Promise<PaymentList> {
  const { listPayments: list } = await import('./api');
  return list(cursor);
}
