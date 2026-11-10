import Link from 'next/link';
import type { Metadata } from 'next';
import { Suspense } from 'react';
import { IconArrowRight } from '@/components/ui/icons';
import { contactHref, navigation } from '@/config/navigation';
import { LoginFlow } from '@/features/identity';
import { getDictionary } from '@/i18n';
import { pageMetadata } from '@/lib/seo/metadata';

export const metadata: Metadata = {
  ...pageMetadata({ title: getDictionary().login.title, path: navigation.login.href }),
  robots: { index: false, follow: false },
};

/**
 * Connexion par téléphone (v3, F-020) : carte blanche centrée sur fond bleu clair, en-tête allégé (logo et
 * « Créer un compte », voir `data-header` dans globals.css). Coque statique, parcours dans un composant
 * client (F-005, option A) : le même parcours connecte ou crée le compte.
 */
export default function LoginPage() {
  const t = getDictionary();
  return (
    <div data-header="light" className="bg-surface-muted px-gutter py-10 sm:py-16">
      <div className="rounded-card border-line bg-surface mx-auto w-full max-w-[35rem] border px-6 pt-10 pb-8 shadow-sm sm:px-12">
        {/* Lecture de ?retour= : sous Suspense pour garder la page statique. */}
        <Suspense
          fallback={
            <p role="status" className="text-ink-muted text-center">
              {t.login.checking}
            </p>
          }
        >
          <LoginFlow />
        </Suspense>
      </div>
      <p className="text-ink-muted mt-8 text-center">
        {t.login.noAccount}{' '}
        <a
          href="#connexion-numero"
          className="text-brand-ink font-display font-semibold underline underline-offset-4"
        >
          {t.login.createAccount}
        </a>
      </p>
      <p className="text-small text-ink-muted mt-2 flex flex-wrap items-center justify-center gap-x-3 text-center">
        {t.login.help}
        <Link
          href={contactHref()}
          className="text-ink inline-flex min-h-11 items-center gap-1.5 font-semibold underline-offset-4 hover:underline"
        >
          {t.common.contactUs}
          <IconArrowRight className="size-4" />
        </Link>
      </p>
    </div>
  );
}
