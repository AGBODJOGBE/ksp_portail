import Link from 'next/link';
import type { CSSProperties } from 'react';
import { IconArrowRight } from '@/components/ui/icons';
import { cn } from '@/lib/cn';
import { DateBadge } from './date-badge';

export interface AgendaEntry {
  key: string;
  /** Date ISO 8601 de l'événement (visite, passage, échéance). */
  date: string;
  /**
   * Date et heure écrites (« 12 novembre 2026 à 10:00 ») quand le texte ne les donne pas déjà : le
   * calendrier n'est qu'un repère.
   */
  when?: string;
  title: string;
  text?: string;
  link?: { href: string; label: string };
  /** `next` : le prochain rendez-vous ; `late` : échéance passée. */
  state?: 'next' | 'late' | 'default';
}

/**
 * Chronologie « Votre agenda » : les rendez-vous datés, du plus proche au plus lointain, reliés par un
 * fil aux couleurs de la signature ; chaque date est un petit calendrier. Liste ordonnée accessible :
 * la date écrite et le titre suffisent, le calendrier et le fil sont décoratifs.
 */
export function Agenda({
  entries,
  label,
  className,
}: {
  entries: ReadonlyArray<AgendaEntry>;
  /** Nom accessible de la liste (« Votre agenda »). */
  label: string;
  className?: string;
}) {
  return (
    <ol aria-label={label} className={cn('relative grid gap-5', className)}>
      {entries.length > 1 ? (
        <span
          aria-hidden="true"
          className="grow-y from-signature-1 via-signature-2 to-signature-3 absolute top-6 bottom-6 left-[1.4375rem] w-0.5 bg-linear-to-b"
        />
      ) : null}
      {entries.map((entry, index) => (
        <li
          key={entry.key}
          className="rise relative grid grid-cols-[3rem_minmax(0,1fr)] items-start gap-4"
          style={{ '--i': index } as CSSProperties}
        >
          <DateBadge
            iso={entry.date}
            tone={entry.state === 'next' ? 'action' : entry.state === 'late' ? 'danger' : 'brand'}
            className="relative"
          />
          <div className="grid min-w-0 gap-0.5 pt-0.5">
            {entry.when ? (
              <p className="text-ink-muted text-xs font-semibold tracking-wide uppercase">{entry.when}</p>
            ) : null}
            <p className="text-ink font-semibold">{entry.title}</p>
            {entry.text ? <p className="text-small text-ink-muted">{entry.text}</p> : null}
            {entry.link ? (
              <Link
                href={entry.link.href}
                className="group/link text-action-ink inline-flex min-h-11 items-center gap-1.5 justify-self-start text-sm font-semibold underline-offset-4 hover:underline"
              >
                {entry.link.label}
                <IconArrowRight className="ease-soft size-4 transition-transform duration-(--motion-base) group-hover/link:translate-x-0.5" />
              </Link>
            ) : null}
          </div>
        </li>
      ))}
    </ol>
  );
}
