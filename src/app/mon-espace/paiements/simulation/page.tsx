import { notFound } from 'next/navigation';
import { FormMessage } from '@/components/ui/field';
import { PaymentSimulation, paymentTexts } from '@/features/payment';

/**
 * Page de paiement simulée (`PAYMENT_SIMULATION_CHECKOUT_URL?paymentId=…`), **développement seulement** :
 * 404 dans un build de production (la gateway refuse aussi la simulation en production).
 */
export default async function PaymentSimulationPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  if (process.env.NODE_ENV === 'production') notFound();
  const { paymentId } = await searchParams;
  if (typeof paymentId !== 'string' || !paymentId) {
    return <FormMessage>{paymentTexts.missingPaymentId}</FormMessage>;
  }
  return <PaymentSimulation id={paymentId} />;
}
