'use client';

import { useRouter } from 'next/navigation';
import { useRef, useState } from 'react';
import { paymentPaths, safeCheckoutUrl } from '@/features/payment';
import { createTopUp } from '@/features/wallet/api';
import { type WalletErrorView, describeWalletError } from '@/features/wallet/errors';
import { walletTexts as t } from '@/features/wallet/texts';
import { rememberResume } from '@/features/wallet/top-up';

/** Redirection vers la page du prestataire (hors du portail). Remplaçable dans les tests. */
export const redirect = { to: (url: string) => window.location.assign(url) };

/**
 * Recharge par Mobile Money : crée la recharge puis envoie le client sur la page du prestataire. La clé
 * d'idempotence suit le montant : un renvoi du même montant (double clic, coupure, prestataire
 * injoignable) reprend la même clé et la gateway rend la même recharge ; un autre montant tire une clé
 * neuve (sinon `PAYMENT_IDEMPOTENCY_KEY_REUSED`). `resume` : écran où ramener le client une fois le solde
 * crédité (paiement interrompu faute de solde), null depuis le portefeuille.
 */
export function useTopUp() {
  const router = useRouter();
  const key = useRef<{ amount: number; key: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<WalletErrorView | null>(null);

  async function start(amount: number, resume: string | null) {
    if (busy) return;
    const current = key.current?.amount === amount ? key.current : { amount, key: crypto.randomUUID() };
    key.current = current;
    setBusy(true);
    setError(null);
    try {
      const topUp = await createTopUp({ amount, currency: 'XOF' }, current.key);
      rememberResume(resume);
      if (topUp.status !== 'pending') {
        // Recharge déjà terminée avec cette clé : sa page de retour donne l'issue.
        key.current = null;
        router.push(paymentPaths.payment(topUp.paymentId));
        return;
      }
      const checkout = safeCheckoutUrl(topUp.checkoutUrl);
      if (!checkout) {
        // Page pas encore obtenue : la même clé reprend sa création.
        setError({ message: t.noCheckout, kind: 'retry' });
        setBusy(false);
        return;
      }
      key.current = null;
      redirect.to(checkout);
    } catch (caught) {
      const view = describeWalletError(caught);
      if (view.kind === 'newKey') key.current = null;
      setError(view);
      setBusy(false);
    }
  }

  return { start, busy, error };
}
