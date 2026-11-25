import { BandHeader, BandTitle } from '@/components/ui/band-header';
import { PlaceList, cleaningPaths, cleaningTexts, placeTexts as t } from '@/features/cleaning';

/** « Mes lieux » du contexte actif. */
export default function PlacesPage() {
  return (
    <div className="grid gap-10">
      <BandHeader>
        <BandTitle
          back={{ href: cleaningPaths.space, label: cleaningTexts.space.back }}
          eyebrow={cleaningTexts.space.eyebrow}
          title={t.title}
          lead={t.lead}
        />
      </BandHeader>
      <PlaceList />
    </div>
  );
}
