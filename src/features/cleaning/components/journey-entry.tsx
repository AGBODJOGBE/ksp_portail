import type { SectionIntro } from '@/components/sections/types';
import { ButtonArrow, ButtonLink } from '@/components/ui/button';
import { IconArrowRight } from '@/components/ui/icons';
import { LinkCard } from '@/components/ui/link-card';
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
 * injoignable pendant la construction de la page), un seul bouton y mène. Feuille blanche qui chevauche
 * la bande héros (direction « Signature ») : la demande commence dès le premier écran.
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
    <Section id={id} labelledBy={titleId} className="pt-0">
      <div className="rounded-panel border-line bg-surface shadow-float relative -mt-16 border p-5 sm:-mt-20 sm:p-8 lg:p-10">
        <SectionHeader id={titleId} eyebrow={intro.eyebrow} title={intro.title} lead={intro.lead} />
        {places.length ? (
          <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:mt-10 lg:grid-cols-3">
            {places.map((place, index) => (
              <LinkCard
                key={place.code}
                index={index}
                href={cleaningPaths.journeyFor(place.code)}
                title={place.label}
                text={place.description ? frenchSpacing(place.description) : undefined}
                icon={<PlaceIcon icon={place.icon} className="size-6" />}
              />
            ))}
          </ul>
        ) : (
          <p className="text-ink-muted max-w-reading mt-8">{frenchSpacing(fallback)}</p>
        )}
        <ButtonLink href={cleaningPaths.journey} variant="action" size="lg" className="shadow-action mt-8">
          {start}
          <ButtonArrow>
            <IconArrowRight />
          </ButtonArrow>
        </ButtonLink>
      </div>
    </Section>
  );
}
