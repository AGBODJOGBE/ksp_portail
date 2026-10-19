import type { Metadata } from 'next';
import { WeavePattern } from '@/components/ui/brand/weave';
import { IconArrowRight, IconClock } from '@/components/ui/icons';
import { ButtonArrow, ButtonLink } from '@/components/ui/button';
import { Container } from '@/components/ui/container';
import { Eyebrow } from '@/components/ui/eyebrow';
import { Heading } from '@/components/ui/heading';
import { navigation } from '@/config/navigation';
import { getDictionary } from '@/i18n';
import { pageMetadata } from '@/lib/seo/metadata';

/** Page d'attente de « Mon espace KSP », remplacée par l'espace client après les contrats de la gateway. */
export const metadata: Metadata = {
  ...pageMetadata({ title: navigation.account.label, path: navigation.account.href }),
  robots: { index: false, follow: true },
};

export default function AccountSoonPage() {
  const t = getDictionary();
  return (
    <div className="relative overflow-hidden">
      <WeavePattern className="text-accent absolute inset-y-0 right-0 hidden h-full w-1/3 [mask-image:linear-gradient(to_left,black,transparent)] opacity-15 md:block" />
      <Container className="py-section relative">
        <div className="max-w-reading">
          <Eyebrow>{navigation.account.label}</Eyebrow>
          <Heading as="h1" size="h1" className="mt-5">
            {t.account.soonTitle}
          </Heading>
          <p className="text-lead text-ink-muted mt-5">{t.account.soonText}</p>
          <p className="text-small text-ink-muted mt-8 inline-flex items-center gap-2">
            <IconClock className="text-accent-ink" />
            {t.common.comingSoon}
          </p>
          <div className="mt-10">
            <ButtonLink href="/" variant="secondary">
              {t.common.backHome}
              <ButtonArrow>
                <IconArrowRight />
              </ButtonArrow>
            </ButtonLink>
          </div>
        </div>
      </Container>
    </div>
  );
}
