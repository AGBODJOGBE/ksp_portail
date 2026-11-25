'use client';

import { Button } from '@/components/ui/button';
import { FormMessage } from '@/components/ui/field';
import { Heading } from '@/components/ui/heading';
import { ApiError, contextKey, useSession } from '@/lib/api';
import { formatDateTime, formatXof } from '@/lib/format';
import { useState } from 'react';
import { useResource } from '@/lib/use-resource';
import { useOrganizationRole } from '@/features/identity';
import { getWallet } from '@/features/wallet/api';
import { walletTexts as t } from '@/features/wallet/texts';
import { withdrawalTexts } from '@/features/wallet/withdrawal-texts';
import { Payouts } from './payouts';
import { Statement } from './statement';
import { TopUpForm } from './top-up-form';
import { WithdrawalForm } from './withdrawal-form';
import { Withdrawals } from './withdrawals';

const SECTION = 'rounded-card border-line bg-surface grid gap-5 border p-5 shadow-xs sm:p-6';

function Space() {
  const session = useSession();
  const { state, reload, refresh, set } = useResource(getWallet);
  const role = useOrganizationRole();
  const readOnly = role === 'org_viewer';
  // Retrait vers Mobile Money : le titulaire en contexte personnel, l'administrateur d'une entreprise
  // (R-WL-04) ; la gateway reste seule juge (`AUTH_FORBIDDEN`). Rôle pas encore lu : rien n'est montré.
  const canWithdraw = role === 'personal' || role === 'org_admin';
  const roleKnown = role !== 'unknown';
  // Nouveau retrait : le relevé et « Mes retraits » repartent de leur première page.
  const [version, setVersion] = useState(0);
  const organization = session?.activeContext.organizationId ? session.activeContext.organizationName : null;

  if (state.status === 'loading') {
    return (
      <div role="status" className="grid gap-6">
        <span className="sr-only">{t.loading}</span>
        {['h-36', 'h-64'].map((size) => (
          <span
            key={size}
            aria-hidden="true"
            className={`bg-surface-sunken rounded-card block animate-pulse motion-reduce:animate-none ${size}`}
          />
        ))}
      </div>
    );
  }
  if (state.status === 'error') {
    return (
      <div className="grid justify-items-start gap-3">
        <FormMessage>{state.error instanceof ApiError ? state.error.message : t.genericError}</FormMessage>
        <Button variant="secondary" onClick={reload}>
          {t.retry}
        </Button>
      </div>
    );
  }

  const { prepaid, topUpLimits, totalCollected, payoutsInProgress, totalPaidOut } = state.data;
  const balance = prepaid?.balance ?? { amount: 0, currency: 'XOF' as const };
  const withdrawing = prepaid?.withdrawalsInProgress;
  // « Reversements » : seulement pour un titulaire qui a reçu des fonds à reverser (créancier, ADR-042).
  const collects = [totalCollected, payoutsInProgress, totalPaidOut].some(
    (money) => (money?.amount ?? 0) > 0,
  );
  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_24rem] lg:grid-rows-[auto_1fr] lg:items-start">
      <section
        aria-labelledby="solde-titre"
        className="rounded-card bg-brand text-on-brand grid gap-2 p-6 shadow-xs sm:p-8 lg:col-start-1 lg:row-start-1"
      >
        <h2 id="solde-titre" className="text-small font-semibold opacity-90">
          {organization ? t.balanceOf(organization) : t.balance}
        </h2>
        <p className="font-display text-4xl font-semibold tabular-nums sm:text-5xl">{formatXof(balance)}</p>
        {withdrawing && withdrawing.amount > 0 ? (
          <p className="font-medium">{withdrawalTexts.inProgress(formatXof(withdrawing))}</p>
        ) : null}
        <p className="text-small opacity-90">{t.balanceHint}</p>
        {prepaid?.lastEntryAt ? (
          <p className="text-small opacity-90">{t.lastEntry(formatDateTime(prepaid.lastEntryAt))}</p>
        ) : null}
      </section>

      {/* Les actions : recharger, puis retirer. Sur téléphone, juste sous le solde. */}
      <div className="grid gap-8 lg:col-start-2 lg:row-span-2 lg:row-start-1">
        <section aria-labelledby="recharge-titre" className={SECTION}>
          <div className="grid gap-1">
            <Heading as="h2" size="h3" id="recharge-titre">
              {t.topUpTitle}
            </Heading>
            {readOnly ? null : <p className="text-small text-ink-muted">{t.topUpLead}</p>}
          </div>
          {readOnly ? (
            <FormMessage tone="info">{t.readOnly}</FormMessage>
          ) : topUpLimits ? (
            <TopUpForm limits={topUpLimits} />
          ) : (
            <FormMessage tone="info">{t.topUpUnavailable}</FormMessage>
          )}
        </section>

        {roleKnown ? (
          <section aria-labelledby="retrait-titre" className={SECTION}>
            <div className="grid gap-1">
              <Heading as="h2" size="h3" id="retrait-titre">
                {withdrawalTexts.title}
              </Heading>
              {canWithdraw ? <p className="text-small text-ink-muted">{withdrawalTexts.lead}</p> : null}
            </div>
            {canWithdraw ? (
              <WithdrawalForm
                balance={balance}
                onCreated={(created) => {
                  set({ ...state.data, prepaid: created.wallet });
                  setVersion((value) => value + 1);
                }}
                onInsufficient={refresh}
              />
            ) : (
              <FormMessage tone="info">{withdrawalTexts.adminOnly}</FormMessage>
            )}
          </section>
        ) : null}
      </div>

      <div className="grid gap-8 lg:col-start-1 lg:row-start-2">
        <section aria-labelledby="releve-titre" className="grid gap-3">
          <Heading as="h2" size="h3" id="releve-titre">
            {t.statementTitle}
          </Heading>
          <Statement key={version} />
        </section>

        <section aria-labelledby="retraits-titre" className="grid gap-3">
          <Heading as="h2" size="h3" id="retraits-titre">
            {withdrawalTexts.listTitle}
          </Heading>
          <Withdrawals key={version} />
        </section>

        {collects ? (
          <section aria-labelledby="reversements-titre" className="grid gap-3">
            <div className="grid gap-1">
              <Heading as="h2" size="h3" id="reversements-titre">
                {t.payoutsTitle}
              </Heading>
              <p className="text-small text-ink-muted">{t.payoutsLead}</p>
            </div>
            <dl className="flex flex-wrap gap-x-8 gap-y-2">
              {(
                [
                  [t.paidOut, totalPaidOut],
                  [t.inProgress, payoutsInProgress],
                ] as const
              ).map(([label, money]) =>
                money ? (
                  <div key={label} className="grid">
                    <dt className="text-small text-ink-muted">{label}</dt>
                    <dd className="font-display text-ink text-lg font-semibold tabular-nums">
                      {formatXof(money)}
                    </dd>
                  </div>
                ) : null,
              )}
            </dl>
            <Payouts />
          </section>
        ) : null}
      </div>
    </div>
  );
}

/**
 * « Mon portefeuille » : solde prépayé du compte actif (personnel ou entreprise), recharge par Mobile
 * Money, retrait vers Mobile Money (R-WL-04), relevé et « Mes retraits ». Un changement de contexte relit tout.
 */
export function WalletSpace() {
  const key = contextKey(useSession()) ?? 'none';
  return <Space key={key} />;
}
