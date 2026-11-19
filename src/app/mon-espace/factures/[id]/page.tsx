import { billingPaths, billingTexts, InvoiceDetail } from '@/features/billing';
import { OrganizationContextGate } from '@/features/identity';

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ organisation?: string | string[] }>;
};

/**
 * Détail d'une facture. `?organisation=` : facture d'un compte entreprise ouverte depuis un message
 * (ADR-050 §8), affichée après le passage dans ce contexte.
 */
export default async function InvoicePage({ params, searchParams }: Props) {
  const [{ id }, { organisation }] = await Promise.all([params, searchParams]);
  return (
    <OrganizationContextGate
      organisation={organisation}
      back={{ href: billingPaths.list, label: billingTexts.back }}
    >
      <InvoiceDetail id={id} />
    </OrganizationContextGate>
  );
}
