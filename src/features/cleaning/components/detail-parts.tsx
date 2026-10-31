import type { ReactNode } from 'react';
import { SignatureArrow } from '@/components/ui/brand/signature';
import { Badge, type BadgeTone } from '@/components/ui/badge';
import { Button, ButtonLink } from '@/components/ui/button';
import { FormMessage } from '@/components/ui/field';
import { Heading } from '@/components/ui/heading';
import { IconArrowLeft, IconCheck, IconClock, IconUser } from '@/components/ui/icons';
import { cn } from '@/lib/cn';
import { cleaningPaths } from '@/features/cleaning/paths';
import { type Actor, actorLabels, cleaningTexts } from '@/features/cleaning/texts';
import { frenchSpacing } from '@/lib/typography';

/** Briques communes aux écrans de « Mes prestations de nettoyage » (liste, demande, mission). */

export function BackLink() {
  return (
    <ButtonLink href={cleaningPaths.space} variant="ghost" className="-ml-3 justify-self-start">
      <IconArrowLeft />
      {cleaningTexts.common.back}
    </ButtonLink>
  );
}

/** Étiquette de l'acteur attendu : « À vous d'agir » (vert) ou « KSP s'en occupe » (bleu nuit). */
export function ActorBadge({ actor }: { actor: Actor }) {
  return (
    <Badge tone={actor === 'client' ? 'action' : 'brand'} dot>
      {actorLabels[actor]}
    </Badge>
  );
}

/**
 * En-tête d'un détail : retour, titre, état (étiquette), étiquette éventuelle (« Entreprise »), sous-titre,
 * puis le fil de progression du parcours (`progress`).
 */
export function DetailHeader({
  title,
  subtitle,
  status,
  tag,
  progress,
}: {
  title: string;
  subtitle: string;
  status: { label: string; tone: BadgeTone };
  /** Par exemple « Entreprise » pour une demande ou une mission d'organisation. */
  tag?: string;
  progress?: ReactNode;
}) {
  return (
    <div className="grid gap-4">
      <BackLink />
      <div className="grid gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone={status.tone} dot>
            {status.label}
          </Badge>
          {tag ? <Badge>{tag}</Badge> : null}
        </div>
        <Heading as="h1" size="h2">
          {title}
        </Heading>
        <p className="text-ink-muted">{subtitle}</p>
      </div>
      {progress ? (
        <div className="rounded-card border-line bg-surface border p-4 sm:p-5">{progress}</div>
      ) : null}
    </div>
  );
}

/**
 * Prochaine étape d'un dossier : ce qui va se passer et qui doit agir. Mise en avant (bordure verte)
 * quand le client doit agir ; `children` : l'action proposée.
 */
export function NextStep({
  actor,
  text,
  title = cleaningTexts.journey.nextStep,
  children,
}: {
  actor?: Actor;
  text: string;
  title?: string;
  children?: ReactNode;
}) {
  const yours = actor === 'client';
  return (
    <section
      aria-label={title}
      className={cn(
        'rounded-card grid gap-4 border p-5 sm:grid-cols-[auto_1fr] sm:gap-5 sm:p-6',
        yours ? 'border-action bg-action-soft' : 'border-line bg-surface-muted',
      )}
    >
      <span
        aria-hidden="true"
        className={cn(
          'grid size-11 place-items-center rounded-full',
          yours ? 'bg-action text-on-action' : 'bg-brand-soft text-brand-ink',
        )}
      >
        {yours ? (
          <IconUser className="size-5" />
        ) : actor === 'ksp' ? (
          <IconClock className="size-5" />
        ) : (
          <IconCheck className="size-5" />
        )}
      </span>
      <div className="grid gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-ink inline-flex items-center gap-2 font-semibold">
            <SignatureArrow className="h-2.5 w-2" />
            {title}
          </p>
          {actor ? <ActorBadge actor={actor} /> : null}
        </div>
        <p className="text-ink">{frenchSpacing(text)}</p>
        {children ? <div className="flex flex-wrap gap-3">{children}</div> : null}
      </div>
    </section>
  );
}

export function Panel({
  title,
  id,
  children,
  action,
  className,
}: {
  title: string;
  id: string;
  children: ReactNode;
  /** Action placée à droite du titre. */
  action?: ReactNode;
  className?: string;
}) {
  return (
    <section
      aria-labelledby={id}
      className={cn('rounded-card border-line bg-surface grid gap-5 border p-5 shadow-xs sm:p-6', className)}
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Heading as="h2" size="h3" id={id}>
          {title}
        </Heading>
        {action}
      </div>
      {children}
    </section>
  );
}

/**
 * Liste de couples libellé / valeur ; une valeur vide n'est pas affichée. `stacked` : libellé au-dessus
 * de la valeur, pour une colonne étroite (panneau latéral).
 */
export function Facts({
  rows,
  stacked = false,
}: {
  rows: ReadonlyArray<readonly [string, ReactNode]>;
  stacked?: boolean;
}) {
  return (
    <dl className="divide-line grid divide-y">
      {rows
        .filter(([, value]) => value !== null && value !== undefined && value !== '')
        .map(([label, value]) => (
          <div
            key={label}
            className={cn(
              'grid gap-1 py-2.5 first:pt-0 last:pb-0',
              !stacked && 'sm:grid-cols-[12rem_1fr] sm:gap-6',
            )}
          >
            <dt className="text-small text-ink-muted">{label}</dt>
            <dd className="text-ink font-medium">{value}</dd>
          </div>
        ))}
    </dl>
  );
}

export function LoadError({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="grid justify-items-start gap-4">
      <BackLink />
      <FormMessage>{message}</FormMessage>
      {onRetry ? (
        <Button variant="secondary" onClick={onRetry}>
          {cleaningTexts.common.retry}
        </Button>
      ) : null}
    </div>
  );
}

const BONE = 'bg-surface-sunken rounded-control animate-pulse motion-reduce:animate-none';

/** Squelette d'un détail (en-tête, fil de progression, deux panneaux), annoncé comme chargement. */
export function Loading() {
  return (
    <div role="status" className="grid gap-8">
      <span className="sr-only">{cleaningTexts.space.loading}</span>
      <div className="grid gap-3" aria-hidden="true">
        <div className={`${BONE} h-11 w-48`} />
        <div className={`${BONE} h-6 w-32 rounded-full`} />
        <div className={`${BONE} h-9 w-3/4 max-w-md`} />
        <div className={`${BONE} h-5 w-1/2 max-w-sm`} />
      </div>
      <div className={`${BONE} rounded-card h-20`} aria-hidden="true" />
      <div className={`${BONE} rounded-card h-40`} aria-hidden="true" />
      <div className={`${BONE} rounded-card h-56`} aria-hidden="true" />
    </div>
  );
}
