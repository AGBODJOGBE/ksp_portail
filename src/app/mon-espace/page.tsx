import type { Metadata } from 'next';
import { Container } from '@/components/ui/container';
import { EmptyState } from '@/components/ui/empty-state';
import { Eyebrow } from '@/components/ui/eyebrow';
import { Heading } from '@/components/ui/heading';
import {
  IconBell,
  IconBriefcase,
  IconCard,
  IconClock,
  IconInvoice,
  IconNettoyage,
  IconUser,
  IconWallet,
} from '@/components/ui/icons';
import { LinkCard } from '@/components/ui/link-card';
import { navigation } from '@/config/navigation';
import { InvoiceTodo, billingPaths, billingTexts } from '@/features/billing';
import { CleaningTodo, cleaningPaths, cleaningTexts } from '@/features/cleaning';
import { NotificationBell, notificationPaths, notificationTexts } from '@/features/notification';
import { paymentPaths, paymentTexts } from '@/features/payment';
import { WalletBalanceLink, walletPaths, walletTexts } from '@/features/wallet';
import {
  AccountOverview,
  ContextSwitcher,
  ProfileTodo,
  RequireSession,
  accountTexts,
  identityPaths,
} from '@/features/identity';
import { getDictionary } from '@/i18n';
import { pageMetadata } from '@/lib/seo/metadata';

/**
 * « Mon espace KSP », tableau de bord du compte (F-020) : coque statique ; la garde reprend la session
 * dans le navigateur (F-005, option A). Dans l'ordre : le compte (salutation, compte actif, portefeuille,
 * notifications), « À faire maintenant » (seulement ce qui attend le client), les raccourcis des
 * services, puis « Bientôt ». Le Nettoyage (v2) y met ses frais de visite à régler et ses devis à
 * accepter.
 */

export const metadata: Metadata = {
  ...pageMetadata({ title: navigation.account.label, path: navigation.account.href }),
  robots: { index: false, follow: false },
};

export default function AccountPage() {
  const t = getDictionary();
  const services = [
    {
      href: cleaningPaths.space,
      title: cleaningTexts.space.title,
      text: cleaningTexts.space.homeLinkText,
      icon: <IconNettoyage className="size-5" />,
    },
    {
      href: billingPaths.list,
      title: billingTexts.title,
      text: billingTexts.lead,
      icon: <IconInvoice className="size-5" />,
    },
    {
      href: walletPaths.home,
      title: walletTexts.title,
      text: walletTexts.homeLinkText,
      icon: <IconWallet className="size-5" />,
    },
    {
      href: paymentPaths.list,
      title: paymentTexts.title,
      text: paymentTexts.lead,
      icon: <IconCard className="size-5" />,
    },
    {
      href: notificationPaths.list,
      title: notificationTexts.title,
      text: notificationTexts.homeLinkText,
      icon: <IconBell className="size-5" />,
    },
    {
      href: identityPaths.profile,
      title: accountTexts.home.profileLink,
      text: accountTexts.home.profileLinkText,
      icon: <IconUser className="size-5" />,
    },
    {
      href: identityPaths.organizations,
      title: accountTexts.home.organizationsLink,
      text: accountTexts.home.organizationsLinkText,
      icon: <IconBriefcase className="size-5" />,
    },
  ];

  return (
    <div className="bg-canvas">
      <RequireSession fallbackClassName="px-gutter max-w-page mx-auto w-full py-10 sm:py-14">
        <Container className="grid gap-8 pt-8 pb-16 sm:gap-10 sm:pt-12 sm:pb-24">
          {/* 1. Le compte : salutation, compte actif, solde du portefeuille (ADR-046), notifications (ADR-039). */}
          <section
            aria-label={navigation.account.label}
            className="rounded-panel border-line bg-surface border p-5 shadow-xs sm:p-8"
          >
            <div className="flex flex-wrap items-center justify-between gap-4">
              <Eyebrow>{navigation.account.label}</Eyebrow>
              <div className="flex flex-wrap items-center gap-3">
                <WalletBalanceLink />
                <NotificationBell />
              </div>
            </div>
            <div className="mt-6 grid gap-8 lg:grid-cols-12 lg:items-center lg:gap-10">
              <div className="lg:col-span-7">
                <AccountOverview />
              </div>
              <ContextSwitcher hint className="lg:col-span-5" />
            </div>
          </section>

          {/* 2. Seulement ce qui attend une action du client. */}
          <section
            aria-labelledby="a-faire-titre"
            className="rounded-panel border-line bg-surface border p-5 shadow-xs sm:p-8"
          >
            <Heading as="h2" size="h2" id="a-faire-titre">
              {t.account.todoTitle}
            </Heading>
            <p className="text-ink-muted mt-2">{t.account.todoLead}</p>
            <div className="mt-8 grid gap-10">
              <CleaningTodo />
              <InvoiceTodo />
              <ProfileTodo />
            </div>
          </section>

          {/* 3. Raccourcis vers les services de l'espace. */}
          <section aria-labelledby="prestations-titre">
            <Heading as="h2" size="h2" id="prestations-titre">
              {t.account.servicesTitle}
            </Heading>
            <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {services.map((service, index) => (
                <LinkCard key={service.href} index={index} {...service} />
              ))}
            </ul>
          </section>

          {/* 4. Bientôt. */}
          <section
            aria-labelledby="bientot-titre"
            className="rounded-panel border-line bg-surface border p-5 shadow-xs sm:p-6"
          >
            <EmptyState
              compact
              illustration="soon"
              title={t.account.soonTitle}
              titleAs="h2"
              titleId="bientot-titre"
              action={
                <span className="text-small text-ink-muted inline-flex items-center gap-2 font-semibold">
                  <IconClock className="size-4" />
                  {t.common.comingSoon}
                </span>
              }
            >
              {t.account.soonText}
            </EmptyState>
          </section>
        </Container>
      </RequireSession>
    </div>
  );
}
