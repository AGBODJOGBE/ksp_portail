'use client';

import { formatDateTime } from '@/lib/format';
import { payVisitFee } from '@/features/cleaning/api';
import { requestTexts as t } from '@/features/cleaning/request-texts';
import type { VisitFee } from '@/features/cleaning/schemas';
import { CleaningPay } from './pay-buttons';

/**
 * Paiement des frais de visite d'une demande (`POST /requests/{id}/visit-fee/pay`, ADR-055 §2) : voir
 * `CleaningPay`. Montant et date limite tels que renvoyés par la gateway.
 */
export function VisitFeePay({
  requestId,
  fee,
  onChanged,
}: {
  requestId: string;
  fee: VisitFee;
  /** Paiement enregistré, ou état changé entre-temps : la demande est relue. */
  onChanged: () => void;
}) {
  return (
    <CleaningPay
      amount={fee.amount}
      amountLabel={t.feeAmount}
      deadline={fee.payBefore ? t.feeText(formatDateTime(fee.payBefore)) : null}
      subjectKey={{ requestId, fee: fee.id }}
      pay={(method, key) => payVisitFee(requestId, method, key)}
      paidText={t.paid}
      awaitingText={t.awaitingPayment}
      conflictText={t.conflict}
      onChanged={onChanged}
    />
  );
}
