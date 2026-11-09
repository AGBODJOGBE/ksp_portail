import { POLL_DELAYS_MS, nextPollDelay, safeCheckoutUrl } from './polling';
import { FINAL_STATUSES, paymentStatus, paymentView, subjectLabel, subjectPath } from './texts';

describe('paiement : règles d’affichage', () => {
  it('attente bornée : environ trois minutes, puis arrêt', () => {
    const total = POLL_DELAYS_MS.reduce((sum, delay) => sum + delay, 0);
    expect(total).toBeGreaterThan(120_000);
    expect(total).toBeLessThan(240_000);
    expect(nextPollDelay(0)).toBe(1500);
    expect(nextPollDelay(POLL_DELAYS_MS.length)).toBeNull();
  });

  it('les cinq statuts finaux du contrat arrêtent l’attente', () => {
    for (const status of ['succeeded', 'failed', 'expired', 'cancelled', 'amount_mismatch']) {
      expect(FINAL_STATUSES.has(status)).toBe(true);
    }
    expect(FINAL_STATUSES.has('pending')).toBe(false);
    expect(paymentStatus('inconnu').label).toBe('inconnu');
  });

  it('redirige seulement vers une adresse http(s)', () => {
    expect(safeCheckoutUrl('https://process.fedapay.com/abc')).toBe('https://process.fedapay.com/abc');
    expect(safeCheckoutUrl('javascript:alert(1)')).toBeNull();
    expect(safeCheckoutUrl('pas une adresse')).toBeNull();
    expect(safeCheckoutUrl(null)).toBeNull();
  });

  it('objet payé : libellé et écran', () => {
    expect(subjectLabel({ type: 'cleaning_mission', part: 'deposit', reference: null })).toBe(
      'Acompte de la prestation',
    );
    expect(subjectLabel({ type: 'billing_invoice', part: null, reference: 'FAC-9' })).toBe('Facture FAC-9');
    expect(subjectPath({ type: 'billing_invoice', id: 'x' })).toBe('/mon-espace/factures/x');
    expect(subjectPath({ type: 'autre', id: 'x' })).toBeNull();
    // Recharge du portefeuille (ADR-046) : identifiant = titulaire, écran = le portefeuille.
    expect(subjectLabel({ type: 'wallet_top_up', part: null, reference: null })).toBe(
      'Recharge du portefeuille',
    );
    expect(subjectPath({ type: 'wallet_top_up', id: 'x' })).toBe('/mon-espace/portefeuille');
  });

  it('`underReview` prime sur le statut ; un écart traité n’est plus « en vérification »', () => {
    expect(paymentView({ status: 'succeeded', underReview: true }).label).toBe('En vérification');
    expect(paymentView({ status: 'amount_mismatch', underReview: false }).label).toBe('Vérifié par KSP');
    expect(paymentView({ status: 'amount_mismatch' }).label).toBe('En vérification');
    expect(paymentView({ status: 'succeeded', underReview: false }).label).toBe('Réussi');
  });
});
