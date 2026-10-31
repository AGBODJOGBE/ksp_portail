import type { ReactNode } from 'react';
import { Heading } from '@/components/ui/heading';
import { cn } from '@/lib/cn';
import { frenchSpacing } from '@/lib/typography';

/** Briques communes aux écrans du compte (profil, comptes entreprise). */

export function Section({
  id,
  title,
  lead,
  children,
}: {
  id: string;
  title: string;
  lead?: string;
  children: ReactNode;
}) {
  return (
    <section
      aria-labelledby={id}
      className="rounded-card border-line bg-surface grid gap-4 border p-5 sm:p-6"
    >
      <div>
        <Heading as="h2" size="h3" id={id}>
          {title}
        </Heading>
        {lead ? <p className="text-ink-muted mt-2">{frenchSpacing(lead)}</p> : null}
      </div>
      {children}
    </section>
  );
}

/** Une information (libellé et valeur) dans une liste `<dl>`. */
export function Fact({
  label,
  value,
  hint,
  numeric = false,
}: {
  label: string;
  value: ReactNode;
  hint?: string;
  numeric?: boolean;
}) {
  return (
    <div>
      <dt className="text-small text-ink-muted">{label}</dt>
      <dd className={cn('text-ink mt-1 font-semibold break-words', numeric && 'tabular-nums')}>{value}</dd>
      {hint ? <dd className="text-small text-ink-muted mt-1">{hint}</dd> : null}
    </div>
  );
}

export function Loading({ label }: { label: string }) {
  return (
    <p role="status" className="text-ink-muted">
      {label}
    </p>
  );
}
