import { Logo } from '@/components/ui/brand/logo';
import {
  IconArrowRight,
  IconArrowUpRight,
  IconChevronDown,
  IconClose,
  IconMenu,
} from '@/components/ui/icons';
import { MetierIcon } from '@/components/sections/metier-icon';
import { buttonClasses } from '@/components/ui/button';
import { Container } from '@/components/ui/container';
import { Eyebrow } from '@/components/ui/eyebrow';
import { navigation } from '@/config/navigation';
import { siteConfig } from '@/config/site';
import { getDictionary } from '@/i18n';
import { cn } from '@/lib/cn';
import { AccountLink } from './account-link';
import { NavLink } from './nav-link';
import { NavPopover } from './nav-popover';

/* Identifiants repris en clair dans les variantes Tailwind ci-dessous (classes détectées à la compilation). */
const METIERS_MENU_ID = 'menu-metiers';
const MOBILE_MENU_ID = 'menu-mobile';

/** Lien de premier niveau : soulignement ocre qui se déploie au survol et marque la page courante. */
const NAV_ITEM = cn(
  'relative inline-flex min-h-11 items-center gap-1.5 rounded-control px-3.5 text-[0.9375rem] font-medium',
  'text-ink-muted hover:text-ink aria-[current=page]:text-ink',
  'after:absolute after:inset-x-3.5 after:bottom-1.5 after:h-0.5 after:origin-left after:scale-x-0 after:bg-accent',
  'after:transition-transform after:duration-(--motion-base) after:ease-soft',
  'hover:after:scale-x-100 aria-[current=page]:after:scale-x-100',
);

const otherSites = siteConfig.ecosystem.filter((site) => site.id !== siteConfig.id);

function MetierTile({ id }: { id: Parameters<typeof MetierIcon>[0]['id'] }) {
  return (
    <span className="rounded-control bg-accent-soft text-accent-ink grid size-11 shrink-0 place-items-center">
      <MetierIcon id={id} className="size-[1.375rem]" />
    </span>
  );
}

export function SiteHeader() {
  const t = getDictionary();
  return (
    <header className="border-line bg-canvas sticky top-0 z-(--z-header) border-b [view-transition-name:site-header]">
      <Container className="flex h-(--header-h) items-center gap-4 lg:gap-8">
        <Logo />

        <nav aria-label={t.nav.main} className="hidden lg:block">
          <ul className="flex items-center gap-1">
            <li>
              <button
                type="button"
                popoverTarget={METIERS_MENU_ID}
                className={cn(NAV_ITEM, '[:root:has(#menu-metiers:popover-open)_&]:text-ink')}
              >
                {t.nav.metiers}
                <IconChevronDown
                  className={cn(
                    'ease-soft size-4 transition-transform duration-(--motion-base)',
                    '[:root:has(#menu-metiers:popover-open)_&]:rotate-180',
                  )}
                />
              </button>
            </li>
            {navigation.group.map((item) => (
              <li key={item.href}>
                <NavLink href={item.href} className={NAV_ITEM}>
                  {item.label}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>

        <div className="ml-auto flex items-center gap-2">
          {/* « Se connecter » ou « Mon espace KSP » selon la session en mémoire. */}
          <AccountLink login={navigation.login} account={navigation.account} />
          <button
            type="button"
            popoverTarget={MOBILE_MENU_ID}
            aria-label={t.nav.openMenu}
            className={buttonClasses({ variant: 'ghost', size: 'icon', className: 'lg:hidden' })}
          >
            <IconMenu className="size-6" />
          </button>
        </div>
      </Container>

      {/* Ordinateur : panneau des six métiers sous l'en-tête. */}
      <NavPopover
        id={METIERS_MENU_ID}
        className="popover-panel border-line bg-canvas text-ink shadow-raised fixed inset-x-0 top-(--header-h) bottom-auto m-0 h-auto w-full max-w-none border-0 border-b p-0 max-lg:hidden"
      >
        <Container className="grid gap-10 py-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,3fr)]">
          <div>
            <Eyebrow>{t.nav.metiers}</Eyebrow>
            <p className="font-display text-h3 text-ink mt-4 font-semibold">{t.nav.metiersTitle}</p>
            <p className="text-small text-ink-muted mt-3">{t.nav.metiersText}</p>
            <ul className="text-small mt-6 space-y-1">
              {otherSites.map((site) => (
                <li key={site.id}>
                  <a
                    href={site.href}
                    className="text-brand-ink inline-flex min-h-11 items-center gap-1.5 font-semibold underline-offset-4 hover:underline"
                  >
                    {site.label}
                    <IconArrowUpRight className="size-4" />
                  </a>
                </li>
              ))}
            </ul>
          </div>
          <ul className="grid grid-cols-3 gap-2">
            {navigation.metiers.map((metier) => (
              <li key={metier.id}>
                <NavLink
                  href={metier.href}
                  className="hover-veil rounded-card group/item flex h-full gap-4 p-4 aria-[current=page]:before:opacity-100"
                >
                  <MetierTile id={metier.id} />
                  <span>
                    <span className="text-ink flex items-center gap-1.5 font-semibold">
                      {metier.label}
                      <IconArrowRight className="ease-soft size-4 -translate-x-1 opacity-0 transition duration-(--motion-base) group-hover/item:translate-x-0 group-hover/item:opacity-100" />
                    </span>
                    <span className="text-small text-ink-muted mt-1 block">{metier.summary}</span>
                  </span>
                </NavLink>
              </li>
            ))}
          </ul>
        </Container>
      </NavPopover>

      {/* Téléphone et tablette : menu plein écran. */}
      <NavPopover
        id={MOBILE_MENU_ID}
        lockScroll
        className="popover-panel bg-canvas text-ink fixed inset-0 m-0 h-dvh max-h-none w-full max-w-none overflow-y-auto overscroll-contain border-0 p-0 lg:hidden"
      >
        <div className="border-line bg-canvas sticky top-0 z-10 border-b">
          <Container className="flex h-(--header-h) items-center justify-between gap-4">
            <Logo />
            <button
              type="button"
              popoverTarget={MOBILE_MENU_ID}
              popoverTargetAction="hide"
              aria-label={t.nav.closeMenu}
              className={buttonClasses({ variant: 'ghost', size: 'icon' })}
            >
              <IconClose className="size-6" />
            </button>
          </Container>
        </div>
        <Container className="pt-8 pb-12">
          <nav aria-label={t.nav.main}>
            <Eyebrow>{t.nav.metiers}</Eyebrow>
            <ul className="divide-line border-line mt-4 divide-y border-y">
              {navigation.metiers.map((metier) => (
                <li key={metier.id}>
                  <NavLink
                    href={metier.href}
                    className="group/item flex min-h-16 items-center gap-4 py-2.5 aria-[current=page]:font-bold"
                  >
                    <MetierTile id={metier.id} />
                    <span className="font-display text-ink text-lg leading-snug font-semibold">
                      {metier.label}
                    </span>
                    <IconArrowRight className="text-ink-subtle ease-soft ml-auto size-5 transition-transform duration-(--motion-base) group-active/item:translate-x-1" />
                  </NavLink>
                </li>
              ))}
            </ul>
            <Eyebrow className="mt-10">{t.nav.group}</Eyebrow>
            <ul className="mt-3 grid grid-cols-2 gap-x-4">
              {navigation.group.map((item) => (
                <li key={item.href}>
                  <NavLink
                    href={item.href}
                    className="text-ink aria-[current=page]:text-accent-ink flex min-h-12 items-center text-lg font-medium"
                  >
                    {item.label}
                  </NavLink>
                </li>
              ))}
            </ul>
          </nav>
          <AccountLink login={navigation.login} account={navigation.account} variant="menu" />
          <div className="border-line mt-10 border-t pt-6">
            <p className="text-small text-ink-subtle font-semibold">{t.common.ecosystem}</p>
            <ul className="mt-2 flex flex-wrap gap-x-6">
              {otherSites.map((site) => (
                <li key={site.id}>
                  <a
                    href={site.href}
                    className="text-brand-ink inline-flex min-h-11 items-center gap-1.5 font-semibold"
                  >
                    {site.label}
                    <IconArrowUpRight className="size-4" />
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </Container>
      </NavPopover>
    </header>
  );
}
