import type { Metadata } from 'next';
import { LinkSheetFrame } from '@/components/ui/link-sheet';
import { PaymentLink } from '@/features/payment';
import { getDictionary } from '@/i18n';

/*
 * Lien de paiement envoyé par SMS ou WhatsApp à un payeur sans compte (ADR-040, `PAYMENT_LINK_BASE_URL`).
 * Page publique : aucune garde de session, jamais de redirection vers la connexion. Rendue à chaque
 * requête (le jeton n'est connu qu'à l'appel), jamais mise en cache ; le résumé du lien est lu par le
 * navigateur. `no-referrer` : le jeton ne part pas vers la page du prestataire ni ailleurs (aussi posé en
 * en-tête, `next.config.ts`).
 */
export const metadata: Metadata = {
  title: getDictionary().links.paymentTitle,
  robots: { index: false, follow: false },
  referrer: 'no-referrer',
};

export default async function PaymentLinkPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  return (
    <LinkSheetFrame>
      <PaymentLink token={token} />
    </LinkSheetFrame>
  );
}
