import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { Container } from '@/components/ui/container';
import { Eyebrow } from '@/components/ui/eyebrow';
import { navigation } from '@/config/navigation';
import { billingTexts } from '@/features/billing';
import { RequireSession } from '@/features/identity';

export const metadata: Metadata = {
  title: billingTexts.title,
  robots: { index: false, follow: false },
};

/** « Mes factures » : coque statique et garde de session communes à la liste et au détail (F-005). */
export default function InvoicesLayout({ children }: { children: ReactNode }) {
  return (
    <Container className="py-10 sm:py-16">
      <Eyebrow>{navigation.account.label}</Eyebrow>
      <div className="mt-5">
        <RequireSession>{children}</RequireSession>
      </div>
    </Container>
  );
}
