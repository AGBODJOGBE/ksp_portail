import { SessionDetail, cleaningPaths, cleaningTexts } from '@/features/cleaning';
import { OrganizationContextGate } from '@/features/identity';

type Props = {
  params: Promise<{ id: string; sessionId: string }>;
  searchParams: Promise<{ organisation?: string | string[] }>;
};

/** Séance d'un programme (adresse des notifications) ; `?organisation=` pour un compte entreprise. */
export default async function CleaningSessionPage({ params, searchParams }: Props) {
  const [{ id, sessionId }, { organisation }] = await Promise.all([params, searchParams]);
  return (
    <OrganizationContextGate
      organisation={organisation}
      back={{ href: cleaningPaths.program(id), label: cleaningTexts.space.programsBack }}
    >
      <SessionDetail programId={id} id={sessionId} />
    </OrganizationContextGate>
  );
}
