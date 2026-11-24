import { BandHeader, BandTitle } from '@/components/ui/band-header';
import { NewPlace, cleaningPaths, cleaningTexts, placeTexts as t } from '@/features/cleaning';

/** Ajout d'un lieu : type, carte, repère. */
export default function NewPlacePage() {
  return (
    <div className="grid gap-10">
      <BandHeader>
        <BandTitle
          back={{ href: cleaningPaths.places, label: t.back }}
          eyebrow={cleaningTexts.space.eyebrow}
          title={t.newTitle}
          lead={t.newLead}
        />
      </BandHeader>
      <NewPlace />
    </div>
  );
}
