import { Suspense } from 'react';
import { SessionRedirect, cleaningPaths, cleaningTexts } from '@/features/cleaning';
import { OrganizationContextGate } from '@/features/identity';

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ organisation?: string | string[] }>;
};

/**
 * Séance ouverte sans son programme (retour d'un paiement, `subjectPath` du service payment) : la séance
 * est lue, puis la page est remplacée par l'adresse imbriquée du programme.
 */
export default async function CleaningSessionRedirectPage({ params, searchParams }: Props) {
  const [{ id }, { organisation }] = await Promise.all([params, searchParams]);
  return (
    <OrganizationContextGate
      organisation={organisation}
      back={{ href: cleaningPaths.programs, label: cleaningTexts.space.programsBack }}
    >
      <Suspense fallback={<p className="text-ink-muted">{cleaningTexts.space.loading}</p>}>
        <SessionRedirect id={id} />
      </Suspense>
    </OrganizationContextGate>
  );
}
