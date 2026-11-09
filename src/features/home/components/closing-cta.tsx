import { SignatureBackdrop, SignatureRule } from '@/components/ui/brand/signature';
import { ButtonArrow, ButtonLink } from '@/components/ui/button';
import { Container } from '@/components/ui/container';
import { Eyebrow } from '@/components/ui/eyebrow';
import { Heading } from '@/components/ui/heading';
import { IconArrowRight, IconUser } from '@/components/ui/icons';
import { navigation } from '@/config/navigation';
import type { HomeContent } from '@/features/home/content';
import { frenchSpacing } from '@/lib/typography';

/**
 * Dernier appel à l'action avant le pied de page : un panneau bleu nuit aux angles arrondis, posé sur la
 * page (il ne se confond pas avec le pied de page), avec la signature en filigrane. Contact, ou accès à
 * l'espace client.
 */
export function ClosingCta({ content }: { content: HomeContent['closing'] }) {
  return (
    <section aria-labelledby="contact-titre" className="py-section-sm">
      <Container>
        <div
          data-tone="inverse"
          className="hero-band rounded-panel shadow-float reveal relative isolate overflow-hidden px-6 py-12 sm:px-12 sm:py-16 lg:px-16"
        >
          <SignatureBackdrop className="absolute inset-y-0 right-0 -z-10 h-full w-full [mask-image:linear-gradient(to_left,black,transparent_75%)] opacity-20" />
          <div className="flex flex-col gap-10 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-reading">
              <Eyebrow>{content.eyebrow}</Eyebrow>
              <Heading id="contact-titre" size="h1" className="mt-4">
                {frenchSpacing(content.title)}
              </Heading>
              <p className="text-lead text-ink-muted mt-4">{frenchSpacing(content.lead)}</p>
              <SignatureRule size="md" className="mt-8 max-w-56" />
            </div>
            <div className="flex shrink-0 flex-col gap-3 sm:flex-row">
              <ButtonLink
                href={content.primaryAction.href}
                variant="action"
                size="lg"
                className="shadow-action"
              >
                {content.primaryAction.label}
                <ButtonArrow>
                  <IconArrowRight />
                </ButtonArrow>
              </ButtonLink>
              <ButtonLink href={navigation.account.href} variant="inverse" size="lg">
                <IconUser />
                {navigation.account.label}
              </ButtonLink>
            </div>
          </div>
        </div>
      </Container>
    </section>
  );
}
