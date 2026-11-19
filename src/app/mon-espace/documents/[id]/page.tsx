import { DocumentDetail } from '@/features/document';

/**
 * Document dont le compte est titulaire ou signataire (ADR-044), ouvert par le lien d'une notification
 * (`/mon-espace/documents/<id>`, `accountSigningLink` du service document).
 */
export default async function DocumentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <DocumentDetail id={id} />;
}
