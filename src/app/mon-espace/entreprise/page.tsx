import { ButtonLink } from '@/components/ui/button';
import { Heading } from '@/components/ui/heading';
import { IconArrowLeft } from '@/components/ui/icons';
import { accountTexts, identityPaths, OrganizationSpace } from '@/features/identity';
import { frenchSpacing } from '@/lib/typography';

const t = accountTexts;

/** Comptes entreprise : liste avec leur état, demande d'un nouveau compte (ADR-027). */
export default function OrganizationsPage() {
  return (
    <div className="grid gap-8">
      <div className="grid gap-3">
        <ButtonLink href={identityPaths.account} variant="ghost" className="-ml-3 justify-self-start">
          <IconArrowLeft />
          {t.common.backToAccount}
        </ButtonLink>
        <Heading as="h1" size="h1">
          {t.organizations.title}
        </Heading>
        <p className="text-ink-muted">{frenchSpacing(t.organizations.lead)}</p>
      </div>
      <OrganizationSpace />
    </div>
  );
}
