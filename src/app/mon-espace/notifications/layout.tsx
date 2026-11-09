import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { BandFrame } from '@/components/ui/band-header';
import { notificationTexts } from '@/features/notification';
import { RequireSession } from '@/features/identity';

export const metadata: Metadata = {
  title: notificationTexts.title,
  robots: { index: false, follow: false },
};

/** « Mes notifications » : coque statique et garde de session (F-005). */
export default function NotificationsLayout({ children }: { children: ReactNode }) {
  return (
    <BandFrame>
      <RequireSession>{children}</RequireSession>
    </BandFrame>
  );
}
