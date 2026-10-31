import Link from 'next/link';
import { SignatureArrow, SignatureBackdrop } from '@/components/ui/brand/signature';
import { Badge } from '@/components/ui/badge';
import { Container } from '@/components/ui/container';
import { Eyebrow } from '@/components/ui/eyebrow';
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
 * Premier écran du Nettoyage, pensé comme un e-service : la démarche en ligne se lit d'un coup d'œil
 * (quatre étapes, qui agit), l'action principale est visible tout de suite, les communes desservies
 * viennent de la gateway. Rendu par le serveur, sans animation : premier écran.
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
    <section aria-labelledby={TITLE_ID} className="border-line relative isolate overflow-hidden border-b">
      <SignatureBackdrop className="absolute inset-0 -z-10 size-full [mask-image:linear-gradient(100deg,transparent_50%,black_100%)] opacity-[0.06]" />
      <Container className="grid gap-10 pt-6 pb-14 sm:pb-20 lg:grid-cols-12 lg:items-center lg:gap-12 lg:pt-8 lg:pb-24">
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

          <div className="mt-6 flex flex-wrap items-center gap-3 sm:mt-10">
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
          <div
            data-tone="inverse"
            className="rounded-panel shadow-raised relative isolate overflow-hidden p-6 sm:p-8"
          >
            <SignatureBackdrop className="absolute inset-0 -z-10 size-full opacity-[0.07]" />
            <Eyebrow>{h.journeyEyebrow}</Eyebrow>
            <p className="font-display text-h3 text-ink mt-4 font-semibold">{h.journeyTitle}</p>
            <ol className="mt-6 grid gap-0">
              {serviceJourney.map((step, index) => (
                <li
                  key={step.label}
                  className={cn(
                    'relative grid grid-cols-[2.25rem_minmax(0,1fr)] gap-x-4 pb-6 last:pb-0',
                    // Fil de la signature entre les étapes.
                    'before:bg-line-strong before:absolute before:top-10 before:bottom-1 before:left-[1.0625rem] before:w-0.5 last:before:hidden',
                  )}
                >
                  <span
                    aria-hidden="true"
                    className={cn(
                      'relative grid size-9 place-items-center rounded-full text-sm font-semibold tabular-nums',
                      index === 0
                        ? 'bg-action text-on-action'
                        : 'bg-surface text-ink ring-line-strong ring-1',
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
      </Container>
    </section>
  );
}
