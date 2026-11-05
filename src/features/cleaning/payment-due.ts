import type { Mission } from './schemas';

/**
 * Paiement en ligne qu'un particulier peut faire sur une mission (ADR-031) : l'acompte tant qu'il est
 * attendu, sinon le reste dû. Le montant est lu tel quel sur la mission (acompte, ou total quand rien
 * n'est encore réglé) ; après un règlement partiel, `amount` est null et la page du prestataire affiche
 * le montant calculé par KSP. `null` : rien à payer en ligne (mission d'entreprise, annulée ou réglée).
 */
export function paymentDue(mission: Mission): {
  part: 'deposit' | 'balance';
  amount: Mission['payment']['total'] | null;
  nothingPaid: boolean;
} | null {
  const payment = mission.payment;
  if (mission.customerKind === 'business') return null;
  if (mission.status === 'cancelled' || payment.status === 'paid') return null;
  const nothingPaid = payment.paid.amount === 0;
  if (payment.status === 'due' && payment.plan.option === 'deposit' && payment.depositPercent > 0) {
    return { part: 'deposit', amount: nothingPaid ? payment.depositAmount : null, nothingPaid };
  }
  return { part: 'balance', amount: nothingPaid ? payment.total : null, nothingPaid };
}

/**
 * Le client doit-il payer maintenant ? Paiement prévu « avant la prestation », ou prestation terminée.
 * Un paiement prévu « après » n'est pas réclamé tant que les passages ne sont pas faits.
 */
export function paymentExpected(mission: Mission): boolean {
  if (!paymentDue(mission)) return false;
  return mission.payment.plan.timing === 'before' || mission.status === 'completed';
}
