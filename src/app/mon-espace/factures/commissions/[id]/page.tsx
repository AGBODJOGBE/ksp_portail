import { CommissionInvoiceDetail, commissionPaths, commissionTexts } from '@/features/billing';
import { OrganizationContextGate } from '@/features/identity';

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ organisation?: string | string[] }>;
};

/**
 * Facture de commission du Recouvrement (ADR-064). `?organisation=` : facture d'un compte entreprise ouverte
 * depuis un message, affichée après le passage dans ce contexte.
 */
export default async function CommissionInvoicePage({ params, searchParams }: Props) {
  const [{ id }, { organisation }] = await Promise.all([params, searchParams]);
  return (
    <OrganizationContextGate
      organisation={organisation}
      back={{ href: commissionPaths.list, label: commissionTexts.back }}
    >
      <CommissionInvoiceDetail id={id} />
    </OrganizationContextGate>
  );
}
