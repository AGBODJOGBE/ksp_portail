import Link from 'next/link';
import type { ReactNode } from 'react';
import { IconArrowUpRight, IconHeadset, IconWhatsApp } from '@/components/ui/icons';
import { buttonClasses } from '@/components/ui/button';
import { Container } from '@/components/ui/container';
import { navigation } from '@/config/navigation';
import { siteConfig } from '@/config/site';
import { getDictionary } from '@/i18n';
import { whatsappHref } from './whatsapp-button';

/*
 * Textes du pied de page. Ici plutôt que dans `i18n` : le pied de page est rendu par le serveur, et le
 * dictionnaire, lu aussi par des composants client, entrerait dans le JavaScript de toutes les pages.
 */
const FOOTER = {
  helpTitle: 'Centre de services',
  helpText: 'Besoin d’assistance rapide ?',
  helpContact: 'Nous contacter',
  services: 'Nos services',
  allServices: 'Tous nos services',
  group: 'KSP',
  legal: 'Informations légales',
  personalData: 'Données personnelles',
  myData: 'Mon compte et mes données',
} as const;

const LINK =
  'inline-flex min-h-11 items-center gap-1.5 text-ink-muted hover:text-ink hover:underline underline-offset-4';

function FooterNav({ label, children }: { label: string; children: ReactNode }) {
  return (
    <nav aria-label={label}>
      <p className="text-eyebrow font-display text-ink font-bold uppercase">{label}</p>
      <ul className="mt-4">{children}</ul>
    </nav>
  );
}

/**
 * Pied de page (v3, F-020) : bandeau bleu nuit dégradé ; centre de services (WhatsApp si le numéro est
 * configuré, sinon la page Contact), colonnes à titres en capitales, trait, puis la ligne du groupe.
 */
export function SiteFooter() {
  const t = getDictionary();
  const otherSites = siteConfig.ecosystem.filter((site) => site.id !== siteConfig.id);
  const whatsapp = whatsappHref();
  const privacy = siteConfig.legal.filter((item) => item.href === '/confidentialite');
  const legal = siteConfig.legal.filter((item) => item.href !== '/confidentialite');
  return (
    <footer data-tone="inverse" className="footer-band text-small">
      <Container size="wide">
        <div className="border-line flex flex-col gap-6 border-b py-8 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <span className="grid size-12 shrink-0 place-items-center rounded-full bg-white/10">
              <IconHeadset className="size-6" />
            </span>
            <p>
              <span className="font-display text-ink block text-lg font-semibold">{FOOTER.helpTitle}</span>
              <span className="text-ink-muted text-base">{FOOTER.helpText}</span>
            </p>
          </div>
          {whatsapp ? (
            <a
              href={whatsapp}
              target="_blank"
              rel="noopener noreferrer"
              className={buttonClasses({ variant: 'inverse', className: 'self-start sm:self-auto' })}
            >
              <IconWhatsApp className="text-whatsapp size-5" />
              {t.common.contactWhatsapp}
              <IconArrowUpRight className="size-4" />
            </a>
          ) : (
            <Link
              href="/contact"
              className={buttonClasses({ variant: 'inverse', className: 'self-start sm:self-auto' })}
            >
              {FOOTER.helpContact}
              <IconArrowUpRight className="size-4" />
            </Link>
          )}
        </div>
      </Container>
      <Container
        size="wide"
        className="grid grid-cols-2 gap-x-6 gap-y-10 py-12 text-base sm:gap-x-8 lg:grid-cols-4"
      >
        <FooterNav label={FOOTER.services}>
          <li>
            <Link href={navigation.services.href} className={LINK}>
              {FOOTER.allServices}
            </Link>
          </li>
          {navigation.metiers.map((metier) => (
            <li key={metier.id}>
              <Link href={metier.href} className={LINK}>
                {metier.label}
              </Link>
            </li>
          ))}
        </FooterNav>
        <FooterNav label={FOOTER.group}>
          {navigation.group.map((item) => (
            <li key={item.href}>
              <Link href={item.href} className={LINK}>
                {item.label}
              </Link>
            </li>
          ))}
          {otherSites.map((site) => (
            <li key={site.id}>
              <a href={site.href} className={LINK}>
                {site.label}
                <IconArrowUpRight className="size-4" />
              </a>
            </li>
          ))}
        </FooterNav>
        <FooterNav label={FOOTER.legal}>
          {legal.map((item) => (
            <li key={item.href}>
              <Link href={item.href} className={LINK}>
                {item.label}
              </Link>
            </li>
          ))}
        </FooterNav>
        <FooterNav label={FOOTER.personalData}>
          {privacy.map((item) => (
            <li key={item.href}>
              <Link href={item.href} className={LINK}>
                {item.label}
              </Link>
            </li>
          ))}
          <li>
            <Link href="/mon-espace/compte" className={LINK}>
              {FOOTER.myData}
            </Link>
          </li>
        </FooterNav>
      </Container>
      <div className="border-line border-t">
        <Container size="wide" className="text-ink-muted pt-6 pb-24 text-center sm:pb-6">
          <p className="font-display font-medium">
            © {new Date().getFullYear()} Groupe KSP · {siteConfig.domain}
          </p>
        </Container>
      </div>
    </footer>
  );
}
