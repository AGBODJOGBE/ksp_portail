import { CaseEdit, recoveryPaths, spaceTexts } from '@/features/recovery';
import { OrganizationContextGate } from '@/features/identity';

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ organisation?: string | string[] }>;
};

/** Modification d'un brouillon, ou complément demandé par KSP. */
export default async function EditCasePage({ params, searchParams }: Props) {
  const [{ id }, { organisation }] = await Promise.all([params, searchParams]);
  return (
    <OrganizationContextGate
      organisation={organisation}
      back={{ href: recoveryPaths.cases, label: spaceTexts.listTitle }}
    >
      <CaseEdit id={id} />
    </OrganizationContextGate>
  );
}
