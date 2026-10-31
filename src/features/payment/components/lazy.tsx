'use client';

import dynamic from 'next/dynamic';

/*
 * Écrans du paiement chargés à la demande : importer la fonctionnalité (pour un texte ou une adresse,
 * depuis l'accueil de Mon espace) ne fait télécharger aucun écran. Chargement sans texte : le relais ne
 * lit pas `texts.ts`, qui irait sinon dans toutes les pages qui importent la fonctionnalité.
 */

function Loading() {
  return <p role="status" aria-busy="true" className="text-ink-muted min-h-11" />;
}

export const PayButton = dynamic(() => import('./pay-button').then((module_) => module_.PayButton), {
  loading: Loading,
});

export const PaymentReturn = dynamic(
  () => import('./payment-return').then((module_) => module_.PaymentReturn),
  { loading: Loading },
);

export const PaymentSimulation = dynamic(
  () => import('./payment-simulation').then((module_) => module_.PaymentSimulation),
  { loading: Loading },
);

export const PaymentList = dynamic(() => import('./payment-list').then((module_) => module_.PaymentList), {
  loading: Loading,
});
