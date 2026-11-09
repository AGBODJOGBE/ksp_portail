import type { ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { FormMessage } from '@/components/ui/field';
import { Illustration, type IllustrationName } from '@/components/ui/illustrations';
import { Skeleton } from '@/components/ui/skeleton';
import type { PagedList } from '@/lib/use-paged-list';

export interface PagedListLabels {
  loading: string;
  retry: string;
  loadMore: string;
  loadingMore: string;
}

/** États communs d'une liste paginée : chargement, erreur avec « Réessayer », vide, « Afficher plus ». */
export function PagedListState<T>({
  list,
  empty,
  labels: t,
  children,
  emptyIllustration = 'soon',
}: {
  list: PagedList<T>;
  empty: ReactNode;
  labels: PagedListLabels;
  children: ReactNode;
  /** Illustration de la liste vide (`soon` : rien encore ; `done` : tout est traité). */
  emptyIllustration?: IllustrationName;
}) {
  if (list.loading && !list.items.length) {
    return (
      <div role="status" className="grid gap-3">
        <span className="sr-only">{t.loading}</span>
        {[0, 1, 2].map((row) => (
          <span
            key={row}
            aria-hidden="true"
            className="rounded-card border-line bg-surface grid gap-2.5 border p-4 shadow-xs sm:p-5"
          >
            <Skeleton className="h-4 w-2/3 max-w-xs" />
            <Skeleton className="h-3 w-1/2 max-w-[14rem]" />
          </span>
        ))}
      </div>
    );
  }
  return (
    <div className="grid gap-4">
      {list.items.length ? (
        children
      ) : list.error ? null : (
        // Liste vide : carte blanche avec une petite illustration aux couleurs du logo.
        <div className="rounded-card border-line bg-surface flex items-center gap-5 border p-5 shadow-xs sm:p-6">
          <Illustration name={emptyIllustration} className="w-20 shrink-0 max-sm:hidden" />
          <div className="min-w-0 flex-1">{empty}</div>
        </div>
      )}
      {list.error ? (
        <div className="grid justify-items-start gap-3">
          <FormMessage>{list.error}</FormMessage>
          <Button variant="secondary" onClick={list.retry}>
            {t.retry}
          </Button>
        </div>
      ) : null}
      {list.hasMore && !list.error ? (
        <Button
          variant="secondary"
          className="justify-self-start"
          onClick={list.loadMore}
          aria-busy={list.loadingMore || undefined}
        >
          {list.loadingMore ? t.loadingMore : t.loadMore}
        </Button>
      ) : null}
    </div>
  );
}
