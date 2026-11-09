import Link from 'next/link';
import { SignatureArrow } from '@/components/ui/brand/signature';
import { Badge } from '@/components/ui/badge';
import { Eyebrow } from '@/components/ui/eyebrow';
import { HeroBand } from '@/components/ui/hero-band';
import { IconCheck } from '@/components/ui/icons';
import { PageActions } from '@/components/sections/page-actions';
import type { MetierHeroContent } from '@/components/sections/types';
import { getMetier } from '@/config/metiers';
import { getDictionary } from '@/i18n';
import { cn } from '@/lib/cn';
import { frenchSpacing } from '@/lib/typography';
import { cleaningTexts, serviceJourney, zonesLine } from '@/features/cleaning/texts';

/** Identifiant du titre principal de la page (relié à la section par `aria-labelledby`). */
const TITLE_ID = 'nettoyage-titre';

/**
 * Premier écran du Nettoyage, pensé comme un e-service (direction « Signature ») : bande bleu nuit, la
 * démarche en ligne se lit d'un coup d'œil dans un panneau translucide (quatre étapes reliées par le fil
 * de la signature), l'action principale est visible tout de suite, les communes desservies viennent de
 * la gateway. Rendu par le serveur ; le titre n'est pas animé (premier affichage). Le bas de la bande
 * est réservé à l'entrée de la demande, qui la chevauche.
 */
export function CleaningServiceHero({
  content,
  zones,
}: {
  content: MetierHeroContent;
  /** Communes desservies mises en phrase (`zonesSentence`), `null` si la gateway n'a pas répondu. */
  zones: string | null;
}) {
  const t = getDictionary();
  const h = cleaningTexts.hero;
  const metier = getMetier(content.metierId);
  return (
    <HeroBand labelledBy={TITLE_ID} overlap containerClassName="pt-4 sm:pt-6 lg:pt-8">
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
            <Badge tone="action" dot>
              {h.online}
            </Badge>
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
            <Eyebrow>{h.journeyEyebrow}</Eyebrow>
            <p className="font-display text-h3 text-ink mt-4 font-semibold">{h.journeyTitle}</p>
            <ol className="relative mt-6 grid gap-6">
              {/* Fil de la signature qui relie les étapes : bleu nuit, vert, or (éclaircis sur bleu nuit). */}
              <span
                aria-hidden="true"
                className="grow-y from-signature-1 via-signature-2 to-signature-3 absolute top-5 bottom-5 left-[1.0625rem] w-0.5 bg-linear-to-b"
              />
              {serviceJourney.map((step, index) => (
                <li key={step.label} className="relative grid grid-cols-[2.25rem_minmax(0,1fr)] gap-x-4">
                  <span
                    aria-hidden="true"
                    className={cn(
                      'relative grid size-9 place-items-center rounded-full text-sm font-semibold tabular-nums',
                      index === 0
                        ? 'bg-action text-on-action'
                        : 'bg-hero-deep text-ink ring-line-strong ring-1',
                    )}
                  >
                    {index + 1}
                  </span>
                  <div className="pt-1.5">
                    <p className="text-ink flex items-center gap-2 font-semibold">
                      {step.label}
                      {index === 0 ? <SignatureArrow className="h-2.5 w-2" /> : null}
                    </p>
                    <p className="text-small text-ink-muted mt-1">
                      {frenchSpacing(h.journeyTexts[index] ?? '')}
                    </p>
                  </div>
                </li>
              ))}
            </ol>
            {zones ? (
              <p className="text-small text-ink-muted border-line mt-6 border-t pt-4">
                {frenchSpacing(zonesLine(zones))}
              </p>
            ) : null}
          </div>
        </div>
      </div>
    </HeroBand>
  );
}
