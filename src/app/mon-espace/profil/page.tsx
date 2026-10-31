import { ButtonLink } from '@/components/ui/button';
import { Heading } from '@/components/ui/heading';
import { IconArrowLeft } from '@/components/ui/icons';
import { accountTexts, identityPaths, ProfileSpace } from '@/features/identity';

const t = accountTexts;

/** Profil du compte : nom, numéro de connexion, e-mail et sa vérification (ADR-026). */
export default function ProfilePage() {
  return (
    <div className="grid gap-8">
      <div className="grid gap-3">
        <ButtonLink href={identityPaths.account} variant="ghost" className="-ml-3 justify-self-start">
          <IconArrowLeft />
          {t.common.backToAccount}
        </ButtonLink>
        <Heading as="h1" size="h1">
          {t.profile.title}
        </Heading>
        <p className="text-ink-muted">{t.profile.lead}</p>
      </div>
      <ProfileSpace />
    </div>
  );
}
