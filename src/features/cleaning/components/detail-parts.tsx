import type { ReactNode } from 'react';
import { Badge, type BadgeTone } from '@/components/ui/badge';
import { Button, ButtonLink } from '@/components/ui/button';
import { FormMessage } from '@/components/ui/field';
import { Heading } from '@/components/ui/heading';
import { IconArrowLeft } from '@/components/ui/icons';
import { cleaningPaths } from '@/features/cleaning/paths';
import { cleaningTexts } from '@/features/cleaning/texts';
import { frenchSpacing } from '@/lib/typography';

/** Briques communes aux écrans de détail (demande, mission). */

export function BackLink() {
  return (
    <ButtonLink href={cleaningPaths.space} variant="ghost" className="-ml-3 justify-self-start">
      <IconArrowLeft />
      {cleaningTexts.common.back}
    </ButtonLink>
  );
}

/** En-tête d'un détail : titre, état (libellé, et ce qui se passe ensuite), étiquette éventuelle. */
export function DetailHeader({
  title,
  subtitle,
  status,
  tag,
}: {
  title: string;
  subtitle: string;
  status: { label: string; tone: BadgeTone; hint?: string };
  /** Par exemple « Entreprise » pour une demande ou une mission d'organisation. */
  tag?: string;
}) {
  return (
    <div className="grid gap-3">
      <BackLink />
      <div className="flex flex-wrap items-center gap-3">
        <Heading as="h1" size="h2">
          {title}
        </Heading>
        <Badge tone={status.tone}>{status.label}</Badge>
        {tag ? <Badge>{tag}</Badge> : null}
      </div>
      <p className="text-ink-muted">{subtitle}</p>
      {status.hint ? <p className="text-ink">{frenchSpacing(status.hint)}</p> : null}
    </div>
  );
}

export function Panel({ title, id, children }: { title: string; id: string; children: ReactNode }) {
  return (
    <section
      aria-labelledby={id}
      className="rounded-card border-line bg-surface grid gap-4 border p-5 sm:p-6"
    >
      <Heading as="h2" size="h3" id={id}>
        {title}
      </Heading>
      {children}
    </section>
  );
}

/** Liste de couples libellé / valeur ; une valeur vide n'est pas affichée. */
export function Facts({ rows }: { rows: ReadonlyArray<readonly [string, ReactNode]> }) {
  return (
    <dl className="grid gap-x-6 gap-y-2 sm:grid-cols-[11rem_1fr]">
      {rows
        .filter(([, value]) => value !== null && value !== undefined && value !== '')
        .map(([label, value]) => (
          <div key={label} className="contents">
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

/** Squelette d'un détail (en-tête puis deux panneaux), annoncé comme chargement. */
export function Loading() {
  return (
    <div role="status" className="grid gap-8">
      <span className="sr-only">{cleaningTexts.space.loading}</span>
      <div className="grid gap-3" aria-hidden="true">
        <div className={`${BONE} h-11 w-48`} />
        <div className={`${BONE} h-9 w-3/4 max-w-md`} />
        <div className={`${BONE} h-5 w-1/2 max-w-sm`} />
      </div>
      <div className={`${BONE} rounded-card h-40`} aria-hidden="true" />
      <div className={`${BONE} rounded-card h-56`} aria-hidden="true" />
    </div>
  );
}
