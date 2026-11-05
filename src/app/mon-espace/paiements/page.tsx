import { Heading } from '@/components/ui/heading';
import { BillingHistory, historyTexts } from '@/features/billing';
import { ContextSwitcher } from '@/features/identity';
import { paymentTexts } from '@/features/payment';
import { frenchSpacing } from '@/lib/typography';

/** « Factures et paiements » : historique unifié du compte actif, le plus récent d'abord. */
export default function PaymentsPage() {
  return (
    <div className="grid gap-10">
      <div>
        <Heading as="h1" size="h1">
          {historyTexts.pageTitle}
        </Heading>
        <p className="text-ink-muted mt-3">{historyTexts.pageLead}</p>
        <p className="text-small text-ink-muted mt-2">{frenchSpacing(paymentTexts.scope)}</p>
        <ContextSwitcher className="mt-5" />
      </div>
      <BillingHistory />
    </div>
  );
}
