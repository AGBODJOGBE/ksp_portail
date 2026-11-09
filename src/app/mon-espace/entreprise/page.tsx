import { BandHeader, BandTitle } from '@/components/ui/band-header';
import { accountTexts, identityPaths, OrganizationSpace } from '@/features/identity';
import { frenchSpacing } from '@/lib/typography';

const t = accountTexts;

/** Comptes entreprise : liste avec leur état, demande d'un nouveau compte (ADR-027). */
export default function OrganizationsPage() {
  return (
    <div className="grid gap-8">
      <BandHeader>
        <BandTitle
          back={{ href: identityPaths.account, label: t.common.backToAccount }}
          title={t.organizations.title}
          lead={frenchSpacing(t.organizations.lead)}
        />
      </BandHeader>
      <OrganizationSpace />
    </div>
  );
}
