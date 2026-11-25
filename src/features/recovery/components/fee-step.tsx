'use client';

import { formatDateTime } from '@/lib/format';
import { WalletPay } from '@/features/wallet';
import { payCaseFee } from '@/features/recovery/api';
import type { RecoveryCase } from '@/features/recovery/schemas';
import { FEE_RULE } from '@/features/recovery/texts';
import { wizardTexts as t } from '@/features/recovery/wizard-texts';

/**
 * Frais de dossier (`POST /recovery/cases/{id}/fee/pay`, ADR-060) : débit du portefeuille du compte actif
 * par `WalletPay` (confirmation, solde insuffisant → recharge puis retour ici, clé d'idempotence gardée
 * pendant les renvois). Le montant est celui figé au mandat (`fee.amount`), jamais calculé ici.
 */
export function FeeStep({
  recoveryCase,
  returnTo,
  onPaid,
  onStale,
}: {
  recoveryCase: RecoveryCase;
  /** Écran où revenir après une recharge du portefeuille. */
  returnTo?: string;
  onPaid: (recoveryCase: RecoveryCase, notice: string) => void;
  onStale: () => void;
}) {
  const deadline =
    recoveryCase.nextDeadline?.kind === 'fee_payment'
      ? formatDateTime(recoveryCase.nextDeadline.dueAt)
      : null;
  return (
    <div className="grid gap-4">
      <p className="text-ink">{FEE_RULE}</p>
      {deadline ? <p className="text-small text-ink-muted">{t.feeBefore(deadline)}</p> : null}
      <WalletPay
        pay={(key) => payCaseFee(recoveryCase.id, key)}
        amount={recoveryCase.fee?.amount ?? null}
        label={t.payFee}
        returnTo={returnTo}
        onPaid={onPaid}
        onStale={onStale}
      />
    </div>
  );
}
