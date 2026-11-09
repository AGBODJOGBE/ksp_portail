import { MetierIcon } from '@/components/sections/metier-icon';
import { SignatureArrow } from '@/components/ui/brand/signature';
import { ButtonArrow, ButtonLink } from '@/components/ui/button';
import { Container } from '@/components/ui/container';
import { HeroBand } from '@/components/ui/hero-band';
import { IconArrowRight } from '@/components/ui/icons';
import { LinkCard } from '@/components/ui/link-card';
import { contactHref, navigation } from '@/config/navigation';
import { homeContent } from '@/features/home';
import { getDictionary } from '@/i18n';

/**
 * Page introuvable (direction « Signature ») : bande bleu nuit, « 404 » en très grand avec la flèche or
 * de la signature, retour à l'accueil ou contact ; puis les six métiers, pour repartir du bon pied.
 */
export default function NotFound() {
  const t = getDictionary();
  return (
    <>
      <HeroBand overlap containerClassName="pt-12 sm:pt-20">
        <p
          aria-hidden="true"
          className="font-display text-accent-ink flex items-center gap-3 text-[clamp(4.5rem,3rem+7vw,9rem)] leading-none font-semibold tracking-tight"
        >
          404
          <SignatureArrow className="h-[0.4em] w-[0.34em]" />
        </p>
        <h1 className="font-display text-h1 text-ink mt-6 font-semibold">{t.errors.notFoundTitle}</h1>
        <p className="text-lead text-ink-muted mt-4 max-w-xl">{t.errors.notFoundText}</p>
        <div className="mt-10 flex flex-col gap-3 sm:flex-row">
          <ButtonLink href="/" variant="action" size="lg" className="shadow-action">
            {t.common.backHome}
            <ButtonArrow>
              <IconArrowRight />
            </ButtonArrow>
          </ButtonLink>
          <ButtonLink href={contactHref()} variant="secondary" size="lg">
            {homeContent.closing.primaryAction.label}
          </ButtonLink>
        </div>
      </HeroBand>
      <Container className="relative -mt-14 pb-16 sm:-mt-16 sm:pb-24">
        <nav
          aria-label={t.nav.metiers}
          className="rounded-panel border-line bg-surface shadow-float border p-5 sm:p-8"
        >
          <p className="font-display text-ink text-xl font-semibold">{t.nav.metiersTitle}</p>
          <ul className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {navigation.metiers.map((metier) => (
              <LinkCard
                key={metier.id}
                href={metier.href}
                title={metier.label}
                text={metier.summary}
                icon={<MetierIcon id={metier.id} className="size-5" />}
              />
            ))}
          </ul>
        </nav>
      </Container>
    </>
  );
}
