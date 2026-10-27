import { RequestDetail } from '@/features/cleaning';

/** Détail d'une demande de devis (adresse attendue par les notifications du Nettoyage). */
export default async function CleaningRequestPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <RequestDetail id={id} />;
}
