import { PaymentReturn } from '@/features/payment';

/**
 * Retour de la page du prestataire (`PAYMENT_RETURN_URL/<id>`) : le statut affiché est celui que payment
 * a confirmé ; les paramètres ajoutés par le prestataire à l'adresse sont ignorés (ADR-031).
 */
export default async function PaymentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <PaymentReturn id={id} />;
}
