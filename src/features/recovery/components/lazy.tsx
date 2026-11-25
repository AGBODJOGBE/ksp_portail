'use client';

import dynamic from 'next/dynamic';
import { LOADING } from '@/features/recovery/loading-texts';

/*
 * Écrans du Recouvrement chargés à la demande : importer la fonctionnalité (pour une adresse ou un texte)
 * ne fait télécharger aucun écran. Le relais ne lit que `loading-texts.ts`.
 */

function Loading() {
  return (
    <p role="status" className="text-ink-muted">
      {LOADING}
    </p>
  );
}

export const RecoveryHome = dynamic(() => import('./recovery-home').then((module_) => module_.RecoveryHome), {
  loading: Loading,
});

export const CaseList = dynamic(() => import('./case-list').then((module_) => module_.CaseList), {
  loading: Loading,
});

/** Assistant : rendu dans le navigateur seulement, il reprend le brouillon de l'onglet (`sessionStorage`). */
export const CaseWizard = dynamic(() => import('./case-wizard').then((module_) => module_.CaseWizard), {
  ssr: false,
  loading: () => (
    <p role="status" className="rounded-card border-line bg-surface text-ink-muted border p-6 sm:p-8">
      {LOADING}
    </p>
  ),
});

export const CaseDetail = dynamic(() => import('./case-detail').then((module_) => module_.CaseDetail), {
  loading: Loading,
});

export const CaseEdit = dynamic(() => import('./case-edit').then((module_) => module_.CaseEdit), {
  loading: Loading,
});

export const RecoveryPreferences = dynamic(
  () => import('./preferences').then((module_) => module_.RecoveryPreferences),
  { loading: Loading },
);
