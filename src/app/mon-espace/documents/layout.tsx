import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { BandFrame } from '@/components/ui/band-header';
import { documentTexts } from '@/features/document';
import { RequireSession } from '@/features/identity';

export const metadata: Metadata = {
  title: documentTexts.documentEyebrow,
  robots: { index: false, follow: false },
};

/** Documents de Mon espace : coque statique et garde de session (F-005). Pas de liste (contrat). */
export default function DocumentsLayout({ children }: { children: ReactNode }) {
  return (
    <BandFrame>
      <RequireSession>{children}</RequireSession>
    </BandFrame>
  );
}
