import type { ReactNode } from 'react';
import { Button, ButtonArrow } from '@/components/ui/button';
import { IconArrowLeft, IconArrowRight } from '@/components/ui/icons';
import { cn } from '@/lib/cn';

/*
 * Assistant à étapes des espaces connectés (demande de devis du Nettoyage, dossier du Recouvrement) :
 * fil des étapes avec sa barre de progression, et boutons « Retour » / « Continuer » fixés en bas de
 * l'écran du téléphone. Les textes viennent de la fonctionnalité.
 */

/** Fil des étapes : « Étape n sur N » et la barre de progression, les noms sous la barre sur ordinateur. */
export function WizardProgress({
  steps,
  index,
  progressLabel,
}: {
  /** Noms des étapes, dans l'ordre. */
  steps: ReadonlyArray<string>;
  /** Rang de l'étape en cours (0 pour la première). */
  index: number;
  /** « Étape 2 sur 7 ». */
  progressLabel: string;
}) {
  return (
    <div className="grid gap-3">
      <p className="text-small text-ink-muted font-semibold">
        {progressLabel}
        {/* Sur téléphone, le nom de l'étape suit le compteur (les libellés sous la barre sont masqués). */}
        <span className="text-ink sm:hidden" aria-hidden="true">
          {` · ${steps[index] ?? ''}`}
        </span>
      </p>
      <ol
        className="grid gap-1.5"
        style={{ gridTemplateColumns: `repeat(${steps.length}, minmax(0, 1fr))` }}
        aria-label={progressLabel}
      >
        {steps.map((name, position) => (
          <li key={name} className="grid gap-1.5">
            <span
              aria-hidden="true"
              className={cn(
                'h-1.5 rounded-full',
                position < index ? 'bg-action' : position === index ? 'bg-action progress-grow' : 'bg-line',
              )}
            />
            <span
              className={cn(
                'text-xs leading-tight',
                'max-sm:sr-only',
                position === index ? 'text-ink font-semibold' : 'text-ink-muted',
              )}
            >
              <span className="sr-only">
                {position < index ? 'Faite : ' : position === index ? 'En cours : ' : 'À venir : '}
              </span>
              {name}
            </span>
          </li>
        ))}
      </ol>
    </div>
  );
}

/** Boutons « Retour » et « Continuer » (ou l'envoi), fixés en bas de l'écran du téléphone. */
export function WizardNav({
  showBack,
  busy,
  backLabel,
  nextLabel,
  arrow = true,
  onBack,
  onNext,
  extra,
}: {
  showBack: boolean;
  busy: boolean;
  backLabel: string;
  nextLabel: string;
  /** Flèche du bouton principal (pas sur l'envoi). */
  arrow?: boolean;
  onBack: () => void;
  onNext: () => void;
  /** Action secondaire entre les deux boutons (« Enregistrer le brouillon »). */
  extra?: ReactNode;
}) {
  return (
    <div className="border-line bg-surface/95 sticky bottom-0 z-30 -mx-4 flex items-center justify-between gap-3 border-t px-4 py-3 backdrop-blur sm:static sm:mx-0 sm:border-0 sm:bg-transparent sm:p-0 sm:backdrop-blur-none">
      {showBack ? (
        <Button variant="secondary" onClick={onBack} disabled={busy}>
          <IconArrowLeft />
          {backLabel}
        </Button>
      ) : (
        <span />
      )}
      {extra}
      <Button variant="action" size="lg" onClick={onNext} disabled={busy} aria-busy={busy || undefined}>
        {nextLabel}
        {arrow ? (
          <ButtonArrow>
            <IconArrowRight />
          </ButtonArrow>
        ) : null}
      </Button>
    </div>
  );
}
