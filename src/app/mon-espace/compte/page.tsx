import { BandHeader, BandTitle } from '@/components/ui/band-header';
import { AccountDeletion, accountTexts, deletionTexts, identityPaths } from '@/features/identity';

const t = accountTexts;

/**
 * « Mon compte » : suppression du compte (ADR-036). Adresse citée par les messages d'identity ; un compte
 * en cours de suppression y arrive après sa connexion (la garde affiche alors la date prévue).
 */
export default function AccountSettingsPage() {
  return (
    <div className="grid gap-8">
      <BandHeader>
        <BandTitle
          back={{ href: identityPaths.account, label: t.common.backToAccount }}
          title={deletionTexts.settings.title}
          lead={deletionTexts.settings.lead}
        />
      </BandHeader>
      <AccountDeletion />
    </div>
  );
}
