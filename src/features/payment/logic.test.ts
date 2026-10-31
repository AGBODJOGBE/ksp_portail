import { ApiError } from '@/lib/api';
import { describePaymentError } from './errors';
import { POLL_DELAYS_MS, nextPollDelay, safeCheckoutUrl } from './polling';
import { FINAL_STATUSES, paymentStatus, subjectLabel, subjectPath } from './texts';

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
  });

  it('erreurs du contrat : conséquence pour le bouton', () => {
    const error = (status: number, code: string) => new ApiError(status, code, 'message de la gateway');
    expect(describePaymentError(error(422, 'PAYMENT_SUBJECT_NOT_PAYABLE')).kind).toBe('stale');
    expect(describePaymentError(error(409, 'PAYMENT_IDEMPOTENCY_KEY_REUSED')).kind).toBe('newKey');
    expect(describePaymentError(error(422, 'PAYMENT_VIA_INVOICE')).message).toMatch(/facture mensuelle/);
    expect(describePaymentError(ApiError.network()).kind).toBe('retry');
    expect(describePaymentError(error(400, 'PAYMENT_VALIDATION_FAILED')).message).toBe(
      'message de la gateway',
    );
  });
});
