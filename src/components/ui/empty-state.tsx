import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';
import { Illustration, type IllustrationName } from './illustrations';

/**
 * État vide illustré : une petite illustration aux couleurs du logo, un titre facultatif, le texte qui
 * dit ce qui se passe ensuite, et au besoin une action. `compact` : en ligne, dans un panneau.
 */
export function EmptyState({
  illustration,
  title,
  titleAs: TitleTag = 'p',
  titleId,
  children,
  action,
  compact = false,
  className,
}: {
  illustration?: IllustrationName;
  title?: ReactNode;
  /** Niveau du titre quand il ouvre une section (`h2`, `h3`) ; un simple paragraphe sinon. */
  titleAs?: 'p' | 'h2' | 'h3';
  titleId?: string;
  children: ReactNode;
  action?: ReactNode;
  compact?: boolean;
  className?: string;
}) {
  return (
    <div
      className={cn(
        compact ? 'flex items-center gap-4 sm:gap-5' : 'grid justify-items-start gap-4',
        className,
      )}
    >
      {/* Compact (dans un panneau) : pastille cochée discrète ; sinon, illustration pleine. */}
      <Illustration
        name={illustration ?? (compact ? 'check' : 'done')}
        className={compact ? 'w-14 sm:w-16' : 'w-40 sm:w-44'}
      />
      <div className="grid min-w-0 justify-items-start gap-1">
        {title ? (
          <TitleTag id={titleId} className="font-display text-ink text-lg leading-snug font-semibold">
            {title}
          </TitleTag>
        ) : null}
        <p className={cn('text-ink-muted', compact && 'text-small')}>{children}</p>
        {action ? <div className="mt-3">{action}</div> : null}
      </div>
    </div>
  );
}
