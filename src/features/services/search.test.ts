import { buildServiceDirectory } from './catalog';
import {
  directoryHref,
  filterServices,
  matchesQuery,
  PAGE_SIZE,
  readDirectoryQuery,
  type ServiceEntry,
} from './search';

const GATEWAY = [
  { code: 'window_cleaning', name: 'Nettoyage de vitres', description: 'Fenêtres et baies vitrées.' },
  { code: 'deep_cleaning', name: 'Grand ménage', description: 'Nettoyage complet du sol au plafond.' },
];

describe('annuaire des services', () => {
  it('prend les prestations du Nettoyage à la gateway, chacune vers la demande de devis', () => {
    const cleaning = buildServiceDirectory(GATEWAY).filter((entry) => entry.category === 'nettoyage');
    expect(cleaning.map((entry) => entry.title)).toEqual(['Nettoyage de vitres', 'Grand ménage']);
    cleaning.forEach((entry) => expect(entry.href).toBe('/nettoyage/demande'));
  });

  it('reprend les prestations de la page Nettoyage si la gateway ne répond pas', () => {
    const cleaning = buildServiceDirectory(null).filter((entry) => entry.category === 'nettoyage');
    expect(cleaning.length).toBeGreaterThan(0);
    cleaning.forEach((entry) => expect(entry.href).toBe('/nettoyage#prestations'));
  });

  it('couvre les six métiers, avec des identifiants uniques et des liens vers leurs pages', () => {
    const entries = buildServiceDirectory(GATEWAY);
    expect(new Set(entries.map((entry) => entry.category)).size).toBe(6);
    expect(new Set(entries.map((entry) => entry.id)).size).toBe(entries.length);
    entries.forEach((entry) => expect(entry.href).toMatch(/^\/[a-z-]+/));
  });
});

describe('recherche', () => {
  const entries = buildServiceDirectory(GATEWAY);
  const titles = (list: ReadonlyArray<ServiceEntry>) => list.map((entry) => entry.title);

  it('ignore les accents et la casse, et accepte un début de mot', () => {
    const found = entries.filter((entry) => matchesQuery(entry, 'CREANCE'));
    expect(found.length).toBeGreaterThan(0);
    found.forEach((entry) => expect(entry.category).toBe('recouvrement'));
    expect(titles(entries.filter((entry) => matchesQuery(entry, 'vitr')))).toEqual(['Nettoyage de vitres']);
  });

  it('exige chacun des mots cherchés', () => {
    expect(titles(entries.filter((entry) => matchesQuery(entry, 'grand ménage')))).toEqual(['Grand ménage']);
    expect(entries.filter((entry) => matchesQuery(entry, 'vitres bâches'))).toEqual([]);
  });

  it('filtre par catégorie, puis par recherche', () => {
    const cleaning = filterServices(entries, { category: 'nettoyage', q: '', page: 1 });
    expect(cleaning.total).toBe(2);
    expect(filterServices(entries, { category: 'nettoyage', q: 'plafond', page: 1 }).items).toHaveLength(1);
    expect(filterServices(entries, { category: 'livraison', q: 'vitres', page: 1 }).total).toBe(0);
  });

  it('découpe la liste en pages et ramène une page hors limites à la dernière', () => {
    const all = filterServices(entries, { category: null, q: '', page: 1 });
    expect(all.items).toHaveLength(Math.min(PAGE_SIZE, entries.length));
    expect(all.pageCount).toBe(Math.ceil(entries.length / PAGE_SIZE));
    const last = filterServices(entries, { category: null, q: '', page: 99 });
    expect(last.page).toBe(all.pageCount);
    expect(last.items.length).toBeGreaterThan(0);
  });

  it('lit l’adresse en ignorant les valeurs inconnues', () => {
    const read = (search: string) => readDirectoryQuery(new URLSearchParams(search));
    expect(read('categorie=nettoyage&q=vitres&page=2')).toEqual({
      category: 'nettoyage',
      q: 'vitres',
      page: 2,
    });
    expect(read('categorie=inconnue&page=-3')).toEqual({ category: null, q: '', page: 1 });
  });

  it('écrit l’adresse sans paramètre vide', () => {
    expect(directoryHref({})).toBe('/services');
    expect(directoryHref({ category: 'impression', q: '  bâche ', page: 1 })).toBe(
      '/services?categorie=impression&q=b%C3%A2che',
    );
    expect(directoryHref({ q: '', page: 2 })).toBe('/services?page=2');
  });
});
