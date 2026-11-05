'use client';

import dynamic from 'next/dynamic';
import { LOADING, LOADING_SERVICES } from '@/features/cleaning/loading-texts';

/*
 * Points d'entrée des écrans du Nettoyage, chargés à la demande. Next embarque dans une page tous les
 * composants client atteints par ses imports : sans ce relais, importer la fonctionnalité (même pour un
 * texte ou une adresse) ferait télécharger tous ses écrans à chaque page.
 */

function Loading() {
  return (
    <p role="status" className="text-ink-muted">
      {LOADING}
    </p>
  );
}

/**
 * Demande de devis par lieu (assistant) : l'écran du lieu d'abord, les autres étapes à la demande.
 * Rendu dans le navigateur seulement : il reprend le brouillon de l'onglet (`sessionStorage`), que le
 * serveur ne connaît pas.
 */
export const CleaningJourney = dynamic(() => import('./journey').then((module_) => module_.CleaningJourney), {
  ssr: false,
  loading: () => (
    <p role="status" className="rounded-card border-line bg-surface text-ink-muted border p-6 sm:p-8">
      {LOADING_SERVICES}
    </p>
  ),
});

export const CleaningTodo = dynamic(() => import('./cleaning-todo').then((module_) => module_.CleaningTodo), {
  loading: Loading,
});

export const CleaningOngoing = dynamic(
  () => import('./cleaning-todo').then((module_) => module_.CleaningOngoing),
  { loading: Loading },
);

export const CleaningSpace = dynamic(
  () => import('./cleaning-space').then((module_) => module_.CleaningSpace),
  {
    loading: Loading,
  },
);

export const RequestDetail = dynamic(
  () => import('./request-detail').then((module_) => module_.RequestDetail),
  {
    loading: Loading,
  },
);

export const MissionDetail = dynamic(
  () => import('./mission-detail').then((module_) => module_.MissionDetail),
  {
    loading: Loading,
  },
);

export const RequestGroupDetail = dynamic(
  () => import('./group-detail').then((module_) => module_.RequestGroupDetail),
  { loading: Loading },
);
