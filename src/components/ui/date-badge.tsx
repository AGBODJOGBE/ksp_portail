import { BENIN_TIME_ZONE } from '@/lib/format';
import { cn } from '@/lib/cn';

const dayFormat = new Intl.DateTimeFormat('fr-BJ', { timeZone: BENIN_TIME_ZONE, day: 'numeric' });
const monthFormat = new Intl.DateTimeFormat('fr-BJ', { timeZone: BENIN_TIME_ZONE, month: 'short' });

/**
 * Date-calendrier : le mois sur un bandeau bleu nuit, le jour en grand (heure du Bénin). Décoratif :
 * la date complète est toujours écrite à côté (texte de l'événement).
 */
export function DateBadge({
  iso,
  tone = 'brand',
  className,
}: {
  iso: string;
  /** `action` : prochain rendez-vous ; `danger` : échéance passée. */
  tone?: 'brand' | 'action' | 'danger';
  className?: string;
}) {
  const date = new Date(iso);
  return (
    <span
      aria-hidden="true"
      className={cn(
        'bg-surface ring-line grid h-fit w-12 shrink-0 self-start overflow-hidden rounded-xl text-center ring-1 ring-inset',
        className,
      )}
    >
      <span
        className={cn(
          'py-0.5 text-[0.6875rem] leading-4 font-bold tracking-wider uppercase',
          tone === 'action' && 'bg-action text-on-action',
          tone === 'danger' && 'bg-danger text-white',
          tone === 'brand' && 'bg-brand text-on-brand',
        )}
      >
        {monthFormat.format(date).replace('.', '')}
      </span>
      <span className="font-display text-ink text-xl leading-8 font-semibold tabular-nums">
        {dayFormat.format(date)}
      </span>
    </span>
  );
}
