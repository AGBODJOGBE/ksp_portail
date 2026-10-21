'use client';

import type { MouseEvent, ReactNode } from 'react';

/**
 * Panneau de navigation fondé sur l'API `popover` native : ouverture par le bouton qui le cible,
 * fermeture par Échap, clic à l'extérieur ou bouton dédié — sans état React.
 * Seul ajout : fermer le panneau quand on suit un de ses liens (la navigation est côté client).
 */
export function NavPopover({
  id,
  className,
  children,
  lockScroll = false,
}: {
  id: string;
  className?: string;
  children: ReactNode;
  /** Bloque le défilement de la page tant que le panneau est ouvert (menu plein écran). */
  lockScroll?: boolean;
}) {
  function closeOnLink(event: MouseEvent<HTMLDivElement>) {
    if (event.target instanceof Element && event.target.closest('a')) {
      event.currentTarget.hidePopover();
    }
  }
  return (
    <div
      id={id}
      popover="auto"
      className={className}
      onClick={closeOnLink}
      data-scroll-lock={lockScroll ? '' : undefined}
    >
      {children}
    </div>
  );
}
