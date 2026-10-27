import { InvoiceDetail } from '@/features/billing';

/** Détail d'une facture. */
export default async function InvoicePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <InvoiceDetail id={id} />;
}
