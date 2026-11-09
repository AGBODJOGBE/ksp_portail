import Link from 'next/link';
import type { Metadata } from 'next';
import { Suspense } from 'react';
import { SignatureRule } from '@/components/ui/brand/signature';
import { HeroBand } from '@/components/ui/hero-band';
import { IconArrowRight, IconCheck } from '@/components/ui/icons';
import { Container } from '@/components/ui/container';
import { Eyebrow } from '@/components/ui/eyebrow';
import { contactHref, navigation } from '@/config/navigation';
import { LoginFlow } from '@/features/identity';
import { homeContent } from '@/features/home';
import { getDictionary } from '@/i18n';
import { frenchSpacing } from '@/lib/typography';
import { pageMetadata } from '@/lib/seo/metadata';

export const metadata: Metadata = {
  ...pageMetadata({ title: getDictionary().login.title, path: navigation.login.href }),
  robots: { index: false, follow: false },
};

/** Connexion par téléphone : coque statique, parcours dans un composant client (F-005, option A). */
export default function LoginPage() {
  const t = getDictionary();
  const promise = homeContent.hero;
  return (
    <>
      <HeroBand containerClassName="pt-8 pb-16 sm:pt-14 sm:pb-24">
        <div className="grid gap-8 lg:grid-cols-12 lg:items-center lg:gap-12">
          <div className="lg:col-span-6">
            <Eyebrow>{navigation.account.label}</Eyebrow>
            <p className="font-display text-h2 text-ink mt-4 font-semibold">{promise.panelTitle}</p>
            <p className="text-lead text-ink-muted mt-4 max-lg:hidden">{frenchSpacing(promise.panelText)}</p>
            <ul className="text-ink mt-8 grid gap-3 max-lg:hidden">
              {promise.highlights.map((item) => (
                <li key={item} className="flex items-center gap-3">
                  <span className="bg-action-soft ring-action-muted grid size-6 shrink-0 place-items-center rounded-full ring-1">
                    <IconCheck className="text-action-ink size-3.5" />
                  </span>
                  {frenchSpacing(item)}
                </li>
              ))}
            </ul>
            <SignatureRule size="md" className="mt-10 max-w-64 max-lg:hidden" />
          </div>
          <div className="lg:col-span-6">
            <div
              data-tone="light"
              className="rounded-panel border-line bg-surface shadow-float rise border p-5 sm:p-8"
            >
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
            </div>
          </div>
        </div>
      </HeroBand>
      <Container className="text-small text-ink-muted flex flex-wrap items-center gap-x-3 py-8 sm:py-10">
        {t.login.help}
        <Link
          href={contactHref()}
          className="text-ink inline-flex min-h-11 items-center gap-1.5 font-semibold underline-offset-4 hover:underline"
        >
          {homeContent.closing.primaryAction.label}
          <IconArrowRight className="size-4" />
        </Link>
      </Container>
    </>
  );
}
