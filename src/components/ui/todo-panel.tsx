import Link from 'next/link';
import type { ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { FormMessage } from '@/components/ui/field';
import { Heading } from '@/components/ui/heading';
import { IconArrowRight, IconCheck } from '@/components/ui/icons';
import { cn } from '@/lib/cn';

/*
 * Tableau de bord d'un espace connecté : un panneau par service, ce qui attend une action du client en
 * premier (liseré vert), puis le résumé de ce qui est en cours chez KSP.
 */

export function TodoPanel({
  id,
  title,
  icon,
  link,
  children,
}: {
  id: string;
  title: string;
  icon: ReactNode;
  /** Lien « tout voir » vers l'écran du service. */
  link: { href: string; label: string };
  children: ReactNode;
}) {
  return (
    <section
      aria-labelledby={id}
      className="rounded-card border-line bg-surface grid gap-4 border p-5 shadow-xs sm:p-6"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span
            aria-hidden="true"
            className="rounded-control bg-accent-soft text-accent-ink ring-accent-muted grid size-10 place-items-center ring-1 ring-inset"
          >
            {icon}
          </span>
          <Heading as="h3" size="h3" id={id}>
            {title}
          </Heading>
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

/** Élément qui attend le client : ce qu'il faut faire, et le bouton pour le faire. */
export function TodoItem({
  title,
  text,
  badge,
  action,
}: {
  title: string;
  text: string;
  badge?: ReactNode;
  action: { href: string; label: string };
}) {
  return (
    <li className="rounded-control border-line border-l-action grid gap-3 border border-l-4 p-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
      <div className="grid gap-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-ink font-semibold">{title}</p>
          {badge}
        </div>
        <p className="text-small text-ink-muted">{text}</p>
      </div>
      <Link
        href={action.href}
        className="bg-action text-on-action rounded-control focus-visible:outline-focus inline-flex min-h-11 items-center justify-center gap-2 px-4 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-offset-2"
      >
        {action.label}
        <IconArrowRight className="size-4" />
      </Link>
    </li>
  );
}

/** Rien n'attend le client pour ce service. */
export function TodoNone({ children }: { children: ReactNode }) {
  return (
    <p className="text-ink-muted flex items-center gap-2">
      <IconCheck className="text-action-ink size-5" />
      {children}
    </p>
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
  if (loading) {
    return (
      <div role="status" className="grid gap-2">
        <span className="sr-only">{loadingLabel}</span>
        {[0, 1].map((row) => (
          <span
            key={row}
            aria-hidden="true"
            className={cn(
              'bg-surface-sunken rounded-control block h-16 animate-pulse motion-reduce:animate-none',
            )}
          />
        ))}
      </div>
    );
  }
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
