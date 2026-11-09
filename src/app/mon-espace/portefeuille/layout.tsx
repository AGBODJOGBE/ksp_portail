import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { Container } from '@/components/ui/container';
import { Eyebrow } from '@/components/ui/eyebrow';
import { navigation } from '@/config/navigation';
import { RequireSession } from '@/features/identity';
import { walletTexts } from '@/features/wallet';

export const metadata: Metadata = {
  title: walletTexts.title,
  robots: { index: false, follow: false },
};

/** « Mon portefeuille » : coque statique et garde de session (F-005). */
export default function WalletLayout({ children }: { children: ReactNode }) {
  return (
    <Container className="py-10 sm:py-16">
      <Eyebrow>{navigation.account.label}</Eyebrow>
      <div className="mt-5">
        <RequireSession>{children}</RequireSession>
      </div>
    </Container>
  );
}
