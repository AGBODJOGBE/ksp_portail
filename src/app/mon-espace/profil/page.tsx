import { BandHeader, BandTitle } from '@/components/ui/band-header';
import Link from 'next/link';
import { IconArrowRight } from '@/components/ui/icons';
import { accountTexts, deletionTexts, identityPaths, ProfileSpace } from '@/features/identity';

const t = accountTexts;

/** Profil du compte : nom, numéro de connexion, e-mail et sa vérification (ADR-026). */
export default function ProfilePage() {
  return (
    <div className="grid gap-8">
      <BandHeader>
        <BandTitle
          back={{ href: identityPaths.account, label: t.common.backToAccount }}
          title={t.profile.title}
          lead={t.profile.lead}
        />
      </BandHeader>
      <ProfileSpace />
      <p className="text-small text-ink-muted border-line border-t pt-6">
        {deletionTexts.settings.linkText}{' '}
        <Link
          href={identityPaths.settings}
          className="text-ink inline-flex min-h-11 items-center gap-1 font-semibold underline underline-offset-4"
        >
          {deletionTexts.settings.link}
          <IconArrowRight className="size-4" />
        </Link>
      </p>
    </div>
  );
}
