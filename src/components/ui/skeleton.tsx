import { cn } from '@/lib/cn';

/** Bloc de squelette : forme atténuée, reflet qui passe (arrêté sous mouvement réduit). Décoratif. */
export function Skeleton({ className }: { className?: string }) {
  return <span aria-hidden="true" className={cn('skeleton rounded-control block', className)} />;
}

/**
 * Squelette d'une liste de cartes (chargement d'un panneau) : `rows` cartes, annoncées une seule fois
 * aux lecteurs d'écran par `label`.
 */
export function SkeletonCards({
  label,
  rows = 2,
  media = true,
  className,
}: {
  label: string;
  rows?: number;
  /** Tuile d'icône à gauche, comme une carte d'action. */
  media?: boolean;
  className?: string;
}) {
  return (
    <div role="status" className={cn('grid gap-3', className)}>
      <span className="sr-only">{label}</span>
      {Array.from({ length: rows }, (_, row) => (
        <span
          key={row}
          aria-hidden="true"
          className="rounded-card border-line bg-surface flex items-center gap-4 border p-4 sm:p-5"
        >
          {media ? <Skeleton className="rounded-icon size-11 shrink-0" /> : null}
          <span className="grid flex-1 gap-2">
            <Skeleton className="h-4 w-2/3 max-w-xs" />
            <Skeleton className="h-3 w-1/2 max-w-[14rem]" />
          </span>
        </span>
      ))}
    </div>
  );
}
