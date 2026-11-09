'use client';

import dynamic from 'next/dynamic';
import { LOADING } from '@/features/notification/loading-texts';

/*
 * Écrans du centre de notifications chargés à la demande : importer la fonctionnalité (pour une
 * adresse, depuis l'accueil de Mon espace) ne fait pas télécharger ses écrans ni ses textes.
 */

function Loading() {
  return (
    <p role="status" className="text-ink-muted">
      {LOADING}
    </p>
  );
}

/** Sans état de chargement : la pastille apparaît dès qu'elle est prête, sans décaler la page. */
export const NotificationBell = dynamic(() =>
  import('./notification-bell').then((module_) => module_.NotificationBell),
);

export const NotificationCenter = dynamic(
  () => import('./notification-center').then((module_) => module_.NotificationCenter),
  { loading: Loading },
);

export const NotificationPreferences = dynamic(
  () => import('./notification-preferences').then((module_) => module_.NotificationPreferences),
  { loading: Loading },
);
