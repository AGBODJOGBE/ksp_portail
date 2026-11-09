'use client';

import { useEffect, useRef, useState } from 'react';
import { Button, ButtonLink } from '@/components/ui/button';
import { FormMessage } from '@/components/ui/field';
import { formatXof } from '@/lib/format';
import { useResource } from '@/lib/use-resource';
import { getWallet } from '@/features/wallet/api';
import { type WalletErrorView, describeWalletError } from '@/features/wallet/errors';
import { walletPaths } from '@/features/wallet/paths';
import type { Money } from '@/features/wallet/schemas';
import { walletTexts as t } from '@/features/wallet/texts';
import { topUpFor } from '@/features/wallet/top-up';
import { useReadOnly } from './use-read-only';
import { useTopUp } from './use-top-up';

export interface WalletPayProps<T> {
  /** Paiement de l'objet par la route de son service (mission, facture), avec la clé d'idempotence. */
  pay: (idempotencyKey: string) => Promise<T>;
  /** Montant lu tel quel sur la mission ou la facture ; null quand la fiche ne le donne pas. */
  amount: Money | null;
  label?: string;
  /** Écran où revenir payer après une recharge ; par défaut, l'écran courant. */
  returnTo?: string;
  /** Paiement enregistré : l'objet à jour et le message à annoncer (montant payé, solde restant). */
  onPaid: (result: T, notice: string) => void;
  /** Rien à payer, objet payé ou annulé entre-temps : la fiche se relit. */
  onStale?: () => void;
}

type Step = { name: 'idle' } | { name: 'confirm' } | { name: 'insufficient'; missing: number | null };

const PANEL = 'rounded-control border-line bg-surface-muted grid gap-4 border p-4';

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex flex-wrap items-baseline justify-between gap-x-4">
      <dt className="text-small text-ink-muted">{label}</dt>
      <dd
        className={
          strong ? 'text-ink text-lg font-semibold tabular-nums' : 'text-ink font-medium tabular-nums'
        }
      >
        {value}
      </dd>
    </div>
  );
}

/**
 * « Payer avec mon portefeuille » (ADR-046) : le montant n'est jamais envoyé, le service le calcule et le
 * portefeuille le débite en entier. Confirmation avec le montant et le solde après ; solde insuffisant
 * (connu d'avance ou `WALLET_INSUFFICIENT_FUNDS`) : « Recharger X », puis retour sur cet écran pour payer.
 * La clé d'idempotence est tirée à l'ouverture et gardée pendant les renvois (coupure, 409) : la gateway ne
 * débite qu'une fois ; elle est renouvelée après un paiement, un refus définitif ou un débit remboursé.
 */
export function WalletPay<T>({ pay, amount, label = t.pay, returnTo, onPaid, onStale }: WalletPayProps<T>) {
  const wallet = useResource(getWallet);
  const readOnly = useReadOnly();
  const topUp = useTopUp();
  const key = useRef<string | null>(null);
  const heading = useRef<HTMLParagraphElement>(null);
  const [step, setStep] = useState<Step>({ name: 'idle' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<WalletErrorView | null>(null);

  // Le titre de l'étape reçoit le focus : le lecteur d'écran annonce la confirmation ou le manque.
  useEffect(() => {
    if (step.name !== 'idle') heading.current?.focus();
  }, [step.name]);

  const data = wallet.state.status === 'ready' ? wallet.state.data : null;
  const balance = data ? (data.prepaid?.balance ?? { amount: 0, currency: 'XOF' as const }) : null;
  const limits = data?.topUpLimits ?? null;

  if (readOnly || error?.kind === 'forbidden') return <FormMessage tone="info">{t.readOnly}</FormMessage>;

  function open() {
    setError(null);
    key.current ??= crypto.randomUUID();
    if (amount && balance && balance.amount < amount.amount) {
      setStep({ name: 'insufficient', missing: amount.amount - balance.amount });
    } else {
      setStep({ name: 'confirm' });
    }
  }

  async function confirm() {
    if (busy) return;
    key.current ??= crypto.randomUUID();
    setBusy(true);
    setError(null);
    try {
      const result = await pay(key.current);
      key.current = null;
      // Solde relu après le débit : c'est celui de la gateway qui est annoncé, pas un calcul.
      const after = await getWallet().then(
        (value) => value.prepaid?.balance ?? null,
        () => null,
      );
      const paid = amount ? t.paid(formatXof(amount)) : t.paidUnknown;
      setBusy(false);
      setStep({ name: 'idle' });
      wallet.refresh();
      onPaid(result, after ? `${paid} ${t.balanceNow(formatXof(after))}` : paid);
    } catch (caught) {
      const view = describeWalletError(caught);
      setBusy(false);
      if (view.kind === 'insufficient') {
        key.current = null;
        setStep({ name: 'insufficient', missing: view.missing ?? null });
        wallet.refresh();
        return;
      }
      if (view.kind === 'newKey' || view.kind === 'stale') key.current = null;
      setError(view);
      if (view.kind === 'stale') {
        setStep({ name: 'idle' });
        onStale?.();
      }
    }
  }

  function cancel() {
    setStep({ name: 'idle' });
    setError(null);
  }

  if (step.name === 'insufficient') {
    const recharge = step.missing === null ? null : topUpFor(step.missing, limits);
    return (
      <div className={PANEL}>
        <p ref={heading} tabIndex={-1} className="text-ink font-semibold focus:outline-none">
          {step.missing === null ? t.insufficientUnknown : t.insufficient(formatXof(step.missing))}
        </p>
        {balance ? (
          <dl className="grid gap-1">
            <Row label={t.currentBalance} value={formatXof(balance)} />
          </dl>
        ) : null}
        <p className="text-small text-ink-muted">{t.insufficientHint}</p>
        {recharge !== null && step.missing !== null && recharge > step.missing ? (
          <p className="text-small text-ink-muted">{t.topUpMinimum(formatXof(recharge))}</p>
        ) : null}
        <div className="flex flex-wrap gap-3">
          {recharge === null ? (
            <ButtonLink href={walletPaths.home} variant="action">
              {t.topUpTitle}
            </ButtonLink>
          ) : (
            <Button
              variant="action"
              disabled={topUp.busy}
              aria-busy={topUp.busy || undefined}
              onClick={() =>
                topUp.start(recharge, returnTo ?? `${window.location.pathname}${window.location.search}`)
              }
            >
              {topUp.busy ? t.topUpOpening : t.topUp(formatXof(recharge))}
            </Button>
          )}
          <Button variant="ghost" onClick={cancel} disabled={topUp.busy}>
            {t.cancel}
          </Button>
        </div>
        <FormMessage>{topUp.error?.message}</FormMessage>
      </div>
    );
  }

  if (step.name === 'confirm') {
    const after = amount && balance ? { amount: balance.amount - amount.amount, currency: 'XOF' } : null;
    return (
      <div className={PANEL}>
        <p ref={heading} tabIndex={-1} className="text-ink font-semibold focus:outline-none">
          {t.confirmTitle}
        </p>
        <dl className="grid gap-1">
          {amount ? <Row label={t.amountToPay} value={formatXof(amount)} strong /> : null}
          {balance ? <Row label={t.currentBalance} value={formatXof(balance)} /> : null}
          {after ? <Row label={t.balanceAfterPay} value={formatXof(after.amount)} /> : null}
        </dl>
        {amount ? null : <p className="text-small text-ink-muted">{t.amountByKsp}</p>}
        <p className="text-small text-ink-muted">{t.confirmHint}</p>
        <div className="flex flex-wrap gap-3">
          <Button variant="action" onClick={confirm} disabled={busy} aria-busy={busy || undefined}>
            {busy ? t.paying : amount ? t.confirm(formatXof(amount)) : t.confirmUnknown}
          </Button>
          <Button variant="ghost" onClick={cancel} disabled={busy}>
            {t.cancel}
          </Button>
        </div>
        <FormMessage>{error?.message}</FormMessage>
      </div>
    );
  }

  return (
    <div className="grid justify-items-start gap-3">
      <dl className="grid w-full gap-1">
        {amount ? <Row label={t.amountToPay} value={formatXof(amount)} strong /> : null}
        {balance ? <Row label={t.currentBalance} value={formatXof(balance)} /> : null}
      </dl>
      {amount ? null : <p className="text-small text-ink-muted">{t.amountByKsp}</p>}
      <Button variant="action" onClick={open}>
        {label}
      </Button>
      <p className="text-small text-ink-muted max-w-reading">{t.payWithWalletHint}</p>
      <FormMessage>{error?.message}</FormMessage>
    </div>
  );
}
