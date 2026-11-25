import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { BandFrame } from '@/components/ui/band-header';
import { recoveryTexts } from '@/features/recovery';
import { RequireSession } from '@/features/identity';

export const metadata: Metadata = {
  title: recoveryTexts.title,
  robots: { index: false, follow: false },
};

/**
 * Recouvrement du créancier : coque statique et garde de session communes à toutes les pages (F-005). Les
 * adresses du dossier et de la décision sont celles des liens des notifications du service recovery.
 */
export default function RecoverySpaceLayout({ children }: { children: ReactNode }) {
  return (
    <BandFrame>
      <RequireSession>{children}</RequireSession>
    </BandFrame>
  );
}
