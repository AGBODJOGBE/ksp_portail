import Link from 'next/link';
import { WeaveEmblem, WeavePattern } from '@/components/ui/brand/weave';
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
 * et panneau tissé bleu nuit qui résume ce que le visiteur peut faire. Aucune animation : premier écran.
 */
export function MetierHero({ content }: { content: MetierHeroContent }) {
  const t = getDictionary();
  const metier = getMetier(content.metierId);
  return (
    <section
      aria-labelledby={METIER_TITLE_ID}
      className="border-line relative isolate overflow-hidden border-b"
    >
      <WeavePattern className="text-accent absolute inset-0 -z-10 size-full [mask-image:linear-gradient(100deg,transparent_50%,black_100%)] opacity-[0.08]" />
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
            <WeavePattern className="text-accent-bright absolute inset-0 -z-10 size-full opacity-15" />
            <div className="relative mx-auto my-4 grid w-2/5 max-w-52 place-items-center sm:my-8 lg:w-1/2">
              <WeaveEmblem className="w-full" />
              <span className="bg-brand-900 text-accent-bright ring-accent-bright/40 absolute grid size-[34%] place-items-center rounded-full ring-1">
                <MetierIcon id={metier.id} className="size-[58%]" />
              </span>
            </div>
            <div className="rounded-card border-line bg-surface mt-auto border p-5">
              <p className="font-display text-ink text-lg font-semibold">{content.highlightsTitle}</p>
              <ul className="text-small text-ink-muted mt-3 space-y-2.5">
                {content.highlights.map((item) => (
                  <li key={item} className="flex gap-2.5">
                    <IconCheck className="text-accent-ink mt-0.5 size-4" />
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
