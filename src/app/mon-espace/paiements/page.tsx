import { Heading } from '@/components/ui/heading';
import { ContextSwitcher } from '@/features/identity';
import { PaymentList, paymentTexts } from '@/features/payment';
import { frenchSpacing } from '@/lib/typography';

/** Paiements en ligne du compte actif, les plus récents d'abord. */
export default function PaymentsPage() {
  return (
    <div className="grid gap-10">
      <div>
        <Heading as="h1" size="h1">
          {paymentTexts.title}
        </Heading>
        <p className="text-ink-muted mt-3">{paymentTexts.lead}</p>
        <p className="text-small text-ink-muted mt-2">{frenchSpacing(paymentTexts.scope)}</p>
        <ContextSwitcher className="mt-5" />
      </div>
      <PaymentList />
    </div>
  );
}
