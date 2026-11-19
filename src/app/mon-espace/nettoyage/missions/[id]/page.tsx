import { MissionDetail, cleaningPaths, cleaningTexts } from '@/features/cleaning';
import { OrganizationContextGate } from '@/features/identity';

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ organisation?: string | string[] }>;
};

/**
 * Détail d'une mission de nettoyage (adresse attendue par les notifications du Nettoyage). `?organisation=` : dossier d'un compte entreprise ouvert depuis un message (ADR-049 §3), affiché
 * après le passage dans ce contexte.
 */
export default async function CleaningMissionPage({ params, searchParams }: Props) {
  const [{ id }, { organisation }] = await Promise.all([params, searchParams]);
  return (
    <OrganizationContextGate
      organisation={organisation}
      back={{ href: cleaningPaths.space, label: cleaningTexts.common.back }}
    >
      <MissionDetail id={id} />
    </OrganizationContextGate>
  );
}
