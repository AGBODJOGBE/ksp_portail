import Link from 'next/link';
import type { ReactNode } from 'react';
import { IconArrowRight } from '@/components/ui/icons';
import { cn } from '@/lib/cn';
import { buttonClasses } from './button';

/**
 * Carte d'action à liseré (direction « Signature ») : ce qui attend le client, et le bouton pour le
 * faire. Liseré de la signature à gauche, repère visuel (tuile d'icône ou date-calendrier), titre et
 * étiquette d'état, texte, montant mis en valeur et détail facultatif (jauge), action à droite — en
 * dessous sur téléphone, pleine largeur. Élévation légère au survol.
 */
export function ActionCard({
  title,
  text,
  badge,
  action,
  media,
  figure,
  children,
  as: Tag = 'li',
  className,
}: {
  title: string;
  text: string;
  badge?: ReactNode;
  action: { href: string; label: string };
  /** Tuile d'icône (`ActionCardIcon`) ou date-calendrier (`DateBadge`). */
  media?: ReactNode;
  /** Montant ou chiffre fourni par la gateway, mis en valeur (« Reste à régler · 120 000 F CFA »). */
  figure?: { label: string; value: string };
  /** Détail sous le texte (jauge…). */
  children?: ReactNode;
  as?: 'li' | 'div';
  className?: string;
}) {
  return (
    <Tag
      className={cn(
        'signature-edge rounded-card border-line bg-surface grid gap-4 border p-4 pl-5 shadow-xs sm:p-5 sm:pl-6',
        'ease-soft transition-[transform,box-shadow,border-color] duration-(--motion-base)',
        'hover:border-line-strong hover:shadow-sm motion-safe:hover:-translate-y-0.5',
        media
          ? 'grid-cols-[auto_minmax(0,1fr)] md:grid-cols-[auto_minmax(0,1fr)_auto]'
          : 'md:grid-cols-[minmax(0,1fr)_auto]',
        'md:items-center',
        className,
      )}
    >
      {media}
      <div className="grid min-w-0 gap-1">
        <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
          <p className="text-ink text-[1.0625rem] leading-snug font-semibold">{title}</p>
          {badge}
        </div>
        <p className="text-small text-ink-muted">{text}</p>
        {figure ? (
          <p className="mt-1 flex flex-wrap items-baseline gap-x-2">
            <span className="text-ink-muted text-xs font-semibold tracking-wide uppercase">
              {figure.label}
            </span>
            <span className="font-display text-figure-sm text-ink font-semibold tabular-nums">
              {figure.value}
            </span>
          </p>
        ) : null}
        {children ? <div className="mt-2">{children}</div> : null}
      </div>
      <Link
        href={action.href}
        className={buttonClasses({
          variant: 'action',
          className: cn('shadow-action group/button col-span-full w-full md:col-span-1 md:w-auto'),
        })}
      >
        {action.label}
        <IconArrowRight className="ease-soft size-4 transition-transform duration-(--motion-base) group-hover/button:translate-x-0.5" />
      </Link>
    </Tag>
  );
}

/** Tuile d'icône d'une carte (12 px de rayon, fond de marque très clair). */
export function ActionCardIcon({ children }: { children: ReactNode }) {
  return (
    <span
      aria-hidden="true"
      className="rounded-icon bg-tile text-tile-ink ring-tile-ring grid size-11 shrink-0 place-items-center self-start ring-1 ring-inset md:self-center"
    >
      {children}
    </span>
  );
}
