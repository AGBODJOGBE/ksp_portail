import Link from 'next/link';
import { MetierIcon } from '@/components/sections/metier-icon';
import { IconChevronLeft, IconChevronRight, IconGrid } from '@/components/ui/icons';
import { buttonClasses } from '@/components/ui/button';
import type { MetierId } from '@/config/metiers';
import { cn } from '@/lib/cn';
import { servicesTexts as t } from '@/features/services/content';
import {
  CATEGORY_LABELS,
  type DirectoryQuery,
  directoryHref,
  filterServices,
  type ServiceEntry,
} from '@/features/services/search';
import { ServiceCard } from './service-card';
import { ServicesSearch } from './services-search';

const CATEGORY_LINK = cn(
  'flex min-h-11 shrink-0 items-center gap-3 rounded-full px-4 font-display font-medium text-ink-muted whitespace-nowrap',
  'border border-line bg-surface lg:rounded-control lg:border-0 lg:bg-transparent lg:min-h-13 lg:px-3',
  'hover:text-ink lg:hover:bg-brand-soft',
  'aria-[current=true]:border-brand aria-[current=true]:bg-brand-100 aria-[current=true]:font-semibold aria-[current=true]:text-ink',
);

/** Colonne des catégories : fixe sur ordinateur, sélecteur horizontal défilant sur téléphone. */
function Categories({ query }: { query: DirectoryQuery }) {
  const items = [
    { id: null, label: t.allCategories },
    ...(Object.keys(CATEGORY_LABELS) as MetierId[]).map((id) => ({ id, label: CATEGORY_LABELS[id] })),
  ];
  return (
    <nav
      aria-labelledby="categories-titre"
      className="min-w-0 self-start lg:sticky lg:top-[calc(var(--header-h)+1.5rem)]"
    >
      <h2 id="categories-titre" className="font-display text-brand-ink text-lg font-semibold lg:text-xl">
        {t.categoriesTitle}
      </h2>
      <ul className="-mx-gutter px-gutter mt-4 flex gap-2 overflow-x-auto pb-2 lg:mx-0 lg:block lg:overflow-visible lg:px-0 lg:pb-0">
        {items.map((item) => (
          <li key={item.id ?? 'tous'} className="lg:border-line lg:border-b lg:py-1">
            <Link
              href={directoryHref({ category: item.id, q: query.q })}
              aria-current={query.category === item.id ? 'true' : undefined}
              className={CATEGORY_LINK}
              scroll={false}
            >
              {item.id ? (
                <MetierIcon id={item.id} className="text-brand-ink size-5" />
              ) : (
                <IconGrid className="text-brand-ink size-5" />
              )}
              {item.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}

function pageList(count: number, current: number): Array<number | 'gap'> {
  if (count <= 7) return Array.from({ length: count }, (_, i) => i + 1);
  const sorted = [...new Set([1, count, current - 1, current, current + 1])]
    .filter((p) => p >= 1 && p <= count)
    .sort((a, b) => a - b);
  const list: Array<number | 'gap'> = [];
  let previous = 0;
  for (const p of sorted) {
    if (previous && p - previous > 1) list.push('gap');
    list.push(p);
    previous = p;
  }
  return list;
}

const ROUND = 'grid size-12 place-items-center rounded-full';

/** Pagination ronde : précédente, numéros, suivante. */
function Pagination({ query, page, pageCount }: { query: DirectoryQuery; page: number; pageCount: number }) {
  if (pageCount <= 1) return null;
  const href = (p: number) => directoryHref({ ...query, page: p });
  return (
    <nav aria-label={t.pagination} className="mt-12 flex justify-center">
      <ul className="flex items-center gap-1.5 sm:gap-2">
        <li>
          {page > 1 ? (
            <Link
              href={href(page - 1)}
              aria-label={t.previous}
              className={cn(ROUND, 'bg-brand text-on-brand')}
            >
              <IconChevronLeft />
            </Link>
          ) : (
            <span aria-hidden="true" className={cn(ROUND, 'bg-brand-200 text-white')}>
              <IconChevronLeft />
            </span>
          )}
        </li>
        {pageList(pageCount, page).map((p, i) =>
          p === 'gap' ? (
            <li key={`gap-${i}`} aria-hidden="true" className="text-ink-muted px-1">
              …
            </li>
          ) : (
            <li key={p}>
              <Link
                href={href(p)}
                aria-label={t.pageLabel(p)}
                aria-current={p === page ? 'page' : undefined}
                className={cn(
                  'font-display grid min-h-12 min-w-11 place-items-center px-2 text-lg font-semibold',
                  p === page ? 'text-ink border-ink border-b-2' : 'text-ink-muted hover:text-ink',
                )}
              >
                {p}
              </Link>
            </li>
          ),
        )}
        <li>
          {page < pageCount ? (
            <Link href={href(page + 1)} aria-label={t.next} className={cn(ROUND, 'bg-brand text-on-brand')}>
              <IconChevronRight />
            </Link>
          ) : (
            <span aria-hidden="true" className={cn(ROUND, 'bg-brand-200 text-white')}>
              <IconChevronRight />
            </span>
          )}
        </li>
      </ul>
    </nav>
  );
}

/**
 * Annuaire des services : catégories à gauche, recherche en pilule et grille de cartes à droite,
 * pagination ronde. Même rendu sur le serveur (adresse sans paramètre) et dans le navigateur
 * (paramètres lus dans l'adresse).
 */
export function ServicesView({
  entries,
  query,
}: {
  entries: ReadonlyArray<ServiceEntry>;
  query: DirectoryQuery;
}) {
  const result = filterServices(entries, query);
  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-8 lg:grid-cols-[16rem_minmax(0,1fr)] lg:gap-10 xl:grid-cols-[18rem_minmax(0,1fr)]">
      <Categories query={query} />
      <div>
        <ServicesSearch q={query.q} category={query.category} />
        <p className="text-small text-ink-muted mt-5 font-medium" aria-live="polite">
          {t.count(result.total)}
        </p>
        {result.items.length ? (
          <ul className="mt-4 grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {result.items.map((entry) => (
              <li key={entry.id}>
                <ServiceCard entry={entry} />
              </li>
            ))}
          </ul>
        ) : (
          <div className="rounded-card border-line bg-surface mt-4 border p-8 text-center">
            <h2 className="font-display text-h3 text-ink font-bold">{t.emptyTitle}</h2>
            <p className="text-ink-muted mt-2">{t.emptyText}</p>
            <Link
              href={directoryHref({})}
              className={buttonClasses({ variant: 'outline', className: 'mt-6' })}
            >
              {t.emptyAction}
            </Link>
          </div>
        )}
        <Pagination query={query} page={result.page} pageCount={result.pageCount} />
      </div>
    </div>
  );
}
