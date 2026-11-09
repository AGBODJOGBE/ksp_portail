import Link from 'next/link';
import type { ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { FormMessage } from '@/components/ui/field';
import { IconArrowRight } from '@/components/ui/icons';
import { ActionCard } from './action-card';
import { CountUp } from './figure-tile';
import { EmptyState } from './empty-state';
import { SkeletonCards } from './skeleton';

/*
 * Tableau de bord d'un espace connecté (direction « Signature ») : un groupe par service, ce qui attend
 * une action du client en cartes d'action à liseré, puis le résumé de ce qui est en cours chez KSP.
 */

export function TodoPanel({
  id,
  title,
  icon,
  link,
  count,
  children,
}: {
  id: string;
  title: string;
  icon: ReactNode;
  /** Lien « tout voir » vers l'écran du service. */
  link: { href: string; label: string };
  /** Nombre d'éléments qui attendent le client (pastille du titre), quand il est connu. */
  count?: number;
  children: ReactNode;
}) {
  return (
    <section aria-labelledby={id} className="grid gap-4">
      <div className="border-line flex flex-wrap items-center justify-between gap-x-3 border-b pb-1">
        <div className="flex items-center gap-2.5">
          <h3
            id={id}
            className="text-ink-muted flex items-center gap-2.5 text-[0.8125rem] font-bold tracking-[0.12em] uppercase"
          >
            <span aria-hidden="true" className="text-brand-ink">
              {icon}
            </span>
            {title}
          </h3>
          {/* Repère visuel seulement : la liste annonce déjà ses éléments. */}
          {count ? (
            <span
              aria-hidden="true"
              className="bg-brand text-on-brand inline-grid min-w-6 place-items-center rounded-full px-1.5 text-xs leading-6 font-bold"
            >
              <CountUp value={count} />
            </span>
          ) : null}
        </div>
        <Link
          href={link.href}
          className="group/link text-action-ink inline-flex min-h-11 items-center gap-1.5 text-sm font-semibold underline-offset-4 hover:underline"
        >
          {link.label}
          <IconArrowRight className="ease-soft size-4 transition-transform duration-(--motion-base) group-hover/link:translate-x-0.5" />
        </Link>
      </div>
      {children}
    </section>
  );
}

/** Élément qui attend le client : ce qu'il faut faire, et le bouton pour le faire (carte d'action). */
export function TodoItem({
  title,
  text,
  badge,
  action,
  media,
  figure,
  children,
}: {
  title: string;
  text: string;
  badge?: ReactNode;
  action: { href: string; label: string };
  media?: ReactNode;
  figure?: { label: string; value: string };
  children?: ReactNode;
}) {
  return (
    <ActionCard title={title} text={text} badge={badge} action={action} media={media} figure={figure}>
      {children}
    </ActionCard>
  );
}

/** Rien n'attend le client pour ce service : état vide illustré, en ligne. */
export function TodoNone({ children }: { children: ReactNode }) {
  return (
    <EmptyState compact className="py-1">
      {children}
    </EmptyState>
  );
}

/** Chargement (squelette) ou erreur d'un panneau, avec « Réessayer ». */
export function TodoState({
  loading,
  error,
  loadingLabel,
  retryLabel,
  onRetry,
}: {
  loading: boolean;
  error: string | null;
  loadingLabel: string;
  retryLabel: string;
  onRetry: () => void;
}) {
  if (loading) return <SkeletonCards label={loadingLabel} />;
  if (!error) return null;
  return (
    <div className="grid justify-items-start gap-3">
      <FormMessage>{error}</FormMessage>
      <Button variant="secondary" onClick={onRetry}>
        {retryLabel}
      </Button>
    </div>
  );
}
