import type { Metadata } from 'next';
import { WeavePattern } from '@/components/ui/brand/weave';
import Link from 'next/link';
import { Card } from '@/components/ui/card';
import { IconClock, IconNettoyage } from '@/components/ui/icons';
import { Container } from '@/components/ui/container';
import { Eyebrow } from '@/components/ui/eyebrow';
import { Heading } from '@/components/ui/heading';
import { navigation } from '@/config/navigation';
import { billingPaths, billingTexts } from '@/features/billing';
import { cleaningPaths, cleaningTexts } from '@/features/cleaning';
import { AccountOverview, RequireSession } from '@/features/identity';
import { getDictionary } from '@/i18n';
import { pageMetadata } from '@/lib/seo/metadata';

/**
 * « Mon espace KSP » : coque statique ; la garde reprend la session dans le navigateur (F-005, option A)
 * avant d'afficher l'espace. Premier service branché : le Nettoyage ; les autres arrivent avec leurs services.
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
            <section aria-labelledby="prestations-titre" className="mt-12">
              <Heading as="h2" size="h3" id="prestations-titre" className="sr-only">
                {t.account.servicesTitle}
              </Heading>
              <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <Card as="li" interactive>
                  <IconNettoyage className="text-accent-ink size-7" />
                  <Link
                    href={cleaningPaths.space}
                    className="stretched-link font-display text-ink mt-4 block text-lg font-semibold focus-visible:outline-none"
                  >
                    {cleaningTexts.space.homeLink}
                  </Link>
                  <p className="text-small text-ink-muted mt-1">{cleaningTexts.space.homeLinkText}</p>
                </Card>
                <Card as="li" interactive>
                  <IconClock className="text-accent-ink size-7" />
                  <Link
                    href={billingPaths.list}
                    className="stretched-link font-display text-ink mt-4 block text-lg font-semibold focus-visible:outline-none"
                  >
                    {billingTexts.title}
                  </Link>
                  <p className="text-small text-ink-muted mt-1">{billingTexts.lead}</p>
                </Card>
              </ul>
            </section>
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
