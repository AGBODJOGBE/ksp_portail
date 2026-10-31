import { IconArrowRight, IconUser } from '@/components/ui/icons';
import { ButtonArrow, ButtonLink } from '@/components/ui/button';
import { Section } from '@/components/ui/section';
import { SectionHeader } from '@/components/ui/section-header';
import { navigation } from '@/config/navigation';
import type { HomeContent } from '@/features/home/content';

/** Dernier appel à l'action avant le pied de page : contact, ou accès à l'espace client. */
export function ClosingCta({ content }: { content: HomeContent['closing'] }) {
  return (
    <Section labelledBy="contact-titre" tone="accent" spacing="small">
      <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
        <SectionHeader
          id="contact-titre"
          eyebrow={content.eyebrow}
          title={content.title}
          lead={content.lead}
        />
        <div className="reveal flex flex-col gap-3 sm:flex-row">
          <ButtonLink href={content.primaryAction.href} variant="action" size="lg">
            {content.primaryAction.label}
            <ButtonArrow>
              <IconArrowRight />
            </ButtonArrow>
          </ButtonLink>
          <ButtonLink href={navigation.account.href} variant="secondary" size="lg">
            <IconUser />
            {navigation.account.label}
          </ButtonLink>
        </div>
      </div>
    </Section>
  );
}
