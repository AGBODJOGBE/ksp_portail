'use client';

import dynamic from 'next/dynamic';
import { cleaningTexts } from '@/features/cleaning/texts';

/*
 * Points d'entrée des écrans du Nettoyage, chargés à la demande. Next embarque dans une page tous les
 * composants client atteints par ses imports : sans ce relais, importer la fonctionnalité (même pour un
 * texte ou une adresse) ferait télécharger tous ses écrans à chaque page.
 */

function Loading() {
  return (
    <p role="status" className="text-ink-muted">
      {cleaningTexts.space.loading}
    </p>
  );
}

export const CleaningSimulator = dynamic(
  () => import('./cleaning-simulator').then((module_) => module_.CleaningSimulator),
  {
    loading: () => (
      <p role="status" className="rounded-panel border-line bg-surface text-ink-muted border p-8">
        {cleaningTexts.simulator.loadingServices}
      </p>
    ),
  },
);

export const QuoteRequestPanel = dynamic(
  () => import('./quote-request-form').then((module_) => module_.QuoteRequestPanel),
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
