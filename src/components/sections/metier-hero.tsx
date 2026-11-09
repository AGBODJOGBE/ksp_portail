import Link from 'next/link';
import type { CSSProperties } from 'react';
import { SignatureRule } from '@/components/ui/brand/signature';
import { IconCheck, IconClock } from '@/components/ui/icons';
import { MetierIcon } from '@/components/sections/metier-icon';
import { Badge } from '@/components/ui/badge';
import { HeroBand } from '@/components/ui/hero-band';
import { Eyebrow } from '@/components/ui/eyebrow';
import type { MetierHeroContent } from '@/components/sections/types';
import { getMetier } from '@/config/metiers';
import { getDictionary } from '@/i18n';
import { PageActions } from './page-actions';
import { frenchSpacing } from '@/lib/typography';

/** Identifiant du titre principal d'une page métier (relié à l'en-tête par `aria-labelledby`). */
export const METIER_TITLE_ID = 'metier-titre';

/**
 * En-tête d'une page métier (direction « Signature ») : bande bleu nuit, fil d'Ariane, surtitre et état
 * d'ouverture, titre (seul `h1` de la page), chapeau, actions ; à droite, un panneau translucide qui
 * résume ce que le visiteur peut faire, ses points reliés par le fil de la signature. Rendu par le
 * serveur ; le titre n'est pas animé (premier affichage).
 */
export function MetierHero({ content }: { content: MetierHeroContent }) {
  const t = getDictionary();
  const metier = getMetier(content.metierId);
  return (
    <HeroBand labelledBy={METIER_TITLE_ID} containerClassName="pt-4 pb-14 sm:pt-6 sm:pb-20 lg:pt-8 lg:pb-24">
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
          {content.note ? (
            <p className="text-small text-ink-muted mt-6 max-w-xl">{frenchSpacing(content.note)}</p>
          ) : null}
        </div>

        <div className="lg:col-span-5">
          <div className="rounded-panel border-line bg-brand-soft relative border p-6 backdrop-blur-sm sm:p-8">
            <div className="flex items-center gap-4">
              <span
                aria-hidden="true"
                className="rounded-icon bg-accent text-on-accent grid size-12 shrink-0 place-items-center"
              >
                <MetierIcon id={metier.id} className="size-6" />
              </span>
              <p className="font-display text-h3 text-ink font-semibold">{content.highlightsTitle}</p>
            </div>
            <ul className="relative mt-7 grid gap-5">
              {/* Fil de la signature qui relie les points : bleu nuit, vert, or (éclaircis sur bleu nuit). */}
              <span
                aria-hidden="true"
                className="grow-y from-signature-1 via-signature-2 to-signature-3 absolute top-3 bottom-3 left-[0.6875rem] w-0.5 bg-linear-to-b"
              />
              {content.highlights.map((item, index) => (
                <li
                  key={item}
                  className="rise text-ink relative grid grid-cols-[1.5rem_minmax(0,1fr)] gap-x-4"
                  style={{ '--i': index + 1 } as CSSProperties}
                >
                  <span
                    aria-hidden="true"
                    className="bg-hero-deep ring-line-strong text-action-ink relative grid size-6 place-items-center rounded-full ring-1"
                  >
                    <IconCheck className="size-3.5" />
                  </span>
                  <span className="pt-0.5">{frenchSpacing(item)}</span>
                </li>
              ))}
            </ul>
            <SignatureRule className="mt-8" />
          </div>
        </div>
      </div>
    </HeroBand>
  );
}
