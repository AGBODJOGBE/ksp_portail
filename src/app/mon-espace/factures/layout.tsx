import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { BandFrame } from '@/components/ui/band-header';
import { billingTexts } from '@/features/billing';
import { RequireSession } from '@/features/identity';

export const metadata: Metadata = {
  title: billingTexts.title,
  robots: { index: false, follow: false },
};

/** « Mes factures » : coque statique et garde de session communes à la liste et au détail (F-005). */
export default function InvoicesLayout({ children }: { children: ReactNode }) {
  return (
    <BandFrame>
      <RequireSession>{children}</RequireSession>
    </BandFrame>
  );
}
