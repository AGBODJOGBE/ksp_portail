import { OrganizationDetail } from '@/features/identity';

/** Fiche d'un compte entreprise : état, informations, e-mail de facturation (ADR-027, 028). */
export default async function OrganizationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <OrganizationDetail id={id} />;
}
