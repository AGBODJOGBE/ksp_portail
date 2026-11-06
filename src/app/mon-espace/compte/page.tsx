import { ButtonLink } from '@/components/ui/button';
import { Heading } from '@/components/ui/heading';
import { IconArrowLeft } from '@/components/ui/icons';
import { AccountDeletion, accountTexts, identityPaths } from '@/features/identity';

const t = accountTexts;

/**
 * « Mon compte » : suppression du compte (ADR-036). Adresse citée par les messages d'identity ; un compte
 * en cours de suppression y arrive après sa connexion (la garde affiche alors la date prévue).
 */
export default function AccountSettingsPage() {
  return (
    <div className="grid gap-8">
      <div className="grid gap-3">
        <ButtonLink href={identityPaths.account} variant="ghost" className="-ml-3 justify-self-start">
          <IconArrowLeft />
          {t.common.backToAccount}
        </ButtonLink>
        <Heading as="h1" size="h1">
          {t.settings.title}
        </Heading>
        <p className="text-ink-muted">{t.settings.lead}</p>
      </div>
      <AccountDeletion />
    </div>
  );
}
