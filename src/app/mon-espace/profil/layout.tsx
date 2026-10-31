import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { Container } from '@/components/ui/container';
import { Eyebrow } from '@/components/ui/eyebrow';
import { navigation } from '@/config/navigation';
import { accountTexts, RequireSession } from '@/features/identity';

export const metadata: Metadata = {
  title: accountTexts.profile.title,
  robots: { index: false, follow: false },
};

/** « Mon profil » : coque statique et garde de session (F-005, option A). */
export default function ProfileLayout({ children }: { children: ReactNode }) {
  return (
    <Container size="reading" className="py-10 sm:py-16">
      <Eyebrow>{navigation.account.label}</Eyebrow>
      <div className="mt-5">
        <RequireSession>{children}</RequireSession>
      </div>
    </Container>
  );
}
