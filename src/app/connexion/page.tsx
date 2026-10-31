import type { Metadata } from 'next';
import { Suspense } from 'react';
import { SignatureBackdrop } from '@/components/ui/brand/signature';
import { Card } from '@/components/ui/card';
import { Container } from '@/components/ui/container';
import { Eyebrow } from '@/components/ui/eyebrow';
import { navigation } from '@/config/navigation';
import { LoginFlow } from '@/features/identity';
import { getDictionary } from '@/i18n';
import { pageMetadata } from '@/lib/seo/metadata';

export const metadata: Metadata = {
  ...pageMetadata({ title: getDictionary().login.title, path: navigation.login.href }),
  robots: { index: false, follow: false },
};

/** Connexion par téléphone : coque statique, parcours dans un composant client (F-005, option A). */
export default function LoginPage() {
  const t = getDictionary();
  return (
    <div className="relative overflow-hidden">
      <SignatureBackdrop className="absolute inset-y-0 right-0 hidden h-full w-1/3 [mask-image:linear-gradient(to_left,black,transparent)] opacity-10 md:block" />
      <Container size="reading" className="relative py-10 sm:py-16">
        <Eyebrow>{navigation.account.label}</Eyebrow>
        <Card className="mt-5 p-5 sm:p-8">
          {/* Lecture de ?retour= : sous Suspense pour garder la page statique. */}
          <Suspense
            fallback={
              <p role="status" className="text-ink-muted">
                {t.login.checking}
              </p>
            }
          >
            <LoginFlow />
          </Suspense>
        </Card>
      </Container>
    </div>
  );
}
