import { ApiError } from '@/lib/api';
import {
  beninWeekday,
  callbackBody,
  callbackDays,
  cleanDebtorCode,
  describeDebtorError,
  isDebtorCodeComplete,
  isDebtorLinkToken,
  openSlots,
  parseAmount,
  payableOffer,
  safeUrl,
} from './debtor';
import { debtorCaseSchema, debtorSessionSchema } from './debtor-schemas';
import { debtorCaseBody, offer } from './debtor-fixtures.test-utils';

const TOKEN = 'Ab3_dE5-gH7iJ9kL1mN3pQ5rS7tU9vW1xY3zA5bC7dE';

describe('espace du débiteur : contrôles de forme', () => {
  it('jeton du lien : 43 caractères base64url, rien d’autre', () => {
    expect(isDebtorLinkToken(TOKEN)).toBe(true);
    expect(isDebtorLinkToken(TOKEN.slice(1))).toBe(false);
    expect(isDebtorLinkToken(`${TOKEN.slice(0, 42)}/`)).toBe(false);
  });

  it('code : chiffres seulement, six au plus', () => {
    expect(cleanDebtorCode(' 48 29-13 7')).toBe('482913');
    expect(isDebtorCodeComplete('482913')).toBe(true);
    expect(isDebtorCodeComplete('48291')).toBe(false);
  });

  it('montant saisi : entier positif, espaces et points de milliers acceptés', () => {
    expect(parseAmount('50 000')).toBe(50000);
    expect(parseAmount('50.000')).toBe(50000);
    expect(parseAmount('50 000')).toBe(50000);
    expect(parseAmount('0')).toBeNull();
    expect(parseAmount('12,5')).toBeNull();
    expect(parseAmount('')).toBeNull();
  });

  it('adresse ouverte dans un onglet : http(s) seulement', () => {
    expect(safeUrl('https://ksp.bj/payer/abc')).toBe('https://ksp.bj/payer/abc');
    expect(safeUrl('javascript:alert(1)')).toBeNull();
    expect(safeUrl('pas une adresse')).toBeNull();
  });

  it('remise payable : proposée ou acceptée, non échue', () => {
    const now = new Date('2026-11-25T10:00:00Z');
    expect(payableOffer(debtorCaseBody({ settlementOffer: offer() }) as never, now)?.id).toBe(offer().id);
    expect(
      payableOffer(debtorCaseBody({ settlementOffer: offer({ status: 'executed' }) }) as never, now),
    ).toBeNull();
    expect(
      payableOffer(
        debtorCaseBody({ settlementOffer: offer({ validUntil: '2026-11-24T22:59:00Z' }) }) as never,
        now,
      ),
    ).toBeNull();
    expect(payableOffer(debtorCaseBody() as never, now)).toBeNull();
  });

  it('schémas fidèles au contrat : situation complète, session au bon format', () => {
    expect(debtorCaseSchema.safeParse(debtorCaseBody()).success).toBe(true);
    const { pendingPaymentUrl: _missing, ...incomplete } = debtorCaseBody();
    expect(debtorCaseSchema.safeParse(incomplete).success).toBe(false);
    expect(
      debtorSessionSchema.safeParse({ sessionToken: 'court', sessionExpiresAt: '2026-11-25T10:30:00Z' })
        .success,
    ).toBe(false);
  });
});

describe('espace du débiteur : refus de la gateway', () => {
  const at = new Date('2026-11-25T09:00:00Z');

  it('lien invalide, session expirée', () => {
    expect(describeDebtorError(new ApiError(404, 'RECOVERY_DEBTOR_LINK_INVALID', 'x')).kind).toBe(
      'linkInvalid',
    );
    expect(describeDebtorError(new ApiError(401, 'RECOVERY_DEBTOR_SESSION_INVALID', 'x'))).toMatchObject({
      kind: 'session',
      message: 'Votre session est terminée. Pour continuer, demandez un nouveau code.',
    });
  });

  it('code faux avec essais restants, code expiré, blocage d’une heure', () => {
    expect(
      describeDebtorError(new ApiError(400, 'RECOVERY_DEBTOR_CODE_INVALID', 'x', { attemptsLeft: 1 })),
    ).toMatchObject({
      kind: 'code',
      attemptsLeft: 1,
      message: 'Ce code est incorrect. Il vous reste 1 essai.',
    });
    expect(describeDebtorError(new ApiError(422, 'RECOVERY_DEBTOR_CODE_EXPIRED', 'x')).kind).toBe(
      'codeExpired',
    );
    const locked = describeDebtorError(
      new ApiError(429, 'RECOVERY_DEBTOR_LOCKED', 'x', { retryAfterSeconds: 3600 }),
      at,
    );
    expect(locked).toMatchObject({ kind: 'locked', retryAfterSeconds: 3600 });
    // Débloqué à 11:00 au Bénin (10:00 UTC).
    expect(locked.message).toContain('11:00');
  });

  it('limites de débit : délai du corps, message de recovery pour un code trop tôt', () => {
    expect(
      describeDebtorError(
        new ApiError(429, 'RECOVERY_DEBTOR_CODE_TOO_SOON', 'Un code vient de vous être envoyé.', {
          retryAfterSeconds: 42,
        }),
      ),
    ).toMatchObject({ kind: 'wait', retryAfterSeconds: 42, message: 'Un code vient de vous être envoyé.' });
    expect(
      describeDebtorError(new ApiError(429, 'GATEWAY_RATE_LIMITED', 'x', { retryAfterSeconds: 12 })),
    ).toMatchObject({ kind: 'wait', message: 'Trop de demandes en peu de temps. Réessayez dans 12 s.' });
  });

  it('route pas encore servie (501), panne, coupure', () => {
    expect(describeDebtorError(new ApiError(501, 'RECOVERY_NOT_IMPLEMENTED', 'x')).kind).toBe('pending');
    expect(describeDebtorError(new ApiError(503, 'RECOVERY_UNAVAILABLE', 'x')).kind).toBe('unavailable');
    expect(describeDebtorError(ApiError.network()).kind).toBe('unavailable');
    expect(describeDebtorError(new Error('x')).kind).toBe('other');
  });

  it('montant refusé, dossier suspendu, transition, clé, champ', () => {
    expect(
      describeDebtorError(
        new ApiError(422, 'RECOVERY_PAYMENT_AMOUNT_INVALID', 'Montant trop élevé.', {
          due: { amount: 135000, currency: 'XOF' },
        }),
      ),
    ).toMatchObject({ kind: 'amount', due: 135000, field: 'amount' });
    expect(describeDebtorError(new ApiError(422, 'RECOVERY_CASE_SUSPENDED', 'x')).kind).toBe('suspended');
    expect(describeDebtorError(new ApiError(422, 'RECOVERY_INVALID_TRANSITION', 'x')).kind).toBe('stale');
    expect(describeDebtorError(new ApiError(409, 'RECOVERY_IDEMPOTENCY_KEY_REUSED', 'x')).kind).toBe(
      'newKey',
    );
    expect(
      describeDebtorError(
        new ApiError(400, 'RECOVERY_VALIDATION_FAILED', 'x', { field: 'terms.firstAmount' }),
      ),
    ).toMatchObject({ kind: 'fields', field: 'terms' });
    expect(
      describeDebtorError(
        new ApiError(400, 'GATEWAY_VALIDATION_FAILED', 'x', {
          fields: [{ field: '/preferredFrom', reason: 'x' }],
        }),
      ),
    ).toMatchObject({ kind: 'fields', field: 'preferredFrom' });
  });
});

describe('espace du débiteur : rappel', () => {
  // Mercredi 25 novembre 2026, 09:00 au Bénin.
  const now = new Date('2026-11-25T08:00:00Z');

  it('jours : du jour même aux 29 suivants, sans les dimanches', () => {
    const days = callbackDays(now);
    expect(days[0]).toBe('2026-11-25');
    expect(days).not.toContain('2026-11-29');
    expect(days.every((day) => beninWeekday(day) !== 0)).toBe(true);
    expect(days.at(-1)! <= '2026-12-24').toBe(true);
  });

  it('créneaux d’aujourd’hui encore à venir seulement ; journée finie : jour retiré', () => {
    expect(openSlots('2026-11-25', now).map(([from]) => from)).toEqual([
      '10:00',
      '12:00',
      '14:00',
      '16:00',
      '18:00',
    ]);
    expect(callbackDays(new Date('2026-11-25T17:30:00Z'))[0]).toBe('2026-11-26');
  });

  it('créneau envoyé en UTC, message facultatif', () => {
    expect(callbackBody('2026-11-26', ['08:00', '10:00'], '  ')).toEqual({
      preferredFrom: '2026-11-26T07:00:00.000Z',
      preferredTo: '2026-11-26T09:00:00.000Z',
    });
    expect(callbackBody('2026-11-26', ['08:00', '10:00'], ' Le matin ').message).toBe('Le matin');
  });
});
