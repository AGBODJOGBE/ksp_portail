import type { ReactNode } from 'react';
import { Badge, type BadgeTone } from '@/components/ui/badge';
import { Button, ButtonLink } from '@/components/ui/button';
import { FormMessage } from '@/components/ui/field';
import { Heading } from '@/components/ui/heading';
import { IconArrowLeft } from '@/components/ui/icons';
import { cleaningPaths } from '@/features/cleaning/paths';
import { cleaningTexts } from '@/features/cleaning/texts';

/** Briques communes aux écrans de détail (demande, mission). */

export function BackLink() {
  return (
    <ButtonLink href={cleaningPaths.space} variant="ghost" className="-ml-3 justify-self-start">
      <IconArrowLeft />
      {cleaningTexts.common.back}
    </ButtonLink>
  );
}

export function DetailHeader({
  title,
  subtitle,
  status,
}: {
  title: string;
  subtitle: string;
  status: { label: string; tone: BadgeTone };
}) {
  return (
    <div className="grid gap-3">
      <BackLink />
      <div className="flex flex-wrap items-center gap-3">
        <Heading as="h1" size="h2">
          {title}
        </Heading>
        <Badge tone={status.tone}>{status.label}</Badge>
      </div>
      <p className="text-ink-muted">{subtitle}</p>
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

export function Loading() {
  return (
    <p role="status" className="text-ink-muted">
      {cleaningTexts.space.loading}
    </p>
  );
}
