import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';
import { IconShield } from './icons';
import { Skeleton } from './skeleton';

/*
 * Pages publiques ouvertes par un lien personnel, sans compte (paiement, signature) : vues sur téléphone,
 * une feuille blanche centrée sur la toile bleu clair, une seule action principale, et ce qui rassure
 * (sécurité, émetteur) sous la feuille. L'en-tête du site est réduit au logo (`data-header='minimal'`).
 */

/** Cadre de la page : toile, marges, colonne de lecture. */
export function LinkSheetFrame({ children }: { children: ReactNode }) {
  return (
    <div data-header="minimal" className="bg-surface-muted px-gutter py-8 sm:py-14">
      <div className="mx-auto grid w-full max-w-[36rem] gap-5">{children}</div>
    </div>
  );
}

/** La feuille : en-tête (`head`), puis le corps en sections séparées d'un trait. */
export function LinkSheet({
  head,
  children,
  labelledBy,
}: {
  head: ReactNode;
  children?: ReactNode;
  labelledBy?: string;
}) {
  return (
    <article
      aria-labelledby={labelledBy}
      className="rounded-card border-line bg-surface divide-line grid divide-y border shadow-sm"
    >
      <div className="px-5 pt-7 pb-6 sm:px-10 sm:pt-9">{head}</div>
      {children}
    </article>
  );
}

/** Une section du corps de la feuille. */
export function LinkSheetSection({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn('grid gap-4 px-5 py-6 sm:px-10', className)}>{children}</div>;
}

/** Surtitre d'une feuille, avec un pictogramme (bouclier par défaut). */
export function LinkSheetEyebrow({ children, icon }: { children: ReactNode; icon?: ReactNode }) {
  return (
    <p className="text-small text-action-ink flex items-center gap-2 font-semibold">
      {icon ?? <IconShield className="size-4" />}
      {children}
    </p>
  );
}

/** Faits d'une feuille (libellé, valeur) ; les valeurs vides sont omises. */
export function LinkSheetFacts({ rows }: { rows: ReadonlyArray<readonly [string, ReactNode]> }) {
  const shown = rows.filter(([, value]) => value !== null && value !== undefined && value !== '');
  if (!shown.length) return null;
  return (
    <dl className="grid gap-x-6 gap-y-3 sm:grid-cols-[minmax(8rem,auto)_1fr]">
      {shown.map(([label, value]) => (
        <div key={label} className="grid gap-0.5 sm:contents">
          <dt className="text-small text-ink-muted">{label}</dt>
          <dd className="text-ink font-medium break-words tabular-nums">{value}</dd>
        </div>
      ))}
    </dl>
  );
}

/** Issue ou état final (payé, signé, expiré…) : pastille, titre et texte, annoncés à leur apparition. */
export function LinkSheetOutcome({
  tone,
  icon,
  title,
  children,
}: {
  tone: 'success' | 'warning' | 'neutral' | 'danger';
  icon: ReactNode;
  title: string;
  children?: ReactNode;
}) {
  return (
    <div role="status" className="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-x-4 gap-y-2">
      <span
        aria-hidden="true"
        className={cn(
          'pop grid size-11 place-items-center rounded-full sm:row-span-2 sm:self-start',
          tone === 'success' && 'bg-action text-on-action',
          tone === 'warning' && 'bg-warning-soft text-warning',
          tone === 'neutral' && 'bg-surface-sunken text-ink-muted',
          tone === 'danger' && 'bg-danger-soft text-danger',
        )}
      >
        {icon}
      </span>
      <p className="font-display text-ink text-lg font-semibold">{title}</p>
      {/* Sur téléphone, le texte prend toute la largeur, sous la pastille et le titre. */}
      {children ? (
        <div className="text-ink-muted col-span-2 grid gap-2 sm:col-span-1 sm:col-start-2">{children}</div>
      ) : null}
    </div>
  );
}

/** Ce qui rassure, sous la feuille : titre et quelques phrases courtes. */
export function LinkSheetTrust({ title, items }: { title: string; items: readonly string[] }) {
  return (
    <section aria-label={title} className="text-small text-ink-muted grid gap-2 px-1">
      <p className="text-ink flex items-center gap-2 font-semibold">
        <IconShield className="text-action-ink size-4" />
        {title}
      </p>
      <ul className="grid gap-1 pl-6">
        {items.map((item) => (
          <li key={item} className="list-disc">
            {item}
          </li>
        ))}
      </ul>
    </section>
  );
}

/** Squelette de la feuille pendant la première lecture, annoncé une fois par `label`. */
export function LinkSheetSkeleton({ label }: { label: string }) {
  return (
    <div
      role="status"
      className="rounded-card border-line bg-surface grid gap-6 border p-5 shadow-sm sm:p-10"
    >
      <span className="sr-only">{label}</span>
      <Skeleton className="h-4 w-40" />
      <Skeleton className="h-8 w-3/4" />
      <Skeleton className="h-12 w-1/2" />
      <div className="grid gap-3">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-2/3" />
      </div>
      <Skeleton className="h-13 w-full rounded-full" />
    </div>
  );
}
