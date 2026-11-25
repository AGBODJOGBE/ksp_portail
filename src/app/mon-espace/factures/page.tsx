import { navigation } from '@/config/navigation';
import { BandHeader, BandTitle } from '@/components/ui/band-header';
import { Suspense } from 'react';
import { InvoiceList, billingTexts } from '@/features/billing';
import { ContextSwitcher, OrganizationContextFromSearch } from '@/features/identity';
import { frenchSpacing } from '@/lib/typography';

/**
 * Liste des factures du client (adresse attendue par les notifications de facturation). Le filtre par
 * état et l'organisation du lien (`?organisation=`) sont lus dans l'adresse sous Suspense : la page reste
 * statique.
 */
export default function InvoicesPage() {
  return (
    <div className="grid gap-10">
      <BandHeader>
        <BandTitle
          back={{ href: navigation.account.href, label: navigation.account.label }}
          title={billingTexts.title}
          lead={billingTexts.lead}
        >
          <p className="text-small text-ink-muted">{frenchSpacing(billingTexts.scope)}</p>
          <ContextSwitcher />
        </BandTitle>
      </BandHeader>
      <Suspense
        fallback={
          <p role="status" className="text-ink-muted">
            {billingTexts.loading}
          </p>
        }
      >
        <OrganizationContextFromSearch
          back={{ href: navigation.account.href, label: navigation.account.label }}
        >
          <InvoiceList />
        </OrganizationContextFromSearch>
      </Suspense>
    </div>
  );
}
