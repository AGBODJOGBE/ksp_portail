import { Logo } from '@/components/ui/brand/logo';
import { IconArrowRight, IconArrowUpRight, IconClose, IconMenu } from '@/components/ui/icons';
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

const MOBILE_MENU_ID = 'menu-mobile';

/**
 * Lien de premier niveau (v3) : texte gris en police des titres, plus foncé au survol ; soulignement vert
 * qui se déploie au survol et marque la page courante.
 */
const NAV_ITEM = cn(
  'relative inline-flex min-h-11 items-center gap-1.5 rounded-full px-4 font-display text-base font-medium',
  'text-ink-muted hover:text-ink aria-[current=page]:text-ink aria-[current=page]:font-semibold',
  'after:absolute after:inset-x-4 after:bottom-1 after:h-0.5 after:origin-left after:scale-x-0 after:rounded-full after:bg-action',
  'after:transition-transform after:duration-(--motion-base) after:ease-soft',
  'hover:after:scale-x-100 aria-[current=page]:after:scale-x-100',
);

const otherSites = siteConfig.ecosystem.filter((site) => site.id !== siteConfig.id);

/**
 * En-tête (v3, F-020) : logo, « Nos services » (les six métiers en sont les catégories) et « Suivre ma
 * demande » ; à droite, « Créer un compte » et « Se connecter ». Menu plein écran sur téléphone.
 */
export function SiteHeader() {
  const t = getDictionary();
  return (
    <header className="site-header sticky top-0 z-(--z-header) [view-transition-name:site-header]">
      <Container size="wide" className="flex h-(--header-h) items-center gap-3 lg:gap-6">
        <Logo />

        <nav aria-label={t.nav.main} className="header-full hidden lg:ml-auto lg:block">
          <ul className="flex items-center gap-1">
            <li>
              <NavLink href={navigation.services.href} className={NAV_ITEM}>
                {navigation.services.label}
              </NavLink>
            </li>
            <li>
              <NavLink href={navigation.track.href} className={NAV_ITEM}>
                {navigation.track.label}
              </NavLink>
            </li>
          </ul>
        </nav>

        <div className="header-actions ml-auto flex items-center gap-2 lg:ml-0 lg:gap-3">
          {/* « Créer un compte » et « Se connecter », ou « Mon espace KSP » selon la session en mémoire. */}
          <AccountLink login={navigation.login} account={navigation.account} signup={navigation.signup} />
          <button
            type="button"
            popoverTarget={MOBILE_MENU_ID}
            aria-label={t.nav.openMenu}
            className={buttonClasses({ variant: 'ghost', size: 'icon', className: 'header-full lg:hidden' })}
          >
            <IconMenu className="size-6" />
          </button>
        </div>
      </Container>

      {/* Téléphone et tablette : menu plein écran. */}
      <NavPopover
        id={MOBILE_MENU_ID}
        lockScroll
        className="popover-panel bg-canvas text-ink fixed inset-0 m-0 h-dvh max-h-none w-full max-w-none overflow-y-auto overscroll-contain border-0 p-0 lg:hidden"
      >
        <div className="border-line sticky top-0 z-10 border-b bg-white">
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
            <ul className="mb-10 grid gap-2">
              {[navigation.services, navigation.track].map((item) => (
                <li key={item.label}>
                  <NavLink
                    href={item.href}
                    className="rounded-card border-line bg-surface text-ink aria-[current=page]:border-brand font-display flex min-h-14 items-center justify-between gap-4 border px-5 text-lg font-semibold shadow-xs"
                  >
                    {item.label}
                    <IconArrowRight className="text-ink-subtle size-5" />
                  </NavLink>
                </li>
              ))}
            </ul>
            <Eyebrow>{t.nav.group}</Eyebrow>
            <ul className="mt-3 grid grid-cols-2 gap-x-4">
              {navigation.group.map((item) => (
                <li key={item.href}>
                  <NavLink
                    href={item.href}
                    className="text-ink aria-[current=page]:text-action-ink flex min-h-12 items-center text-lg font-medium aria-[current=page]:font-semibold"
                  >
                    {item.label}
                  </NavLink>
                </li>
              ))}
            </ul>
          </nav>
          <AccountLink
            login={navigation.login}
            account={navigation.account}
            signup={navigation.signup}
            variant="menu"
          />
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
