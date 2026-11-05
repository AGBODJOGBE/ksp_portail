import { RequestGroupDetail } from '@/features/cleaning';

/** Suivi d'une demande groupée (adresse citée par les messages regroupés du Nettoyage, ADR-035). */
export default async function CleaningRequestGroupPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <RequestGroupDetail id={id} />;
}
