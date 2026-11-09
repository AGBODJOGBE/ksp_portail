import type { ReactNode } from 'react';
import { SignatureBackdrop } from '@/components/ui/brand/signature';
import { IconClock } from '@/components/ui/icons';
import { cn } from '@/lib/cn';

/**
 * Emplacement de contenu « à venir » : visible, honnête, jamais confondu avec un vrai contenu (bord en
 * pointillés, étiquette « À venir »), mais soigné : fond dégradé discret et lignes de la signature en
 * filigrane. Repérable par `data-placeholder` (inventaire avant mise en ligne).
 */
export function Placeholder({
  title,
  children,
  media,
  as: Tag = 'div',
  className,
}: {
  title: string;
  children?: ReactNode;
  /** Zone visuelle réservée (ex. future photo), affichée en haut, pleine largeur. */
  media?: ReactNode;
  as?: 'div' | 'li';
  className?: string;
}) {
  return (
    <Tag
      data-placeholder=""
      className={cn(
        'rounded-card border-line-strong from-surface to-surface-muted text-ink-muted relative isolate flex flex-col overflow-hidden border border-dashed bg-linear-to-br',
        className,
      )}
    >
      <SignatureBackdrop className="absolute -right-6 -bottom-4 -z-10 h-24 w-48 opacity-[0.08]" />
      {media}
      <span className="flex flex-col items-start gap-2.5 p-5 sm:p-6">
        <span className="bg-surface-sunken text-ink-muted inline-flex min-h-6 items-center gap-1.5 rounded-full px-2.5 text-xs font-semibold tracking-wide uppercase">
          <IconClock className="size-3.5" />À venir
        </span>
        <span className="text-ink font-semibold">{title}</span>
        {children ? <span className="text-small">{children}</span> : null}
      </span>
    </Tag>
  );
}
