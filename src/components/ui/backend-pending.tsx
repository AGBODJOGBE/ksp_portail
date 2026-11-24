import type { ReactNode } from 'react';
import { Badge } from '@/components/ui/badge';
import { IconClock } from '@/components/ui/icons';
import { Illustration } from '@/components/ui/illustrations';
import { cn } from '@/lib/cn';

export type BackendNeedMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

/** Route du contrat que le backend doit servir pour que la section s'active. */
export interface BackendNeed {
  method: BackendNeedMethod;
  /** Chemin du contrat, par exemple `/api/v1/billing/preferences`. */
  path: string;
  /** Ce que la route apporte à l'écran. */
  purpose: string;
}

/**
 * Section dont la route n'est pas encore servie par le backend (`isBackendPending` de `@/lib/api`) :
 * « Bientôt disponible » et une phrase pour le client, jamais une erreur. Hors production seulement, le
 * bloc « Ce que le back doit fournir » liste les routes attendues (méthode, chemin, rôle) ; en
 * production, aucun détail technique n'est montré (décision validée le 24 novembre 2026).
 * Repérable par `data-backend-pending` (inventaire avant mise en ligne).
 */
export function BackendPending({
  id,
  title,
  children,
  needs,
  headingAs: Title = 'h2',
  className,
}: {
  /** Identifiant de la section ; le titre reçoit `<id>-titre`. */
  id: string;
  title: string;
  /** Phrase pour le client : ce qui arrive bientôt, et quoi faire en attendant. */
  children: ReactNode;
  needs: ReadonlyArray<BackendNeed>;
  headingAs?: 'h2' | 'h3';
  className?: string;
}) {
  const titleId = `${id}-titre`;
  // Lu au rendu (et non au chargement du module) : Next remplace NODE_ENV au build, le bloc disparaît
  // du code de production.
  const showNeeds = process.env.NODE_ENV !== 'production' && needs.length > 0;
  return (
    <section
      id={id}
      aria-labelledby={titleId}
      data-backend-pending=""
      className={cn('rounded-panel border-line bg-surface border p-5 shadow-xs sm:p-6', className)}
    >
      <div className="flex items-start gap-4 sm:gap-5">
        <Illustration name="soon" className="w-16 shrink-0 max-sm:hidden" />
        <div className="grid min-w-0 justify-items-start gap-2">
          <Badge tone="accent">
            <IconClock className="size-3.5" />
            Bientôt disponible
          </Badge>
          <Title id={titleId} className="font-display text-ink text-lg leading-snug font-semibold">
            {title}
          </Title>
          <p className="text-ink-muted">{children}</p>
        </div>
      </div>
      {showNeeds ? (
        <div
          data-backend-needs=""
          className="rounded-card border-line-strong bg-surface-muted mt-5 border border-dashed p-4"
        >
          <p className="text-small text-ink font-semibold">Ce que le back doit fournir</p>
          <p className="text-ink-muted text-xs">Visible hors production seulement.</p>
          <ul className="mt-3 grid gap-3">
            {needs.map((need) => (
              <li key={`${need.method} ${need.path}`} className="grid gap-0.5">
                <code className="text-small text-ink break-all">
                  <span className="font-semibold">{need.method}</span> {need.path}
                </code>
                <span className="text-small text-ink-muted">{need.purpose}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
}
