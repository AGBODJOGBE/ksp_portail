import { Suspense } from 'react';
import { Heading } from '@/components/ui/heading';
import { InvoiceList, billingTexts } from '@/features/billing';
import { ContextSwitcher } from '@/features/identity';
import { frenchSpacing } from '@/lib/typography';

/**
 * Liste des factures du client (adresse attendue par les notifications de facturation). Le filtre par
 * état est lu dans l'adresse sous Suspense : la page reste statique.
 */
export default function InvoicesPage() {
  return (
    <div className="grid gap-10">
      <div>
        <Heading as="h1" size="h1">
          {billingTexts.title}
        </Heading>
        <p className="text-ink-muted mt-3">{billingTexts.lead}</p>
        <p className="text-small text-ink-muted mt-2">{frenchSpacing(billingTexts.scope)}</p>
        <ContextSwitcher className="mt-5" />
      </div>
      <Suspense
        fallback={
          <p role="status" className="text-ink-muted">
            {billingTexts.loading}
          </p>
        }
      >
        <InvoiceList />
      </Suspense>
    </div>
  );
}
