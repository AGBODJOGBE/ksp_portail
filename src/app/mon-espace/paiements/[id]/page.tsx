import { PaymentReturn } from '@/features/payment';
import { TopUpResult } from '@/features/wallet';

/**
 * Retour de la page du prestataire (`PAYMENT_RETURN_URL/<id>`) : le statut affiché est celui que payment
 * a confirmé ; les paramètres ajoutés par le prestataire à l'adresse sont ignorés (ADR-031). Une recharge
 * du portefeuille réussie (ADR-046) montre en plus le solde relu et le retour au paiement interrompu.
 */
export default async function PaymentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <PaymentReturn id={id} topUpResult={<TopUpResult />} />;
}
