import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { BandFrame } from '@/components/ui/band-header';
import { accountTexts, RequireSession } from '@/features/identity';

export const metadata: Metadata = {
  title: accountTexts.profile.title,
  robots: { index: false, follow: false },
};

/** « Mon profil » : coque statique et garde de session (F-005, option A). */
export default function ProfileLayout({ children }: { children: ReactNode }) {
  return (
    <BandFrame size="reading">
      <RequireSession>{children}</RequireSession>
    </BandFrame>
  );
}
