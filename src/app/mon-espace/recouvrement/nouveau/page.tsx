import { BandHeader, BandTitle } from '@/components/ui/band-header';
import { CaseWizard, recoveryPaths, recoveryTexts, spaceTexts, wizardTexts as t } from '@/features/recovery';
import { ContextSwitcher } from '@/features/identity';

/**
 * Assistant « Nouveau dossier » : rendu dans le navigateur (brouillon de l'onglet). Le dossier appartient
 * au compte actif, choisi dans le sélecteur.
 */
export default function NewCasePage() {
  return (
    <div className="grid gap-10">
      <BandHeader>
        <BandTitle
          back={{ href: recoveryPaths.space, label: spaceTexts.title }}
          eyebrow={recoveryTexts.title}
          title={t.title}
          lead={t.lead}
          aside={<ContextSwitcher />}
        />
      </BandHeader>
      <CaseWizard />
    </div>
  );
}
