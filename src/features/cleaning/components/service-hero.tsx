import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Eyebrow } from '@/components/ui/eyebrow';
import { HeroBand } from '@/components/ui/hero-band';
import { IconCheck, IconClock } from '@/components/ui/icons';
import { PageActions } from '@/components/sections/page-actions';
import type { MetierHeroContent } from '@/components/sections/types';
import { getMetier } from '@/config/metiers';
import { getDictionary } from '@/i18n';
import { frenchSpacing } from '@/lib/typography';
import { cleaningTexts } from '@/features/cleaning/texts';

/** Identifiant du titre principal de la page (relié à la section par `aria-labelledby`). */
const TITLE_ID = 'nettoyage-titre';

/**
 * Premier écran du Nettoyage (direction « Signature ») : « Simuler un prix » et « Demander un devis » en
 * actions, et un panneau qui résume le parcours en trois temps. Contenu statique, rendu par le serveur ;
 * le titre n'est pas animé (premier affichage).
 */
export function CleaningServiceHero({ content }: { content: MetierHeroContent }) {
  const t = getDictionary();
  const h = cleaningTexts.hero;
  const metier = getMetier(content.metierId);
  return (
    <HeroBand labelledBy={TITLE_ID} containerClassName="pt-4 sm:pt-6 lg:pt-8">
      <div className="grid gap-10 lg:grid-cols-12 lg:items-center lg:gap-12">
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
                <span aria-hidden="true" className="text-ink-subtle">
                  /
                </span>
              </li>
              <li>
                <span aria-current="page" className="text-ink inline-flex min-h-11 items-center font-medium">
                  {metier.label}
                </span>
              </li>
            </ol>
          </nav>

          <div className="mt-6 flex flex-wrap items-center gap-3 sm:mt-8">
            <Eyebrow>{metier.label}</Eyebrow>
            {content.status ? (
              <Badge tone="accent" dot>
                {content.status}
              </Badge>
            ) : null}
          </div>
          <h1 id={TITLE_ID} className="font-display text-h1 text-ink mt-5 max-w-3xl font-semibold">
            {frenchSpacing(content.title)}
          </h1>
          <p className="text-lead text-ink-muted mt-6 max-w-2xl">{frenchSpacing(content.lead)}</p>
          <PageActions actions={content.actions} className="mt-10" />
          <ul className="text-small text-ink mt-8 grid gap-2 sm:grid-cols-2">
            {content.highlights.map((item) => (
              <li key={item} className="flex gap-2">
                <IconCheck className="text-action-ink mt-0.5 size-4" />
                {item}
              </li>
            ))}
          </ul>
        </div>

        <div className="lg:col-span-5">
          <div className="rounded-panel border-line bg-brand-soft relative p-6 backdrop-blur-sm sm:p-8">
            <Eyebrow>{h.panelEyebrow}</Eyebrow>
            <p className="font-display text-h3 text-ink mt-4 font-semibold">{frenchSpacing(h.panelTitle)}</p>
            <ol className="mt-5 grid gap-3">
              {h.panelSteps.map((step, index) => (
                <li key={step} className="text-ink flex items-start gap-3">
                  <span
                    aria-hidden="true"
                    className="bg-brand text-on-brand grid size-7 shrink-0 place-items-center rounded-full text-sm font-bold"
                  >
                    {index + 1}
                  </span>
                  <span className="pt-0.5">{frenchSpacing(step)}</span>
                </li>
              ))}
            </ol>
            <p className="text-small text-ink-muted border-line mt-6 flex gap-2 border-t pt-4">
              <IconClock className="text-accent-ink mt-0.5 size-4 shrink-0" />
              {frenchSpacing(h.panelNote)}
            </p>
          </div>
        </div>
      </div>
    </HeroBand>
  );
}
