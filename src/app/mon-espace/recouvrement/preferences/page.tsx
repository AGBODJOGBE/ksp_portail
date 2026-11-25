import { BandHeader, BandTitle } from '@/components/ui/band-header';
import {
  RecoveryPreferences,
  preferenceTexts as t,
  recoveryPaths,
  recoveryTexts,
  spaceTexts,
} from '@/features/recovery';
import { ContextSwitcher } from '@/features/identity';

/** Préférences du créancier : barèmes d'échéancier par défaut des nouveaux dossiers. */
export default function PreferencesPage() {
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
      <RecoveryPreferences />
    </div>
  );
}
