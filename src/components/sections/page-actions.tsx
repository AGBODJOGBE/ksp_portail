import { useId, type ReactNode } from 'react';
import { IconArrowRight, IconArrowUpRight, IconClock, IconUser } from '@/components/ui/icons';
import { Button, ButtonArrow, ButtonLink, buttonClasses, type ButtonSize } from '@/components/ui/button';
import { contactHref, navigation } from '@/config/navigation';
import { siteConfig } from '@/config/site';
import type { PageAction } from '@/components/sections/types';
import { cn } from '@/lib/cn';

/** Adresse d'une action (exportée pour les tests et les liens hors bouton). */
export function actionHref(action: PageAction): string | null {
  switch (action.kind) {
    case 'link':
      return action.href;
    case 'account':
      return navigation.account.href;
    case 'contact':
      return contactHref(action.subject);
    case 'site':
      return siteConfig.ecosystem.find((site) => site.id === action.site)?.href ?? null;
    case 'soon':
      return null;
  }
}

function SoonAction({ label, note, size }: { label: string; note: string; size: ButtonSize }) {
  const noteId = useId();
  return (
    <span className="flex flex-col gap-2 sm:items-start">
      <Button size={size} variant="secondary" disabled aria-describedby={noteId}>
        {label}
      </Button>
      <span id={noteId} className="text-small text-ink-muted inline-flex items-center gap-1.5">
        <IconClock className="text-accent-ink size-4" />
        {note}
      </span>
    </span>
  );
}

function Action({ action, primary, size }: { action: PageAction; primary: boolean; size: ButtonSize }) {
  const variant = primary ? 'action' : 'secondary';
  const href = actionHref(action);

  if (action.kind === 'soon' || !href) {
    return <SoonAction label={action.label} note={action.kind === 'soon' ? action.note : ''} size={size} />;
  }
  if (action.kind === 'site') {
    return (
      <a href={href} className={buttonClasses({ variant, size })}>
        {action.label}
        <IconArrowUpRight />
      </a>
    );
  }
  return (
    <ButtonLink href={href} variant={variant} size={size}>
      {action.kind === 'account' && !primary ? <IconUser /> : null}
      {action.label}
      {primary ? (
        <ButtonArrow>
          <IconArrowRight />
        </ButtonArrow>
      ) : null}
    </ButtonLink>
  );
}

/**
 * Boutons d'une page métier : la première action est mise en avant (ocre), les suivantes sont secondaires.
 * `extra` : bouton ajouté à la fin (WhatsApp).
 */
export function PageActions({
  actions,
  size = 'lg',
  extra,
  highlightFirst = true,
  className,
}: {
  actions: ReadonlyArray<PageAction>;
  size?: ButtonSize;
  extra?: ReactNode;
  /** `false` : toutes les actions en secondaire (action d'appoint au milieu d'une page). */
  highlightFirst?: boolean;
  className?: string;
}) {
  return (
    <div
      className={cn('flex flex-col items-stretch gap-3 sm:flex-row sm:flex-wrap sm:items-start', className)}
    >
      {actions.map((action, index) => (
        <Action
          key={`${action.kind}-${action.label}`}
          action={action}
          primary={highlightFirst && index === 0}
          size={size}
        />
      ))}
      {extra}
    </div>
  );
}
