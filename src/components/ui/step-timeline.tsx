import type { CSSProperties, ReactNode } from 'react';
import { IconCheck } from '@/components/ui/icons';
import { cn } from '@/lib/cn';

/**
 * Frise d'étapes ordonnées d'un dossier : verticale sur téléphone, horizontale à partir de 1024 px.
 * Étapes franchies cochées, étape en cours mise en évidence (`aria-current="step"`), étapes à venir
 * atténuées ; `stopped` : dossier arrêté sur l'étape en cours (annulé, refusé…). L'action de l'étape en
 * cours (`children`) suit la frise : une seule action principale à la fois.
 */
export function StepTimeline({
  steps,
  current,
  stopped = false,
  label,
  currentLabel,
  stoppedLabel,
  children,
  className,
}: {
  steps: ReadonlyArray<string>;
  /** Index de l'étape en cours ; `steps.length` : tout est fait. */
  current: number;
  stopped?: boolean;
  /** Nom accessible de la frise (« Avancement de la prestation »). */
  label: string;
  /** « Étape en cours », lu avec l'étape mise en évidence. */
  currentLabel: string;
  stoppedLabel: string;
  children?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn('rounded-card border-line bg-surface grid gap-5 border p-5 shadow-xs sm:p-6', className)}
    >
      <ol
        aria-label={label}
        className="grid gap-0 lg:grid-cols-[repeat(var(--steps),minmax(0,1fr))] lg:gap-2"
        style={{ '--steps': steps.length } as CSSProperties}
      >
        {steps.map((step, index) => {
          const state = index < current ? 'done' : index === current ? 'current' : 'upcoming';
          const halted = stopped && state === 'current';
          return (
            <li
              key={step}
              aria-current={state === 'current' ? 'step' : undefined}
              className={cn(
                'relative grid grid-cols-[2rem_minmax(0,1fr)] items-center gap-x-3 pb-4 last:pb-0',
                'lg:grid-cols-1 lg:content-start lg:items-start lg:justify-items-center lg:gap-y-2 lg:pb-0 lg:text-center',
                // Fil entre deux étapes : vertical sur téléphone, horizontal sur ordinateur.
                'before:absolute before:top-8 before:bottom-0 before:left-[0.9375rem] before:w-0.5 last:before:hidden',
                'lg:before:top-[0.9375rem] lg:before:right-[calc(-50%+1.25rem)] lg:before:bottom-auto lg:before:left-[calc(50%+1.25rem)] lg:before:h-0.5 lg:before:w-auto',
                index < current ? 'before:bg-action' : 'before:bg-line-strong',
              )}
            >
              <span
                aria-hidden="true"
                className={cn(
                  'relative z-[1] grid size-8 place-items-center rounded-full text-xs font-semibold tabular-nums',
                  state === 'done' && 'bg-action text-on-action',
                  state === 'current' && !halted && 'bg-brand text-on-brand ring-brand-muted ring-4',
                  halted && 'bg-surface-sunken text-ink-muted ring-line-strong ring-2',
                  state === 'upcoming' && 'bg-surface text-ink-subtle ring-line-strong ring-1',
                )}
              >
                {state === 'done' ? <IconCheck className="size-4" /> : index + 1}
              </span>
              <span
                className={cn(
                  'text-small leading-snug',
                  state === 'upcoming' ? 'text-ink-subtle' : 'text-ink',
                  state === 'current' && 'font-semibold',
                )}
              >
                {step}
                <span className="sr-only">
                  {state === 'done'
                    ? ' (terminée)'
                    : state === 'current'
                      ? ` (${halted ? stoppedLabel : currentLabel})`
                      : ' (à venir)'}
                </span>
                {state === 'current' ? (
                  <span
                    aria-hidden="true"
                    className={cn(
                      'block text-xs font-medium lg:mt-0.5',
                      halted ? 'text-ink-muted' : 'text-action-ink',
                    )}
                  >
                    {halted ? stoppedLabel : currentLabel}
                  </span>
                ) : null}
              </span>
            </li>
          );
        })}
      </ol>
      {children ? <div className="border-line border-t pt-5">{children}</div> : null}
    </div>
  );
}
