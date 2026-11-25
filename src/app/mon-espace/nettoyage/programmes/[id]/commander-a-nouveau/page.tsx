import { ReorderProgram, cleaningPaths, cleaningTexts } from '@/features/cleaning';
import { OrganizationContextGate } from '@/features/identity';

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ organisation?: string | string[] }>;
};

/** Commander à nouveau un programme ponctuel terminé (adresse des notifications, R-PG-08). */
export default async function CleaningReorderPage({ params, searchParams }: Props) {
  const [{ id }, { organisation }] = await Promise.all([params, searchParams]);
  return (
    <OrganizationContextGate
      organisation={organisation}
      back={{ href: cleaningPaths.programs, label: cleaningTexts.space.programsBack }}
    >
      <ReorderProgram id={id} />
    </OrganizationContextGate>
  );
}
