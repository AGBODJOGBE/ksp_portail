import { CaseDetail, recoveryPaths, spaceTexts } from '@/features/recovery';
import { OrganizationContextGate } from '@/features/identity';

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ organisation?: string | string[] }>;
};

/**
 * Fiche d'un dossier (adresse des notifications). `?organisation=` : dossier d'un compte entreprise, affiché
 * après le passage dans ce contexte.
 */
export default async function CasePage({ params, searchParams }: Props) {
  const [{ id }, { organisation }] = await Promise.all([params, searchParams]);
  return (
    <OrganizationContextGate
      organisation={organisation}
      back={{ href: recoveryPaths.cases, label: spaceTexts.listTitle }}
    >
      <CaseDetail id={id} />
    </OrganizationContextGate>
  );
}
