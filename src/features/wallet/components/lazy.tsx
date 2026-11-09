'use client';

import dynamic from 'next/dynamic';
import type { WalletPay as WalletPayScreen } from './wallet-pay';

/*
 * Écrans du portefeuille chargés à la demande : importer la fonctionnalité (pour une adresse, depuis
 * l'accueil de Mon espace ou une fiche) ne fait télécharger aucun écran. Chargement sans texte : le relais
 * ne lit pas `texts.ts`, qui irait sinon dans toutes les pages qui importent la fonctionnalité.
 */

function Loading() {
  return <p role="status" aria-busy="true" className="text-ink-muted min-h-11" />;
}

export const WalletSpace = dynamic(() => import('./wallet-space').then((module_) => module_.WalletSpace), {
  loading: Loading,
});

// Composant générique (type de l'objet payé) : `dynamic` en perd le paramètre de type.
export const WalletPay = dynamic(() => import('./wallet-pay').then((module_) => module_.WalletPay), {
  loading: Loading,
}) as typeof WalletPayScreen;

export const WalletBalanceLink = dynamic(
  () => import('./balance-link').then((module_) => module_.WalletBalanceLink),
  { loading: Loading },
);

export const TopUpResult = dynamic(() => import('./top-up-result').then((module_) => module_.TopUpResult), {
  loading: Loading,
});
