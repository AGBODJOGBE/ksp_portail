import { Heading } from '@/components/ui/heading';
import { InvoiceList, billingTexts } from '@/features/billing';

/** Liste des factures du client (adresse attendue par les notifications de facturation). */
export default function InvoicesPage() {
  return (
    <div className="grid gap-10">
      <div>
        <Heading as="h1" size="h1">
          {billingTexts.title}
        </Heading>
        <p className="text-ink-muted mt-3">{billingTexts.lead}</p>
      </div>
      <InvoiceList />
    </div>
  );
}
