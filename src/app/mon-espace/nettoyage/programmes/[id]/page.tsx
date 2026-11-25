import { ProgramDetail, cleaningPaths, cleaningTexts } from '@/features/cleaning';
import { OrganizationContextGate } from '@/features/identity';

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ organisation?: string | string[] }>;
};

/**
 * Programme de nettoyage (adresse des notifications). `?organisation=` : programme d'un compte
 * entreprise, affiché après le passage dans ce contexte.
 */
export default async function CleaningProgramPage({ params, searchParams }: Props) {
  const [{ id }, { organisation }] = await Promise.all([params, searchParams]);
  return (
    <OrganizationContextGate
      organisation={organisation}
      back={{ href: cleaningPaths.programs, label: cleaningTexts.space.programsBack }}
    >
      <ProgramDetail id={id} />
    </OrganizationContextGate>
  );
}
