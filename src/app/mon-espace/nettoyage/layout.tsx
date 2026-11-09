import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { BandFrame } from '@/components/ui/band-header';
import { cleaningTexts } from '@/features/cleaning';
import { RequireSession } from '@/features/identity';

export const metadata: Metadata = {
  title: cleaningTexts.space.title,
  robots: { index: false, follow: false },
};

/**
 * « Mes prestations de nettoyage » : coque statique et garde de session commune aux écrans (liste,
 * demande, mission) ; la session reste vérifiée d'un écran à l'autre (F-005, option A).
 */
export default function CleaningSpaceLayout({ children }: { children: ReactNode }) {
  return (
    <BandFrame>
      <RequireSession>{children}</RequireSession>
    </BandFrame>
  );
}
