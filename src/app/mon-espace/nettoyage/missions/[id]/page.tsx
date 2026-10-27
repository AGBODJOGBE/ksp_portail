import { MissionDetail } from '@/features/cleaning';

/** Détail d'une mission de nettoyage (adresse attendue par les notifications du Nettoyage). */
export default async function CleaningMissionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <MissionDetail id={id} />;
}
