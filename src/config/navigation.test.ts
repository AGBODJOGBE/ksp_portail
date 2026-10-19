import { navigation } from './navigation';

describe('navigation du portail', () => {
  it('présente les six métiers du groupe, chacun avec sa propre adresse', () => {
    expect(navigation.metiers.map((m) => m.label)).toEqual([
      'Recouvrement',
      'Nettoyage et assainissement',
      'Immobilier clés en main',
      'Impression',
      'Marketplace',
      'Livraison et courses',
    ]);
    const hrefs = navigation.metiers.map((m) => m.href);
    expect(new Set(hrefs).size).toBe(hrefs.length);
    hrefs.forEach((href) => expect(href).toMatch(/^\/[a-z-]+$/));
  });

  it('mène à « Mon espace KSP »', () => {
    expect(navigation.account).toEqual({ label: 'Mon espace KSP', href: '/mon-espace' });
  });
});
