'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { FormMessage } from '@/components/ui/field';
import { formatXof } from '@/lib/format';
import { createPayment, type PaymentSubjectInput } from '@/features/payment/api';
import { describePaymentError } from '@/features/payment/errors';
import { safeCheckoutUrl } from '@/features/payment/polling';
import { paymentPaths, paymentTexts as t } from '@/features/payment/texts';

/** Clé d'idempotence (`Idempotency-Key`, 8 à 100 caractères `[A-Za-z0-9_-]`). */
function newKey(): string {
  return crypto.randomUUID();
}

/** Redirection vers la page du prestataire (hors du portail). Remplaçable dans les tests. */
export const redirect = { to: (url: string) => window.location.assign(url) };

export interface PayButtonProps {
  subject: PaymentSubjectInput;
  /** Libellé du bouton (« Payer l'acompte par Mobile Money »…). */
  label?: string;
  /**
   * Montant lu tel quel sur la mission ou la facture (le front ne calcule rien) ; null quand la fiche ne
   * le donne pas directement : la page du prestataire l'affiche.
   */
  amount: { amount: number; currency: 'XOF' } | null;
  /** Rien à payer ou objet annulé : la fiche se relit pour montrer son état réel. */
  onStale?: () => void;
}

/**
 * « Payer par Mobile Money » : crée le paiement (sans montant : payment le lit dans cleaning ou billing)
 * puis envoie le client sur la page du prestataire. La clé d'idempotence est tirée à l'affichage et
 * gardée pendant les renvois (double clic, coupure, prestataire injoignable) : la gateway rend le même
 * paiement. Un paiement déjà terminé avec cette clé mène à sa page de retour.
 */
export function PayButton({ subject, label = t.pay, amount, onStale }: PayButtonProps) {
  const router = useRouter();
  const key = useRef<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Clé tirée à l'ouverture de la fiche, avant tout envoi.
  useEffect(() => {
    key.current ??= newKey();
  }, []);

  async function pay() {
    if (busy) return;
    key.current ??= newKey();
    setBusy(true);
    setError(null);
    try {
      const payment = await createPayment(subject, key.current);
      if (payment.status !== 'pending') {
        key.current = null;
        router.push(paymentPaths.payment(payment.id));
        return;
      }
      const checkout = safeCheckoutUrl(payment.checkoutUrl);
      if (!checkout) {
        // Page pas encore obtenue : la même clé reprend sa création (ADR-031).
        setError(t.noCheckout);
        setBusy(false);
        return;
      }
      // Paiement créé : un retour arrière sur cette fiche repart d'une clé neuve.
      key.current = null;
      redirect.to(checkout);
    } catch (caught) {
      const view = describePaymentError(caught);
      if (view.kind === 'newKey' || view.kind === 'stale') key.current = null;
      setError(view.message);
      setBusy(false);
      if (view.kind === 'stale') onStale?.();
    }
  }

  return (
    <div className="grid justify-items-start gap-3">
      <p className="text-ink">
        {amount ? (
          <>
            {t.amountToPay} : <span className="font-semibold tabular-nums">{formatXof(amount)}</span>
          </>
        ) : (
          <span className="text-small text-ink-muted">{t.amountByKsp}</span>
        )}
      </p>
      <Button variant="action" onClick={pay} disabled={busy} aria-busy={busy || undefined}>
        {busy ? t.paying : label}
      </Button>
      <p className="text-small text-ink-muted max-w-reading">{t.payHint}</p>
      <FormMessage>{error}</FormMessage>
    </div>
  );
}
