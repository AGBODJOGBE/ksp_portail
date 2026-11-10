import type { MetierId } from '@/config/metiers';

/*
 * Recherche et filtre de l'annuaire des services, exécutés dans le navigateur sur la liste construite par
 * le serveur (`catalog.ts`). Ni contenu des pages métiers ni catalogue des métiers : le texte cherché de
 * chaque service (`search`) est préparé par le serveur.
 */

/** Libellé court d'une catégorie (pastille des cartes, colonne des catégories). */
export const CATEGORY_LABELS: Record<MetierId, string> = {
  recouvrement: 'Recouvrement',
  nettoyage: 'Nettoyage',
  immobilier: 'Immobilier',
  impression: 'Impression',
  marketplace: 'Marketplace',
  livraison: 'Livraison',
};

export type ServiceEntry = {
  id: string;
  category: MetierId;
  title: string;
  description: string;
  href: string;
  /** État du service s'il n'est pas encore ouvert (repris de la page métier). */
  status?: string;
  /** Texte cherché, déjà normalisé : titre, description, catégorie, nom et résumé du métier. */
  search: string;
};

/** Minuscules, sans accents ni ponctuation : « Créances » et « creance » se rejoignent. */
export function normalize(text: string): string {
  return text
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

/**
 * Un service correspond si chaque mot cherché y figure (début de mot accepté : « crean » trouve
 * « créances »). Recherche vide : tout correspond.
 */
export function matchesQuery(entry: ServiceEntry, query: string): boolean {
  const words = normalize(query).split(' ').filter(Boolean);
  if (!words.length) return true;
  const text = ` ${entry.search}`;
  return words.every((word) => text.includes(` ${word}`));
}

export function isCategory(value: string | null | undefined): value is MetierId {
  return !!value && Object.hasOwn(CATEGORY_LABELS, value);
}

export const PAGE_SIZE = 9;

export type DirectoryQuery = { category: MetierId | null; q: string; page: number };

/** Paramètres de l'adresse (`?categorie=`, `?q=`, `?page=`), valeurs inconnues ignorées. */
export function readDirectoryQuery(params: { get(name: string): string | null }): DirectoryQuery {
  const category = params.get('categorie');
  const page = Number.parseInt(params.get('page') ?? '1', 10);
  return {
    category: isCategory(category) ? category : null,
    q: (params.get('q') ?? '').slice(0, 80),
    page: Number.isFinite(page) && page > 0 ? page : 1,
  };
}

/** Adresse de l'annuaire pour une catégorie, une recherche et une page (paramètres vides omis). */
export function directoryHref(query: Partial<DirectoryQuery>): string {
  const params = new URLSearchParams();
  if (query.category) params.set('categorie', query.category);
  if (query.q?.trim()) params.set('q', query.q.trim());
  if (query.page && query.page > 1) params.set('page', String(query.page));
  const search = params.toString();
  return search ? `/services?${search}` : '/services';
}

export type DirectoryResult = {
  items: ServiceEntry[];
  total: number;
  page: number;
  pageCount: number;
};

/** Filtre par catégorie et recherche, puis découpe en pages de `PAGE_SIZE` (page hors limites ramenée). */
export function filterServices(entries: ReadonlyArray<ServiceEntry>, query: DirectoryQuery): DirectoryResult {
  const matching = entries.filter(
    (entry) => (!query.category || entry.category === query.category) && matchesQuery(entry, query.q),
  );
  const pageCount = Math.max(1, Math.ceil(matching.length / PAGE_SIZE));
  const page = Math.min(query.page, pageCount);
  return {
    items: matching.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
    total: matching.length,
    page,
    pageCount,
  };
}
