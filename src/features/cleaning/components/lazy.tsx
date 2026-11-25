'use client';

import dynamic from 'next/dynamic';
import { LOADING, LOADING_SIMULATOR } from '@/features/cleaning/loading-texts';

/*
 * Écrans du Nettoyage chargés à la demande. Next embarque dans une page tous les composants client
 * atteints par ses imports : sans ce relais, importer la fonctionnalité (pour un texte ou une adresse)
 * ferait télécharger tous ses écrans à chaque page.
 */

function Loading() {
  return (
    <p role="status" className="text-ink-muted">
      {LOADING}
    </p>
  );
}

/**
 * Simulateur et assistant : rendus dans le navigateur seulement, ils reprennent le brouillon de l'onglet
 * (`sessionStorage`), que le serveur ne connaît pas.
 */
export const CleaningSimulator = dynamic(
  () => import('./simulator').then((module_) => module_.CleaningSimulator),
  {
    ssr: false,
    loading: () => (
      <p role="status" className="rounded-card border-line bg-surface text-ink-muted border p-6 sm:p-8">
        {LOADING_SIMULATOR}
      </p>
    ),
  },
);

export const RequestWizard = dynamic(
  () => import('./request-wizard').then((module_) => module_.RequestWizard),
  {
    ssr: false,
    loading: () => (
      <p role="status" className="rounded-card border-line bg-surface text-ink-muted border p-6 sm:p-8">
        {LOADING}
      </p>
    ),
  },
);

export const CleaningHome = dynamic(() => import('./cleaning-home').then((module_) => module_.CleaningHome), {
  loading: Loading,
});

export const CleaningTodo = dynamic(() => import('./cleaning-home').then((module_) => module_.CleaningTodo), {
  loading: Loading,
});

export const RequestList = dynamic(() => import('./request-list').then((module_) => module_.RequestList), {
  loading: Loading,
});

export const RequestDetail = dynamic(
  () => import('./request-detail').then((module_) => module_.RequestDetail),
  { loading: Loading },
);

export const PlaceList = dynamic(() => import('./places').then((module_) => module_.PlaceList), {
  loading: Loading,
});

export const PlaceDetail = dynamic(() => import('./places').then((module_) => module_.PlaceDetail), {
  loading: Loading,
});

/** Ajout d'un lieu : la carte (Leaflet) n'est téléchargée qu'ici et dans l'assistant. */
export const NewPlace = dynamic(() => import('./places').then((module_) => module_.NewPlace), {
  ssr: false,
  loading: Loading,
});

/** « Suivre ma demande » : demandes et programmes en cours. */
export const CleaningTracking = dynamic(
  () => import('./cleaning-tracking').then((module_) => module_.CleaningTracking),
  { loading: Loading },
);

export const ProgramList = dynamic(() => import('./program-list').then((module_) => module_.ProgramList), {
  loading: Loading,
});

export const ProgramDetail = dynamic(
  () => import('./program-detail').then((module_) => module_.ProgramDetail),
  { loading: Loading },
);

/** Nouvelle commande : le rythme et son aperçu ne sont téléchargés qu'ici. */
export const ReorderProgram = dynamic(
  () => import('./program-reorder').then((module_) => module_.ReorderProgram),
  { loading: Loading },
);

export const SessionDetail = dynamic(
  () => import('./session-detail').then((module_) => module_.SessionDetail),
  { loading: Loading },
);

export const SessionRedirect = dynamic(
  () => import('./session-redirect').then((module_) => module_.SessionRedirect),
  { loading: Loading },
);

export const ClaimList = dynamic(() => import('./claim-list').then((module_) => module_.ClaimList), {
  loading: Loading,
});

export const ClaimDetail = dynamic(() => import('./claim-detail').then((module_) => module_.ClaimDetail), {
  loading: Loading,
});
