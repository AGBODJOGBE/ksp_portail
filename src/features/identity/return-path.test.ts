import { loginHref, safeReturnPath } from './return-path';

describe('retour après la connexion', () => {
  it.each([
    ['/mon-espace', '/mon-espace'],
    ['/recouvrement?dossier=12#suivi', '/recouvrement?dossier=12#suivi'],
    ['/mon-espace/factures', '/mon-espace/factures'],
  ])('garde un chemin interne (%s)', (value, expected) => {
    expect(safeReturnPath(value)).toBe(expected);
  });

  it.each([
    null,
    '',
    'mon-espace',
    'https://autre-site.example/piege',
    '//autre-site.example',
    '/\\autre-site.example',
    '/\t/autre-site.example',
    'javascript:alert(1)',
    '/connexion',
    '/connexion?retour=/mon-espace',
  ])('refuse tout le reste et revient à Mon espace (%s)', (value) => {
    expect(safeReturnPath(value)).toBe('/mon-espace');
  });

  it('construit l’adresse de connexion avec le retour encodé', () => {
    expect(loginHref('/mon-espace?onglet=factures')).toBe(
      '/connexion?retour=%2Fmon-espace%3Fonglet%3Dfactures',
    );
    expect(loginHref('https://autre-site.example')).toBe('/connexion?retour=%2Fmon-espace');
  });
});
