'use client';

import dynamic from 'next/dynamic';
import { LOADING } from '@/features/billing/loading-texts';

/*
 * Écrans de « Mes factures » chargés à la demande : importer la fonctionnalité (pour un texte ou une
 * adresse) ne fait pas télécharger ses écrans. Le panneau de l'accueil de Mon espace a son propre relais
 * (`todo-lazy.tsx`, point d'entrée `@/features/billing/home`) : l'accueil ne télécharge pas celui-ci.
 */

function Loading() {
  return (
    <p role="status" className="text-ink-muted">
      {LOADING}
    </p>
  );
}

export const InvoiceList = dynamic(() => import('./invoice-list').then((module_) => module_.InvoiceList), {
  loading: Loading,
});

export const InvoiceDetail = dynamic(
  () => import('./invoice-detail').then((module_) => module_.InvoiceDetail),
  {
    loading: Loading,
  },
);

export const BillingHistory = dynamic(() => import('./history').then((module_) => module_.BillingHistory), {
  loading: Loading,
});

/** « Prélèvement automatique » de la fiche d'un compte entreprise (R-PE-04). */
export const BillingPreferences = dynamic(
  () => import('./billing-preferences').then((module_) => module_.BillingPreferences),
  { loading: Loading },
);

/** Factures de commission du Recouvrement (ADR-064) : liste (onglet des relevés du créancier) et détail. */
export const CommissionInvoiceList = dynamic(
  () => import('./commission-invoices').then((module_) => module_.CommissionInvoiceList),
  { loading: Loading },
);

export const CommissionInvoiceDetail = dynamic(
  () => import('./commission-invoice-detail').then((module_) => module_.CommissionInvoiceDetail),
  { loading: Loading },
);

/** Reçus des frais du Recouvrement (ADR-064). */
export const FeeReceiptList = dynamic(
  () => import('./commission-invoices').then((module_) => module_.FeeReceiptList),
  { loading: Loading },
);
