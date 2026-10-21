import Link from 'next/link';
import type { ReactNode } from 'react';
import { WeaveBand, WeaveMark } from '@/components/ui/brand/weave';
import { IconArrowUpRight, IconUser } from '@/components/ui/icons';
import { ButtonLink } from '@/components/ui/button';
import { Container } from '@/components/ui/container';
import { navigation } from '@/config/navigation';
import { siteConfig } from '@/config/site';
import { getDictionary } from '@/i18n';

const LINK = 'inline-flex min-h-11 items-center gap-1.5 text-ink-muted hover:text-ink';

function FooterNav({ label, children }: { label: string; children: ReactNode }) {
  return (
    <nav aria-label={label}>
      <p className="text-eyebrow text-accent-ink font-semibold uppercase">{label}</p>
      <ul className="mt-4">{children}</ul>
    </nav>
  );
}

export function SiteFooter() {
  const t = getDictionary();
  const otherSites = siteConfig.ecosystem.filter((site) => site.id !== siteConfig.id);
  return (
    <footer data-tone="inverse" className="text-small">
      <WeaveBand />
      <Container className="grid grid-cols-2 gap-x-6 gap-y-12 py-16 lg:grid-cols-12 lg:gap-8">
        <div className="col-span-2 lg:col-span-4">
          <p className="font-display text-ink flex items-center gap-2.5 text-2xl font-bold tracking-tight">
            <WeaveMark className="size-8" />
            {siteConfig.name}
          </p>
          <p className="font-display text-ink mt-5 max-w-xs text-lg leading-snug font-medium">
            {siteConfig.tagline}
          </p>
          <ButtonLink href={navigation.account.href} variant="primary" className="mt-6">
            <IconUser />
            {navigation.account.label}
          </ButtonLink>
        </div>
        <div className="col-span-2 sm:col-span-1 lg:col-span-3">
          <FooterNav label={t.nav.metiers}>
            {navigation.metiers.map((metier) => (
              <li key={metier.id}>
                <Link href={metier.href} className={LINK}>
                  {metier.label}
                </Link>
              </li>
            ))}
          </FooterNav>
        </div>
        <div className="lg:col-span-2">
          <FooterNav label={t.nav.group}>
            {navigation.group.map((item) => (
              <li key={item.href}>
                <Link href={item.href} className={LINK}>
                  {item.label}
                </Link>
              </li>
            ))}
          </FooterNav>
        </div>
        <div className="lg:col-span-3">
          <FooterNav label={t.common.ecosystem}>
            {otherSites.map((site) => (
              <li key={site.id}>
                <a href={site.href} className={LINK}>
                  {site.label}
                  <IconArrowUpRight className="size-4" />
                </a>
              </li>
            ))}
          </FooterNav>
        </div>
      </Container>
      <div className="border-line border-t">
        <Container className="text-ink-subtle flex flex-col gap-4 pt-6 pb-24 sm:flex-row sm:items-center sm:justify-between sm:pb-6">
          <p>
            © {new Date().getFullYear()} Groupe KSP · {siteConfig.domain}
          </p>
          <nav aria-label={t.common.legal}>
            <ul className="flex flex-wrap gap-x-6">
              {siteConfig.legal.map((item) => (
                <li key={item.href}>
                  <Link href={item.href} className={LINK}>
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </Container>
      </div>
    </footer>
  );
}
