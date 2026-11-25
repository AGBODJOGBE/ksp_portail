'use client';

import dynamic from 'next/dynamic';
import { LOADING } from '@/features/billing/loading-texts';

/**
 * Panneau « Mes factures » de l'accueil de Mon espace, chargé à la demande, dans un relais à part : la page
 * d'accueil ne télécharge pas le relais des écrans de factures (`lazy.tsx`).
 */
export const InvoiceTodo = dynamic(() => import('./invoice-todo').then((module_) => module_.InvoiceTodo), {
  loading: () => (
    <p role="status" className="text-ink-muted">
      {LOADING}
    </p>
  ),
});
