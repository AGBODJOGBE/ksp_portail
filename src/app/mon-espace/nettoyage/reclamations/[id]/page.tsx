import { ClaimDetail, cleaningPaths, cleaningTexts } from '@/features/cleaning';
import { OrganizationContextGate } from '@/features/identity';

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ organisation?: string | string[] }>;
};

/** Réclamation sur une séance (adresse des notifications) ; `?organisation=` pour un compte entreprise. */
export default async function CleaningClaimPage({ params, searchParams }: Props) {
  const [{ id }, { organisation }] = await Promise.all([params, searchParams]);
  return (
    <OrganizationContextGate
      organisation={organisation}
      back={{ href: cleaningPaths.claims, label: cleaningTexts.space.claimsBack }}
    >
      <ClaimDetail id={id} />
    </OrganizationContextGate>
  );
}
