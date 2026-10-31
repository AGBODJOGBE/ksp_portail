import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { Container } from '@/components/ui/container';
import { Eyebrow } from '@/components/ui/eyebrow';
import { navigation } from '@/config/navigation';
import { RequireSession } from '@/features/identity';
import { paymentTexts } from '@/features/payment';

export const metadata: Metadata = {
  title: paymentTexts.title,
  robots: { index: false, follow: false },
};

/** « Mes paiements » : coque statique et garde de session (liste, retour du prestataire, simulation ; F-005). */
export default function PaymentsLayout({ children }: { children: ReactNode }) {
  return (
    <Container className="py-10 sm:py-16">
      <Eyebrow>{navigation.account.label}</Eyebrow>
      <div className="mt-5">
        <RequireSession>{children}</RequireSession>
      </div>
    </Container>
  );
}
