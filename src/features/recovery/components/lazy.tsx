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

export const DecisionList = dynamic(() => import('./decision-list').then((module_) => module_.DecisionList), {
  loading: Loading,
});

export const DecisionDetail = dynamic(
  () => import('./decision-detail').then((module_) => module_.DecisionDetail),
  { loading: Loading },
);

/** Reversements et relevés : lit l'onglet dans l'adresse (`?onglet=`), sous le Suspense de la page. */
export const RecoveryStatements = dynamic(
  () => import('./statements').then((module_) => module_.RecoveryStatements),
  { loading: Loading },
);

export const ImportStart = dynamic(() => import('./import-start').then((module_) => module_.ImportStart), {
  loading: Loading,
});

export const ImportDetail = dynamic(() => import('./import-detail').then((module_) => module_.ImportDetail), {
  loading: Loading,
});

/**
 * Espace du débiteur sans compte (`/recouvrement/[token]`) : rendu dans le navigateur seulement (la
 * session vit en mémoire de l'onglet), squelette de la feuille pendant le chargement.
 */
export const DebtorSpace = dynamic(() => import('./debtor-space').then((module_) => module_.DebtorSpace), {
  ssr: false,
  loading: () => (
    <p role="status" className="rounded-card border-line bg-surface text-ink-muted border p-6 sm:p-10">
      {LOADING}
    </p>
  ),
});
