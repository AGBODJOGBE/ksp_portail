import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { Container } from '@/components/ui/container';
import { Eyebrow } from '@/components/ui/eyebrow';
import { navigation } from '@/config/navigation';
import { accountTexts, RequireSession } from '@/features/identity';

export const metadata: Metadata = {
  title: accountTexts.organizations.title,
  robots: { index: false, follow: false },
};

/** « Mon entreprise » : coque statique et garde de session communes à la liste et à la fiche (F-005). */
export default function OrganizationsLayout({ children }: { children: ReactNode }) {
  return (
    <Container size="reading" className="py-10 sm:py-16">
      <Eyebrow>{navigation.account.label}</Eyebrow>
      <div className="mt-5">
        <RequireSession>{children}</RequireSession>
      </div>
    </Container>
  );
}
