import Link from 'next/link';
import type { SectionIntro } from '@/components/sections/types';
import { ButtonArrow, ButtonLink } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { IconArrowRight } from '@/components/ui/icons';
import { Section } from '@/components/ui/section';
import { SectionHeader } from '@/components/ui/section-header';
import { frenchSpacing } from '@/lib/typography';
import { visiblePlaces } from '@/features/cleaning/journey';
import { cleaningPaths } from '@/features/cleaning/paths';
import type { PlaceCatalog } from '@/features/cleaning/schemas';
import { PlaceIcon } from './place-icon';

/**
 * Entrée du parcours sur la page Nettoyage, rendue par le serveur (aucun JavaScript) : les types de
 * lieu du catalogue mènent chacun à la demande de devis, lieu déjà choisi. Sans catalogue (gateway
 * injoignable pendant la construction de la page), un seul bouton y mène.
 */
export function JourneyEntrySection({
  id,
  intro,
  start,
  fallback,
  catalog,
}: {
  id: string;
  intro: SectionIntro;
  start: string;
  fallback: string;
  catalog: PlaceCatalog | null;
}) {
  const titleId = `${id}-titre`;
  const places = catalog ? visiblePlaces(catalog) : [];
  return (
    <Section id={id} labelledBy={titleId} tone="muted">
      <SectionHeader id={titleId} eyebrow={intro.eyebrow} title={intro.title} lead={intro.lead} />
      {places.length ? (
        <ul className="reveal mt-10 grid gap-4 sm:grid-cols-2 lg:mt-12 lg:grid-cols-3">
          {places.map((place) => (
            <Card key={place.code} as="li" interactive className="flex gap-4 p-5">
              <span
                aria-hidden="true"
                className="bg-brand-soft text-brand-ink grid size-12 shrink-0 place-items-center rounded-full"
              >
                <PlaceIcon icon={place.icon} className="size-6" />
              </span>
              <span className="grid min-w-0 gap-1">
                <Link
                  href={cleaningPaths.journeyFor(place.code)}
                  className="stretched-link font-display text-ink text-lg font-semibold focus-visible:outline-none"
                >
                  {place.label}
                </Link>
                {place.description ? (
                  <span className="text-small text-ink-muted">{frenchSpacing(place.description)}</span>
                ) : null}
              </span>
              <IconArrowRight className="text-action-ink ml-auto self-center" />
            </Card>
          ))}
        </ul>
      ) : (
        <p className="text-ink-muted max-w-reading mt-8">{frenchSpacing(fallback)}</p>
      )}
      <ButtonLink href={cleaningPaths.journey} variant="action" size="lg" className="mt-8">
        {start}
        <ButtonArrow>
          <IconArrowRight />
        </ButtonArrow>
      </ButtonLink>
    </Section>
  );
}
