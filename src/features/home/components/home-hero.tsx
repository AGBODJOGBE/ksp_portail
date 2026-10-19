import Link from 'next/link';
import { WeaveEmblem, WeavePattern } from '@/components/ui/brand/weave';
import { IconArrowRight } from '@/components/ui/icons';
import { ButtonArrow, ButtonLink } from '@/components/ui/button';
import { Container } from '@/components/ui/container';
import { Eyebrow } from '@/components/ui/eyebrow';
import { navigation } from '@/config/navigation';
import type { HomeContent } from '@/features/home/content';

/** Promesse du groupe : grande typographie à gauche, panneau tissé bleu nuit à droite. */
export function HomeHero({ content }: { content: HomeContent['hero'] }) {
  return (
    <section
      aria-labelledby="accueil-titre"
      className="border-line relative isolate overflow-hidden border-b"
    >
      {/* Trame en filigrane, estompée vers le texte pour ne pas gêner la lecture. */}
      <WeavePattern className="text-accent absolute inset-0 -z-10 size-full [mask-image:linear-gradient(100deg,transparent_45%,black_95%)] opacity-[0.09]" />
      <Container className="grid gap-12 py-14 sm:py-20 lg:grid-cols-12 lg:items-center lg:gap-10 lg:py-24">
        <div className="lg:col-span-7">
          <Eyebrow>{content.eyebrow}</Eyebrow>
          <h1 id="accueil-titre" className="font-display text-display text-ink mt-6 font-semibold">
            {content.title} <span className="text-accent-ink">{content.titleAccent}</span>
          </h1>
          <p className="text-lead text-ink-muted mt-6 max-w-2xl">{content.lead}</p>
          <div className="mt-10 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            <ButtonLink href={content.primaryAction.href} variant="accent" size="lg">
              {content.primaryAction.label}
              <ButtonArrow>
                <IconArrowRight />
              </ButtonArrow>
            </ButtonLink>
            <ButtonLink href={content.secondaryAction.href} variant="secondary" size="lg">
              {content.secondaryAction.label}
            </ButtonLink>
          </div>
        </div>

        <div className="lg:col-span-5">
          <div
            data-tone="inverse"
            className="rounded-panel relative isolate flex flex-col overflow-hidden p-5 sm:p-7 lg:min-h-128"
          >
            <WeavePattern className="text-accent-bright absolute inset-0 -z-10 size-full opacity-15" />
            <div className="flex flex-1 items-center justify-center py-8 sm:py-10">
              <WeaveEmblem className="w-1/2 max-w-64" />
            </div>
            <div className="rounded-card border-line bg-surface border p-5">
              <p className="font-display text-h3 text-ink font-semibold">{content.panelTitle}</p>
              <p className="text-small text-ink-muted mt-2">{content.panelText}</p>
              <Link
                href={navigation.account.href}
                className="group/link text-accent-ink mt-3 inline-flex min-h-11 items-center gap-1.5 font-semibold"
              >
                {navigation.account.label}
                <IconArrowRight className="ease-soft size-4 transition-transform duration-(--motion-base) group-hover/link:translate-x-1" />
              </Link>
            </div>
          </div>
        </div>
      </Container>
    </section>
  );
}
