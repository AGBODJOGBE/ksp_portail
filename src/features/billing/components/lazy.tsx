'use client';

import dynamic from 'next/dynamic';
import { billingTexts } from '@/features/billing/texts';

/*
 * Écrans de « Mes factures » chargés à la demande : importer la fonctionnalité (pour un texte ou une
 * adresse, depuis l'accueil de Mon espace) ne fait pas télécharger ses écrans.
 */

function Loading() {
  return (
    <p role="status" className="text-ink-muted">
      {billingTexts.loading}
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
