import type { Mission } from './schemas';

/**
 * Paiement en ligne qu'un particulier peut faire sur une mission (portefeuille, ADR-046) : l'acompte tant
 * qu'il est attendu, sinon le reste dû. Le montant est lu tel quel sur la mission : `depositDue` ou
 * `remainingDue` calculés par cleaning ; à défaut (gateway antérieure), l'acompte ou le total quand rien
 * n'est encore réglé, sinon null (montant calculé par KSP au paiement). `null` : rien à payer en ligne
 * (mission d'entreprise, annulée ou réglée).
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
    const amount = payment.depositDue ?? (nothingPaid ? payment.depositAmount : null);
    return { part: 'deposit', amount, nothingPaid };
  }
  return {
    part: 'balance',
    amount: payment.remainingDue ?? (nothingPaid ? payment.total : null),
    nothingPaid,
  };
}

/**
 * Le client doit-il payer maintenant ? Paiement prévu « avant la prestation », ou prestation terminée.
 * Un paiement prévu « après » n'est pas réclamé tant que les passages ne sont pas faits.
 */
export function paymentExpected(mission: Mission): boolean {
  if (!paymentDue(mission)) return false;
  return mission.payment.plan.timing === 'before' || mission.status === 'completed';
}
