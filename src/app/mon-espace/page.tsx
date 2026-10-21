import type { Metadata } from 'next';
import { WeavePattern } from '@/components/ui/brand/weave';
import { IconClock } from '@/components/ui/icons';
import { Container } from '@/components/ui/container';
import { Eyebrow } from '@/components/ui/eyebrow';
import { Heading } from '@/components/ui/heading';
import { navigation } from '@/config/navigation';
import { AccountOverview, RequireSession } from '@/features/identity';
import { getDictionary } from '@/i18n';
import { pageMetadata } from '@/lib/seo/metadata';

/**
 * « Mon espace KSP » : coque statique ; la garde reprend la session dans le navigateur (F-005, option A)
 * avant d'afficher l'espace. Les dossiers, commandes et factures arriveront avec leurs services.
 */
export const metadata: Metadata = {
  ...pageMetadata({ title: navigation.account.label, path: navigation.account.href }),
  robots: { index: false, follow: false },
};

export default function AccountPage() {
  const t = getDictionary();
  return (
    <div className="relative overflow-hidden">
      <WeavePattern className="text-accent absolute inset-y-0 right-0 hidden h-full w-1/3 [mask-image:linear-gradient(to_left,black,transparent)] opacity-15 md:block" />
      <Container className="relative py-10 sm:py-16">
        <Eyebrow>{navigation.account.label}</Eyebrow>
        <div className="mt-5">
          <RequireSession>
            <AccountOverview />
            <section
              aria-labelledby="services-titre"
              className="border-line max-w-reading mt-12 border-t pt-10"
            >
              <Heading as="h2" size="h3" id="services-titre">
                {t.account.soonTitle}
              </Heading>
              <p className="text-ink-muted mt-3">{t.account.soonText}</p>
              <p className="text-small text-ink-muted mt-6 inline-flex items-center gap-2">
                <IconClock className="text-accent-ink" />
                {t.common.comingSoon}
              </p>
            </section>
          </RequireSession>
        </div>
      </Container>
    </div>
  );
}
