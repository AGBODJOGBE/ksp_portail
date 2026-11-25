import { BillingPreferences } from '@/features/billing';
import { OrganizationDetail } from '@/features/identity';

/**
 * Fiche d'un compte entreprise : état, informations, membres, e-mail de facturation (ADR-027, 028), et
 * prélèvement automatique des factures (billing, R-PE-04).
 */
export default async function OrganizationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <OrganizationDetail id={id} billing={<BillingPreferences organizationId={id} />} />;
}
