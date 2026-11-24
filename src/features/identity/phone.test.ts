import { cleanCode, DEFAULT_COUNTRY_CODE, isCodeComplete, readPhoneInput, toE164 } from './phone';

describe('numéro de téléphone', () => {
  it('propose le Bénin par défaut et garde le 01 des numéros béninois', () => {
    expect(DEFAULT_COUNTRY_CODE).toBe('+229');
    expect(toE164('+229', '01 97 00 00 45')).toBe('+2290197000045');
  });

  it.each([
    ['+229', '01.97.00.00.45', '+2290197000045'],
    ['229', '0197000045', '+2290197000045'],
    ['00229', '01-97-00-00-45', '+2290197000045'],
    ['+229', '(01) 97 00 00 45', '+2290197000045'],
    ['+33', '6 12 34 56 78', '+33612345678'],
    ['+229', '+33 6 12 34 56 78', '+33612345678'],
    ['+229', '0033612345678', '+33612345678'],
  ])('accepte tout pays au format E.164 (%s, %s)', (code, number, expected) => {
    expect(toE164(code, number)).toBe(expected);
  });

  it.each([
    ['+229', '97 00 00 45'],
    ['+229', '97-00-00-45'],
    ['229', '97.00.00.45'],
    ['+229', '+229 97 00 00 45'],
    ['+229', '00229 97 00 00 45'],
    ['00229', '97000045'],
  ])('Bénin : un numéro à 8 chiffres devient 01 + 8 chiffres (%s, %s)', (code, number) => {
    expect(readPhoneInput(code, number)).toEqual({ phone: '+2290197000045', converted: true });
  });

  it('un numéro déjà à 10 chiffres n’est jamais retouché ni signalé', () => {
    expect(readPhoneInput('+229', '01 97 00 00 45')).toEqual({ phone: '+2290197000045', converted: false });
    expect(readPhoneInput('+229', '+229 01 97 00 00 45')).toEqual({
      phone: '+2290197000045',
      converted: false,
    });
    // Un autre numéro à 10 chiffres (sans 01) reste tel quel : le backend reste juge.
    expect(toE164('+229', '0297000045')).toBe('+2290297000045');
  });

  it('les autres pays sont inchangés, même avec 8 chiffres', () => {
    expect(readPhoneInput('+33', '12 34 56 78')).toEqual({ phone: '+3312345678', converted: false });
    expect(readPhoneInput('+229', '+228 90 00 00 45')).toEqual({ phone: '+22890000045', converted: false });
  });

  it.each([
    ['+229', ''],
    ['+229', '12'],
    ['+229', '01 97 AB 00 45'],
    ['+0', '0197000045'],
    ['', '0197000045'],
    ['+229', '+229 01 97 00 00 45 12 34 56'],
  ])('refuse un numéro impossible (%s, %s)', (code, number) => {
    expect(toE164(code, number)).toBeNull();
    expect(readPhoneInput(code, number).converted).toBe(false);
  });

  it('ne garde que les chiffres du code, 8 au plus', () => {
    expect(cleanCode(' 482 913 ')).toBe('482913');
    expect(cleanCode('12345678901')).toBe('12345678');
    expect(isCodeComplete('482913')).toBe(true);
    expect(isCodeComplete('123')).toBe(false);
  });
});
