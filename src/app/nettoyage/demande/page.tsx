import { BandFrame, BandHeader, BandTitle } from '@/components/ui/band-header';
import { getMetier } from '@/config/metiers';
import { RequestWizard, cleaningPaths, wizardTexts as t } from '@/features/cleaning';
import { pageMetadata } from '@/lib/seo/metadata';

const metier = getMetier('nettoyage');

export const metadata = pageMetadata({
  title: `${t.title} — ${metier.label}`,
  description: t.lead,
  path: cleaningPaths.request,
});

/**
 * Demande de devis du Nettoyage : coque statique, assistant rendu dans le navigateur (brouillon de
 * l'onglet, connexion au milieu du parcours). `?lieu=<id>` : demande pour un lieu de « Mes lieux ».
 */
export default function CleaningRequestPage() {
  return (
    <BandFrame>
      <div className="grid gap-8">
        <BandHeader>
          <BandTitle
            back={{ href: cleaningPaths.home, label: metier.label }}
            eyebrow={t.eyebrow}
            title={t.title}
            lead={t.lead}
          />
        </BandHeader>
        <RequestWizard />
      </div>
    </BandFrame>
  );
}
