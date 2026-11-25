'use client';

import dynamic from 'next/dynamic';

/*
 * Écrans des documents chargés à la demande : importer la fonctionnalité (pour un texte) ne fait
 * télécharger aucun écran. Chargement sans texte : le relais ne lit pas `texts.ts`.
 */

function Loading() {
  return <p role="status" aria-busy="true" className="text-ink-muted min-h-11" />;
}

export const PublicSigning = dynamic(
  () => import('./public-signing').then((module_) => module_.PublicSigning),
  { loading: Loading },
);

export const DocumentDetail = dynamic(
  () => import('./document-detail').then((module_) => module_.DocumentDetail),
  { loading: Loading },
);

/** Signature d'un document dans l'écran d'un autre service (mandat du Recouvrement). */
export const DocumentSigning = dynamic(
  () => import('./document-signing').then((module_) => module_.DocumentSigning),
  { loading: Loading },
);
