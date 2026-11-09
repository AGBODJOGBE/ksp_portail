'use client';

import { useState } from 'react';
import { ButtonLink } from '@/components/ui/button';
import { formatXof } from '@/lib/format';
import { useResource } from '@/lib/use-resource';
import { getWallet } from '@/features/wallet/api';
import { walletPaths } from '@/features/wallet/paths';
import { walletTexts as t } from '@/features/wallet/texts';
import { forgetResume, readResume } from '@/features/wallet/top-up';

/**
 * Recharge confirmée par le prestataire (page de retour du paiement) : le solde relu auprès de la gateway,
 * puis le retour sur l'écran d'où partait la recharge (paiement interrompu faute de solde), sinon le
 * portefeuille. Le solde est annoncé aux lecteurs d'écran dès qu'il est lu.
 */
export function TopUpResult() {
  const { state } = useResource(getWallet);
  const [resume] = useState(readResume);
  const balance = state.status === 'ready' ? (state.data.prepaid?.balance ?? null) : null;

  return (
    <section
      aria-labelledby="recharge-resultat"
      className="rounded-card border-action-muted bg-action-soft grid justify-items-start gap-4 border p-5 sm:p-6 print:hidden"
    >
      <div role="status" className="grid gap-1">
        <h2 id="recharge-resultat" className="font-display text-ink text-xl font-semibold">
          {t.topUpDone}
        </h2>
        {balance ? <p className="text-ink text-lg tabular-nums">{t.newBalance(formatXof(balance))}</p> : null}
      </div>
      <div className="flex flex-wrap gap-3">
        {resume ? (
          <ButtonLink href={resume} variant="action" onClick={forgetResume}>
            {t.resumePayment}
          </ButtonLink>
        ) : null}
        <ButtonLink href={walletPaths.home} variant={resume ? 'secondary' : 'primary'}>
          {t.seeWallet}
        </ButtonLink>
      </div>
    </section>
  );
}
