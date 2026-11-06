import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { Container } from '@/components/ui/container';
import { Eyebrow } from '@/components/ui/eyebrow';
import { navigation } from '@/config/navigation';
import { deletionTexts, RequireSession } from '@/features/identity';

export const metadata: Metadata = {
  title: deletionTexts.settings.title,
  robots: { index: false, follow: false },
};

/** « Mon compte » : coque statique et garde de session (F-005, option A). */
export default function AccountSettingsLayout({ children }: { children: ReactNode }) {
  return (
    <Container size="reading" className="py-10 sm:py-16">
      <Eyebrow>{navigation.account.label}</Eyebrow>
      <div className="mt-5">
        <RequireSession>{children}</RequireSession>
      </div>
    </Container>
  );
}
