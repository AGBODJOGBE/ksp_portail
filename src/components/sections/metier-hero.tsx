import Link from 'next/link';
import { SignatureBackdrop, SignatureRule } from '@/components/ui/brand/signature';
import { IconCheck, IconClock } from '@/components/ui/icons';
import { MetierIcon } from '@/components/sections/metier-icon';
import { Badge } from '@/components/ui/badge';
import { Container } from '@/components/ui/container';
import { Eyebrow } from '@/components/ui/eyebrow';
import type { MetierHeroContent } from '@/components/sections/types';
import { getMetier } from '@/config/metiers';
import { getDictionary } from '@/i18n';
import { PageActions } from './page-actions';
import { frenchSpacing } from '@/lib/typography';

/** Identifiant du titre principal d'une page métier (relié à l'en-tête par `aria-labelledby`). */
export const METIER_TITLE_ID = 'metier-titre';

/**
 * En-tête d'une page métier : fil d'Ariane, surtitre, titre (seul `h1` de la page), chapeau, actions,
 * et panneau bleu nuit qui résume ce que le visiteur peut faire. Aucune animation : premier écran.
 */
export function MetierHero({ content }: { content: MetierHeroContent }) {
  const t = getDictionary();
  const metier = getMetier(content.metierId);
  return (
    <section
      aria-labelledby={METIER_TITLE_ID}
      className="border-line relative isolate overflow-hidden border-b"
    >
      <SignatureBackdrop className="absolute inset-0 -z-10 size-full [mask-image:linear-gradient(100deg,transparent_50%,black_100%)] opacity-[0.06]" />
      <Container className="grid gap-10 pt-6 pb-14 sm:pb-20 lg:grid-cols-12 lg:items-center lg:gap-10 lg:pt-8 lg:pb-24">
        <div className="lg:col-span-7">
          <nav aria-label={t.metier.breadcrumb}>
            <ol className="text-small text-ink-muted flex flex-wrap items-center gap-x-2">
              <li className="flex items-center gap-2">
                <Link
                  href="/"
                  className="hover:text-ink inline-flex min-h-11 items-center underline-offset-4 hover:underline"
                >
                  {t.metier.home}
                </Link>
                <span aria-hidden="true" className="bg-line-control size-1 rotate-45" />
              </li>
              <li>
                <span aria-current="page" className="text-ink inline-flex min-h-11 items-center font-medium">
                  {metier.label}
                </span>
              </li>
            </ol>
          </nav>

          <div className="mt-6 flex flex-wrap items-center gap-3 sm:mt-10">
            <Eyebrow>{metier.label}</Eyebrow>
            {content.status ? (
              <Badge tone="accent">
                <IconClock className="size-3.5" />
                {content.status}
              </Badge>
            ) : null}
          </div>
          <h1 id={METIER_TITLE_ID} className="font-display text-h1 text-ink mt-5 max-w-3xl font-semibold">
            {frenchSpacing(content.title)}
          </h1>
          <p className="text-lead text-ink-muted mt-6 max-w-2xl">{frenchSpacing(content.lead)}</p>
          <PageActions actions={content.actions} className="mt-10" />
          {content.note ? <p className="text-small text-ink-muted mt-5 max-w-xl">{content.note}</p> : null}
        </div>

        <div className="lg:col-span-5">
          <div
            data-tone="inverse"
            className="rounded-panel relative isolate flex flex-col overflow-hidden p-5 sm:p-7 lg:min-h-112"
          >
            <SignatureBackdrop className="absolute inset-0 -z-10 size-full opacity-[0.14]" />
            <div className="relative mx-auto my-4 grid w-full max-w-60 justify-items-center gap-5 sm:my-8">
              <span className="text-accent-ink ring-accent-bright/50 grid size-24 place-items-center rounded-full bg-white/5 ring-1 sm:size-28">
                <MetierIcon id={metier.id} className="size-11 sm:size-12" />
              </span>
              <SignatureRule size="md" className="w-full" />
            </div>
            <div className="rounded-card border-line bg-surface mt-auto border p-5">
              <p className="font-display text-ink text-lg font-semibold">{content.highlightsTitle}</p>
              <ul className="text-small text-ink-muted mt-3 space-y-2.5">
                {content.highlights.map((item) => (
                  <li key={item} className="flex gap-2.5">
                    <IconCheck className="text-action-ink mt-0.5 size-4" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </Container>
    </section>
  );
}
