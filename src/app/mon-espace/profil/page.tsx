import Link from 'next/link';
import { ButtonLink } from '@/components/ui/button';
import { Heading } from '@/components/ui/heading';
import { IconArrowLeft, IconArrowRight } from '@/components/ui/icons';
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
      <p className="text-small text-ink-muted border-line border-t pt-6">
        {t.settings.linkText}{' '}
        <Link
          href={identityPaths.settings}
          className="text-ink inline-flex min-h-11 items-center gap-1 font-semibold underline underline-offset-4"
        >
          {t.settings.link}
          <IconArrowRight className="size-4" />
        </Link>
      </p>
    </div>
  );
}
