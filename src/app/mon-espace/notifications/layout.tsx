import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { Container } from '@/components/ui/container';
import { Eyebrow } from '@/components/ui/eyebrow';
import { navigation } from '@/config/navigation';
import { notificationTexts } from '@/features/notification';
import { RequireSession } from '@/features/identity';

export const metadata: Metadata = {
  title: notificationTexts.title,
  robots: { index: false, follow: false },
};

/** « Mes notifications » : coque statique et garde de session (F-005). */
export default function NotificationsLayout({ children }: { children: ReactNode }) {
  return (
    <Container className="py-10 sm:py-16">
      <Eyebrow>{navigation.account.label}</Eyebrow>
      <div className="mt-5">
        <RequireSession>{children}</RequireSession>
      </div>
    </Container>
  );
}
