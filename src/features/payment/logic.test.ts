import { ApiError } from '@/lib/api';
import { describeCheckoutOpen } from './errors';
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
    // Nettoyage v2 : frais de visite d'une demande, séance (redirigée vers son programme).
    expect(subjectPath({ type: 'cleaning_request', id: 'r1' })).toBe('/mon-espace/nettoyage/demandes/r1');
    expect(subjectPath({ type: 'cleaning_session', id: 's1' })).toBe('/mon-espace/nettoyage/seances/s1');
    expect(subjectLabel({ type: 'cleaning_request', part: 'visit_fee', reference: 'DN-000124' })).toBe(
      'Frais de visite du nettoyage, demande DN-000124',
    );
    expect(subjectLabel({ type: 'cleaning_session', part: null, reference: 'séance 3/12' })).toBe(
      'Nettoyage, séance 3/12',
    );
  });

  it('`underReview` prime sur le statut ; un écart traité n’est plus « en vérification »', () => {
    expect(paymentView({ status: 'succeeded', underReview: true }).label).toBe('En vérification');
    expect(paymentView({ status: 'amount_mismatch', underReview: false }).label).toBe('Vérifié par KSP');
    expect(paymentView({ status: 'amount_mismatch' }).label).toBe('En vérification');
    expect(paymentView({ status: 'succeeded', underReview: false }).label).toBe('Réussi');
  });
});

describe('paiement : page déjà ouverte (ADR-048 §1)', () => {
  it('409 PAYMENT_CHECKOUT_OPEN : heure d’expiration à l’heure du Bénin', () => {
    const open = (details: Record<string, unknown>) =>
      new ApiError(409, 'PAYMENT_CHECKOUT_OPEN', 'Un paiement est déjà en cours pour cet objet.', details);
    // 13:30 UTC = 14:30 à Porto-Novo (UTC+1).
    expect(describeCheckoutOpen(open({ expiresAt: '2026-11-20T13:30:00Z' }))).toBe(
      'Une page de paiement est déjà ouverte pour ce paiement, jusqu’au 20 novembre 2026 à 14:30 (heure du Bénin). Terminez-la, ou réessayez après cette heure.',
    );
    expect(describeCheckoutOpen(open({}))).toBe(
      'Une page de paiement est déjà ouverte pour ce paiement. Terminez-la, ou réessayez quand elle aura expiré.',
    );
    expect(describeCheckoutOpen(open({ expiresAt: 'pas une date' }))).toMatch(/quand elle aura expiré/);
    expect(describeCheckoutOpen(new ApiError(409, 'PAYMENT_ALREADY_RECEIVED', 'reçu'))).toBeNull();
    expect(describeCheckoutOpen(new Error('autre'))).toBeNull();
  });
});
