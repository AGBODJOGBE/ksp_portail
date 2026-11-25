import { RequestDetail, cleaningPaths, listTexts } from '@/features/cleaning';
import { OrganizationContextGate } from '@/features/identity';

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ organisation?: string | string[] }>;
};

/**
 * Une demande de devis, avec son devis (adresse des notifications). `?organisation=` : demande d'un
 * compte entreprise, affichée après le passage dans ce contexte.
 */
export default async function RequestPage({ params, searchParams }: Props) {
  const [{ id }, { organisation }] = await Promise.all([params, searchParams]);
  return (
    <OrganizationContextGate
      organisation={organisation}
      back={{ href: cleaningPaths.requests, label: listTexts.title }}
    >
      <RequestDetail id={id} />
    </OrganizationContextGate>
  );
}
