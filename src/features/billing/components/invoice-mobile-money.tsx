'use client';

import { useRef, useState } from 'react';
import { BackendPending } from '@/components/ui/backend-pending';
import { Button } from '@/components/ui/button';
import { FormMessage } from '@/components/ui/field';
import { Heading } from '@/components/ui/heading';
import { isBackendPending } from '@/lib/api';
import { formatXof } from '@/lib/format';
import { useReadOnly } from '@/features/identity';
import { safeCheckoutUrl } from '@/features/payment';
import { payInvoiceByMobileMoney } from '@/features/billing/api';
import { type InvoicePayErrorView, describeInvoicePayError } from '@/features/billing/errors';
import type { Invoice } from '@/features/billing/schemas';
import { billingTexts as t } from '@/features/billing/texts';

/** Redirection vers la page du prestataire (hors du portail). Remplaçable dans les tests. */
export const redirect = { to: (url: string) => window.location.assign(url) };

/**
 * Route pas encore servie, vue une fois dans l'onglet : les autres factures affichent directement
 * « Bientôt disponible » sans faire essayer le client.
 */
let routePending = false;

/** Pour les tests : oublie la route vue « pas encore servie ». */
export function resetMobileMoneyPending() {
  routePending = false;
}

const ID = 'facture-mobile-money';

/**
 * « Payer par Mobile Money » (R-PE-04) : la gateway crée le paiement du reste dû (jamais de montant
 * envoyé), puis le client valide sur la page du prestataire (http(s) seulement). La clé d'idempotence est
 * tirée au premier clic et gardée pendant les renvois (prestataire injoignable, page pas encore prête) ;
 * renouvelée après une redirection ou une clé refusée. Retour du prestataire : la page de retour des
 * paiements suit le paiement et mène à la facture, relue à l'ouverture.
 *
 * Route du contrat pas encore servie (`NOT_YET_EXPOSED`) : on ne peut le savoir qu'en l'appelant (une
 * création de paiement ne se sonde pas) ; au premier refus « pas encore servie », la section devient
 * « Bientôt disponible », et le reste pour les autres factures de l'onglet.
 */
export function InvoiceMobileMoney({
  invoice,
  onStale,
}: {
  invoice: Pick<Invoice, 'id' | 'balance'>;
  /** Facture réglée, annulée ou introuvable entre-temps : la fiche est relue. */
  onStale: () => void;
}) {
  const readOnly = useReadOnly();
  const key = useRef<string | null>(null);
  const [pending, setPending] = useState(routePending);
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<InvoicePayErrorView | null>(null);
  const [checkout, setCheckout] = useState<string | null>(null);

  if (pending) {
    return (
      <BackendPending
        id={ID}
        title={t.mobileMoneyTitle}
        needs={[
          {
            method: 'POST',
            path: '/api/v1/billing/invoices/{id}/pay-mobile-money',
            purpose: 'Créer le paiement Mobile Money du reste dû d’une facture (page du prestataire).',
          },
        ]}
      >
        {t.mobileMoneyPendingText}
      </BackendPending>
    );
  }

  async function pay() {
    if (busy) return;
    key.current ??= crypto.randomUUID();
    setBusy(true);
    setProblem(null);
    try {
      const payment = await payInvoiceByMobileMoney(invoice.id, key.current);
      const url = safeCheckoutUrl(payment.checkoutUrl);
      if (!url) {
        // Page pas encore obtenue : la même clé reprend sa création.
        setProblem({ message: t.mobileMoneyNoCheckout, kind: 'retry' });
        setBusy(false);
        return;
      }
      key.current = null;
      setCheckout(url);
      redirect.to(url);
    } catch (caught) {
      setBusy(false);
      if (isBackendPending(caught)) {
        routePending = true;
        setPending(true);
        return;
      }
      const view = describeInvoicePayError(caught);
      if (view.kind === 'newKey' || view.kind === 'stale') key.current = null;
      setProblem(view);
      if (view.kind === 'stale') onStale();
    }
  }

  const forbidden = readOnly || problem?.kind === 'forbidden';
  return (
    <section
      aria-labelledby={`${ID}-titre`}
      className="signature-edge rounded-card border-line bg-surface shadow-card grid content-start gap-4 border p-5 sm:p-6"
    >
      <Heading as="h2" size="h3" id={`${ID}-titre`}>
        {t.mobileMoneyTitle}
      </Heading>
      {forbidden ? (
        <FormMessage tone="info">{t.mobileMoneyForbidden}</FormMessage>
      ) : (
        <>
          <p className="text-small text-ink-muted">{t.mobileMoneyLead}</p>
          <Button
            variant="action"
            className="justify-self-start"
            onClick={() => void pay()}
            disabled={busy}
            aria-busy={busy || undefined}
          >
            {busy
              ? t.mobileMoneyOpening
              : invoice.balance.amount > 0
                ? t.mobileMoneyPay(formatXof(invoice.balance))
                : t.mobileMoneyPayUnknown}
          </Button>
          {checkout ? (
            <p className="text-small">
              <a href={checkout} className="text-brand-ink font-semibold underline underline-offset-4">
                {t.mobileMoneyContinue}
              </a>
            </p>
          ) : null}
          <FormMessage>{problem?.message}</FormMessage>
        </>
      )}
    </section>
  );
}
