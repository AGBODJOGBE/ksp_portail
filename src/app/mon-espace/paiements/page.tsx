import { navigation } from '@/config/navigation';
import { BandHeader, BandTitle } from '@/components/ui/band-header';
import { BillingHistory, historyTexts } from '@/features/billing';
import { ContextSwitcher } from '@/features/identity';
import { paymentTexts } from '@/features/payment';
import { frenchSpacing } from '@/lib/typography';

/** « Factures et paiements » : historique unifié du compte actif, le plus récent d'abord. */
export default function PaymentsPage() {
  return (
    <div className="grid gap-10">
      <BandHeader>
        <BandTitle
          back={{ href: navigation.account.href, label: navigation.account.label }}
          title={historyTexts.pageTitle}
          lead={historyTexts.pageLead}
        >
          <p className="text-small text-ink-muted">{frenchSpacing(paymentTexts.scope)}</p>
          <ContextSwitcher />
        </BandTitle>
      </BandHeader>
      <BillingHistory />
    </div>
  );
}
