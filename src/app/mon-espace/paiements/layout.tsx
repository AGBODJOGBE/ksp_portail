import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { BandFrame } from '@/components/ui/band-header';
import { RequireSession } from '@/features/identity';
import { paymentTexts } from '@/features/payment';

export const metadata: Metadata = {
  title: paymentTexts.title,
  robots: { index: false, follow: false },
};

/** « Factures et paiements » : coque statique et garde de session (liste, retour du prestataire, simulation ; F-005). */
export default function PaymentsLayout({ children }: { children: ReactNode }) {
  return (
    <BandFrame>
      <RequireSession>{children}</RequireSession>
    </BandFrame>
  );
}
