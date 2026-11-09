import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { BandFrame } from '@/components/ui/band-header';
import { deletionTexts, RequireSession } from '@/features/identity';

export const metadata: Metadata = {
  title: deletionTexts.settings.title,
  robots: { index: false, follow: false },
};

/** « Mon compte » : coque statique et garde de session (F-005, option A). */
export default function AccountSettingsLayout({ children }: { children: ReactNode }) {
  return (
    <BandFrame size="reading">
      <RequireSession>{children}</RequireSession>
    </BandFrame>
  );
}
