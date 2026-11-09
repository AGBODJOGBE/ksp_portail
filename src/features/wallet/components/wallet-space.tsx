'use client';

import { Button } from '@/components/ui/button';
import { FormMessage } from '@/components/ui/field';
import { Heading } from '@/components/ui/heading';
import { ApiError, contextKey, useSession } from '@/lib/api';
import { formatDateTime, formatXof } from '@/lib/format';
import { useResource } from '@/lib/use-resource';
import { getWallet } from '@/features/wallet/api';
import { walletTexts as t } from '@/features/wallet/texts';
import { Statement } from './statement';
import { TopUpForm } from './top-up-form';
import { useReadOnly } from './use-read-only';

const SECTION = 'rounded-card border-line bg-surface grid gap-5 border p-5 shadow-xs sm:p-6';

function Space() {
  const session = useSession();
  const { state, reload } = useResource(getWallet);
  const readOnly = useReadOnly();
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

  const { prepaid, topUpLimits } = state.data;
  const balance = prepaid?.balance ?? { amount: 0, currency: 'XOF' as const };
  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_24rem] lg:items-start">
      <section
        aria-labelledby="solde-titre"
        className="rounded-card bg-brand text-on-brand grid gap-2 p-6 shadow-xs sm:p-8 lg:col-start-1"
      >
        <h2 id="solde-titre" className="text-small font-semibold opacity-90">
          {organization ? t.balanceOf(organization) : t.balance}
        </h2>
        <p className="font-display text-4xl font-semibold tabular-nums sm:text-5xl">{formatXof(balance)}</p>
        <p className="text-small opacity-90">{t.balanceHint}</p>
        {prepaid?.lastEntryAt ? (
          <p className="text-small opacity-90">{t.lastEntry(formatDateTime(prepaid.lastEntryAt))}</p>
        ) : null}
      </section>

      <section
        aria-labelledby="recharge-titre"
        className={`${SECTION} lg:col-start-2 lg:row-span-2 lg:row-start-1`}
      >
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

      <section aria-labelledby="releve-titre" className="grid gap-3 lg:col-start-1 lg:row-start-2">
        <Heading as="h2" size="h3" id="releve-titre">
          {t.statementTitle}
        </Heading>
        <Statement />
      </section>
    </div>
  );
}

/**
 * « Mon portefeuille » : solde prépayé du compte actif (personnel ou entreprise), recharge par Mobile
 * Money et relevé. Un changement de contexte relit tout.
 */
export function WalletSpace() {
  const key = contextKey(useSession()) ?? 'none';
  return <Space key={key} />;
}
