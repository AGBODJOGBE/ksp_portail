import type { Metadata } from 'next';
import Link from 'next/link';
import type { ReactNode } from 'react';
import { Card } from '@/components/ui/card';
import {
  IconArrowRight,
  IconBriefcase,
  IconCheck,
  IconClock,
  IconNettoyage,
  IconUser,
} from '@/components/ui/icons';
import { Container } from '@/components/ui/container';
import { Eyebrow } from '@/components/ui/eyebrow';
import { Heading } from '@/components/ui/heading';
import { navigation } from '@/config/navigation';
import { InvoiceTodo, billingPaths, billingTexts } from '@/features/billing';
import { CleaningTodo, cleaningPaths, cleaningTexts } from '@/features/cleaning';
import { paymentPaths, paymentTexts } from '@/features/payment';
import {
  AccountOverview,
  ContextSwitcher,
  RequireSession,
  accountTexts,
  identityPaths,
} from '@/features/identity';
import { getDictionary } from '@/i18n';
import { pageMetadata } from '@/lib/seo/metadata';

/**
 * « Mon espace KSP », tableau de bord : coque statique ; la garde reprend la session dans le navigateur
 * (F-005, option A) avant d'afficher l'espace. D'abord ce qui attend une action du client, service par
 * service (panneaux chargés à la demande), puis l'accès aux services. Le sélecteur de contexte
 * (particulier ou entreprise) décide de ce que montrent les services.
 */

const CARD_LINK =
  'stretched-link font-display text-ink mt-4 flex items-center gap-2 text-lg font-semibold focus-visible:outline-none';
const TILE =
  'rounded-control bg-accent-soft text-accent-ink ring-accent-muted grid size-11 place-items-center ring-1 ring-inset';

export const metadata: Metadata = {
  ...pageMetadata({ title: navigation.account.label, path: navigation.account.href }),
  robots: { index: false, follow: false },
};

function ServiceCard({
  href,
  title,
  text,
  icon,
}: {
  href: string;
  title: string;
  text: string;
  icon: ReactNode;
}) {
  return (
    <Card as="li" interactive>
      <span aria-hidden="true" className={TILE}>
        {icon}
      </span>
      <Link href={href} className={CARD_LINK}>
        {title}
        <IconArrowRight className="text-ink-subtle ease-soft size-4 transition-transform duration-(--motion-base) group-hover/card:translate-x-1" />
      </Link>
      <p className="text-small text-ink-muted mt-1">{text}</p>
    </Card>
  );
}

export default function AccountPage() {
  const t = getDictionary();
  return (
    <div className="relative overflow-hidden">
      <Container className="relative py-10 sm:py-14">
        <Eyebrow>{navigation.account.label}</Eyebrow>
        <div className="mt-5">
          <RequireSession>
            <AccountOverview />
            <ContextSwitcher hint className="mt-8" />

            <section aria-labelledby="a-faire-titre" className="mt-12">
              <Heading as="h2" size="h2" id="a-faire-titre">
                {t.account.todoTitle}
              </Heading>
              <p className="text-ink-muted mt-2">{t.account.todoLead}</p>
              <div className="mt-6 grid gap-5 lg:grid-cols-2 lg:items-start">
                <CleaningTodo />
                <InvoiceTodo />
              </div>
            </section>

            <section aria-labelledby="prestations-titre" className="mt-14">
              <Heading as="h2" size="h3" id="prestations-titre">
                {t.account.servicesTitle}
              </Heading>
              <ul className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <ServiceCard
                  href={cleaningPaths.space}
                  title={cleaningTexts.space.homeLink}
                  text={cleaningTexts.space.homeLinkText}
                  icon={<IconNettoyage className="size-6" />}
                />
                <ServiceCard
                  href={billingPaths.list}
                  title={billingTexts.title}
                  text={billingTexts.lead}
                  icon={<IconClock className="size-6" />}
                />
                <ServiceCard
                  href={paymentPaths.list}
                  title={paymentTexts.title}
                  text={paymentTexts.lead}
                  icon={<IconCheck className="size-6" />}
                />
                <ServiceCard
                  href={identityPaths.profile}
                  title={accountTexts.home.profileLink}
                  text={accountTexts.home.profileLinkText}
                  icon={<IconUser className="size-6" />}
                />
                <ServiceCard
                  href={identityPaths.organizations}
                  title={accountTexts.home.organizationsLink}
                  text={accountTexts.home.organizationsLinkText}
                  icon={<IconBriefcase className="size-6" />}
                />
              </ul>
            </section>

            <section
              aria-labelledby="services-titre"
              className="border-line max-w-reading mt-14 border-t pt-10"
            >
              <Heading as="h2" size="h3" id="services-titre">
                {t.account.soonTitle}
              </Heading>
              <p className="text-ink-muted mt-3">{t.account.soonText}</p>
              <p className="text-small text-ink-muted mt-6 inline-flex items-center gap-2">
                <IconClock />
                {t.common.comingSoon}
              </p>
            </section>
          </RequireSession>
        </div>
      </Container>
    </div>
  );
}
