import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { Container } from '@/components/ui/container';
import { Eyebrow } from '@/components/ui/eyebrow';
import { navigation } from '@/config/navigation';
import { cleaningTexts } from '@/features/cleaning';
import { RequireSession } from '@/features/identity';

export const metadata: Metadata = {
  title: cleaningTexts.space.title,
  robots: { index: false, follow: false },
};

/**
 * « Mes prestations de nettoyage » : coque statique et garde de session commune aux écrans (liste,
 * demande, mission) ; la session reste vérifiée d'un écran à l'autre (F-005, option A).
 */
export default function CleaningSpaceLayout({ children }: { children: ReactNode }) {
  return (
    <Container className="py-10 sm:py-16">
      <Eyebrow>{navigation.account.label}</Eyebrow>
      <div className="mt-5">
        <RequireSession>{children}</RequireSession>
      </div>
    </Container>
  );
}
