import Link from 'next/link';
import type { CSSProperties, ReactNode } from 'react';
import { IconArrowRight } from '@/components/ui/icons';
import { cn } from '@/lib/cn';

/**
 * Carte-lien (direction « Signature ») : tuile d'icône bleu nuit, titre qui mène à l'écran, texte court.
 * Toute la carte est cliquable (lien étiré) ; au survol, elle s'élève et le fil de la signature se
 * déploie sur son bord haut. `index` : rang dans une cascade d'apparition.
 */
export function LinkCard({
  href,
  title,
  text,
  icon,
  index,
  as: Tag = 'li',
  className,
}: {
  href: string;
  title: string;
  text?: ReactNode;
  icon: ReactNode;
  index?: number;
  as?: 'li' | 'div';
  className?: string;
}) {
  return (
    <Tag
      className={cn(
        'group/card rounded-card border-line bg-surface relative isolate overflow-hidden border p-5 shadow-xs sm:p-6',
        'ease-soft hover:shadow-card transition-[transform,box-shadow] duration-(--motion-slow) motion-safe:hover:-translate-y-1',
        'has-[.stretched-link:focus-visible]:outline-focus has-[.stretched-link:focus-visible]:outline-2 has-[.stretched-link:focus-visible]:outline-offset-3',
        // Fil de la signature (bleu nuit, vert, or) qui se déploie au survol.
        'before:from-signature-1 before:via-signature-2 before:to-signature-3 before:ease-soft before:absolute before:inset-x-0 before:top-0 before:h-[3px] before:origin-left before:scale-x-0 before:bg-linear-to-r before:transition-transform before:duration-(--motion-slow) hover:before:scale-x-100',
        index !== undefined && 'rise',
        className,
      )}
      style={index !== undefined ? ({ '--i': index } as CSSProperties) : undefined}
    >
      <span
        aria-hidden="true"
        className="rounded-icon bg-brand text-on-brand group-hover/card:text-accent-bright grid size-11 place-items-center transition-colors duration-(--motion-base)"
      >
        {icon}
      </span>
      <Link
        href={href}
        className="stretched-link font-display text-ink mt-4 flex items-center gap-2 text-lg leading-snug font-semibold focus-visible:outline-none"
      >
        {title}
        <IconArrowRight className="text-ink-subtle ease-soft group-hover/card:text-action-ink size-4 shrink-0 transition-transform duration-(--motion-base) group-hover/card:translate-x-1" />
      </Link>
      {text ? <p className="text-small text-ink-muted mt-1">{text}</p> : null}
    </Tag>
  );
}
