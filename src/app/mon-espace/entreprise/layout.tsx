import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { BandFrame } from '@/components/ui/band-header';
import { accountTexts, RequireSession } from '@/features/identity';

export const metadata: Metadata = {
  title: accountTexts.organizations.title,
  robots: { index: false, follow: false },
};

/** « Mon entreprise » : coque statique et garde de session communes à la liste et à la fiche (F-005). */
export default function OrganizationsLayout({ children }: { children: ReactNode }) {
  return (
    <BandFrame size="reading">
      <RequireSession>{children}</RequireSession>
    </BandFrame>
  );
}
