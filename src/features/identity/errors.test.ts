import { ApiError } from '@/lib/api';
import { describeError } from './errors';

const error = (status: number, code: string, message: string, details: Record<string, unknown> = {}) =>
  new ApiError(status, code, message, details);

describe('erreurs du parcours de connexion', () => {
  it('ajoute les essais restants au code incorrect', () => {
    expect(
      describeError(error(400, 'IDENTITY_OTP_INVALID', 'Le code est incorrect.', { attemptsRemaining: 3 })),
    ).toEqual({ message: 'Le code est incorrect. Il vous reste 3 essais.', field: 'code' });
    expect(
      describeError(error(400, 'IDENTITY_OTP_INVALID', 'Le code est incorrect.', { attemptsRemaining: 1 }))
        .message,
    ).toBe('Le code est incorrect. Il vous reste 1 essai.');
  });

  it.each(['IDENTITY_OTP_EXPIRED', 'IDENTITY_OTP_TOO_MANY_ATTEMPTS'])(
    'demande un nouveau code quand le code n’est plus utilisable (%s)',
    (code) => {
      expect(describeError(error(422, code, 'Demandez-en un nouveau.'))).toEqual({
        message: 'Demandez-en un nouveau.',
        field: 'code',
        newCodeNeeded: true,
      });
    },
  );

  it('rattache un numéro refusé au champ du numéro', () => {
    expect(
      describeError(error(400, 'IDENTITY_PHONE_INVALID', 'Le numéro de téléphone est invalide.')),
    ).toEqual({ message: 'Le numéro de téléphone est invalide.', field: 'phone' });
    expect(
      describeError(
        error(400, 'GATEWAY_VALIDATION_FAILED', 'La requête est invalide.', {
          fields: [{ field: 'phone', reason: 'invalid_format' }],
        }),
      ),
    ).toEqual({ message: 'Numéro invalide : vérifiez l’indicatif et le numéro.', field: 'phone' });
  });

  it.each(['IDENTITY_OTP_RATE_LIMITED', 'GATEWAY_RATE_LIMITED'])(
    'reprend le délai d’attente d’une limite atteinte (%s)',
    (code) => {
      expect(describeError(error(429, code, 'Trop de codes demandés.', { retryAfterSeconds: 45 }))).toEqual({
        message: 'Trop de codes demandés.',
        retryAfterSeconds: 45,
      });
    },
  );

  it('rattache un nom refusé à son champ', () => {
    expect(
      describeError(error(400, 'IDENTITY_NAME_INVALID', 'Le nom est invalide.', { field: 'lastName' })),
    ).toMatchObject({ field: 'lastName' });
  });

  it.each([
    [503, 'IDENTITY_OTP_SEND_FAILED', 'Envoi impossible.'],
    [503, 'IDENTITY_UNAVAILABLE', 'Le service est momentanément indisponible.'],
    [504, 'IDENTITY_TIMEOUT', 'Le service met trop de temps à répondre.'],
    [403, 'IDENTITY_ACCOUNT_SUSPENDED', 'Ce compte est suspendu.'],
  ])('affiche tel quel le message de la gateway (%i %s)', (status, code, message) => {
    expect(describeError(error(status, code, message))).toEqual({ message });
  });

  it('signale la coupure réseau et toute erreur inconnue', () => {
    expect(describeError(ApiError.network()).message).toMatch(/Connexion impossible/);
    expect(describeError(new Error('bug')).message).toBe(
      'Une erreur est survenue. Réessayez dans quelques instants.',
    );
  });
});
