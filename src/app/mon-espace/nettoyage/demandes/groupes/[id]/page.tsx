import { RequestGroupDetail, cleaningPaths, cleaningTexts } from '@/features/cleaning';
import { OrganizationContextGate } from '@/features/identity';

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ organisation?: string | string[] }>;
};

/**
 * Suivi d'une demande groupée (adresse citée par les messages regroupés du Nettoyage, ADR-035). `?organisation=` : dossier d'un compte entreprise ouvert depuis un message (ADR-049 §3), affiché
 * après le passage dans ce contexte.
 */
export default async function CleaningRequestGroupPage({ params, searchParams }: Props) {
  const [{ id }, { organisation }] = await Promise.all([params, searchParams]);
  return (
    <OrganizationContextGate
      organisation={organisation}
      back={{ href: cleaningPaths.space, label: cleaningTexts.common.back }}
    >
      <RequestGroupDetail id={id} />
    </OrganizationContextGate>
  );
}
