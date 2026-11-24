import { formatPhone, isBeninEightDigits, isBeninPhone, normalizePhone } from './phone';

describe('règle des téléphones (miroir de tryNormalizePhone, ADR-063)', () => {
  it.each([
    ['+229 97 00 00 45', '+2290197000045'],
    ['+22997000045', '+2290197000045'],
    ['0022997000045', '+2290197000045'],
    ['00229 97-00-00-45', '+2290197000045'],
    ['+229 (97) 00.00.45', '+2290197000045'],
    // Pleine chasse et espace insécable : ramenés par NFKC puis retirés.
    ['＋２２９ 97000045', '+2290197000045'],
  ])('Bénin à 8 chiffres : 01 ajouté devant (%s)', (input, expected) => {
    expect(normalizePhone(input)).toBe(expected);
  });

  it('un numéro à 10 chiffres n’est jamais retouché (règle idempotente)', () => {
    expect(normalizePhone('+2290197000045')).toBe('+2290197000045');
    expect(normalizePhone('+229 01 97 00 00 45')).toBe('+2290197000045');
    expect(normalizePhone(normalizePhone('+22997000045'))).toBe('+2290197000045');
  });

  it('les autres pays sont inchangés', () => {
    expect(normalizePhone('+33 6 12 34 56 78')).toBe('+33612345678');
    expect(normalizePhone('+22890000045')).toBe('+22890000045');
  });

  it.each([['97000045'], ['+0123456789'], ['+229'], ['+229 97 AB 00 45'], [''], [null], [undefined]])(
    'refuse ce qui ne se ramène pas au format E.164 (%s)',
    (input) => {
      expect(normalizePhone(input)).toBeNull();
    },
  );

  it('reconnaît un ancien numéro béninois et un numéro béninois', () => {
    expect(isBeninEightDigits('+229 97 00 00 45')).toBe(true);
    expect(isBeninEightDigits('+2290197000045')).toBe(false);
    expect(isBeninPhone('+22997000045')).toBe(true);
    expect(isBeninPhone('+2290197000045')).toBe(true);
    expect(isBeninPhone('+33612345678')).toBe(false);
    expect(isBeninPhone('+229********45')).toBe(false);
    expect(isBeninPhone(null)).toBe(false);
  });

  it('affiche un numéro béninois par paires, sans en changer la valeur', () => {
    expect(formatPhone('+2290197000045')).toBe('+229 01 97 00 00 45');
    expect(formatPhone('+22997000045')).toBe('+229 97 00 00 45');
    expect(formatPhone('+33612345678')).toBe('+33612345678');
  });

  it('rend tels quels les numéros masqués par le backend', () => {
    expect(formatPhone('+229********45')).toBe('+229********45');
    expect(formatPhone('+229 •• •• 45')).toBe('+229 •• •• 45');
  });
});
