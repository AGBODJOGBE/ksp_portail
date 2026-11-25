'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { BackendPending } from '@/components/ui/backend-pending';
import { SummaryRow } from '@/components/ui/form-fields';
import { PagedListState } from '@/components/ui/paged-list-state';
import { Tabs } from '@/components/ui/tabs';
import { contextKey, useSession } from '@/lib/api';
import { formatDateTime, formatShortDate, formatXof } from '@/lib/format';
import { usePagedList } from '@/lib/use-paged-list';
import { CommissionInvoiceList, FeeReceiptList, commissionPaths, commissionTexts } from '@/features/billing';
import { describeRecoveryError } from '@/features/recovery/errors';
import { listRemittances, listStatements } from '@/features/recovery/money-api';
import { statementsNeeds, statementsTexts as t } from '@/features/recovery/money-texts';
import { recoveryPaths } from '@/features/recovery/paths';
import { sourceLabel } from '@/features/recovery/texts';

const LINK = 'text-brand-ink inline-flex min-h-11 items-center font-semibold underline underline-offset-4';
const ITEM = 'rounded-card border-line bg-surface grid gap-2 border p-4 shadow-xs sm:p-5';

/** Onglet demandé dans l'adresse (`?onglet=`), clé de l'onglet. */
const TAB_PARAMS: Record<string, string> = {
  reversements: 'remittances',
  releves: 'statements',
  factures: 'invoices',
  recus: 'receipts',
};

const describe = (error: unknown) => describeRecoveryError(error).message;

const MONTH = new Intl.DateTimeFormat('fr-BJ', { month: 'long', year: 'numeric', timeZone: 'UTC' });
/** « 2026-11 » → « novembre 2026 ». */
function monthOf(period: string): string {
  const match = /^(\d{4})-(\d{2})$/.exec(period);
  return match ? MONTH.format(new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, 1))) : period;
}

/** Reversements crédités au portefeuille : brut, commission, net ; le retrait passe par le portefeuille. */
function Remittances() {
  const list = usePagedList(listRemittances, describe);
  return (
    <div className="grid gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-ink-muted max-w-2xl">{t.remittancesLead}</p>
        <Link href={recoveryPaths.wallet} className={LINK}>
          {t.withdraw}
        </Link>
      </div>
      <PagedListState list={list} labels={t} empty={<p className="text-ink">{t.remittancesNone}</p>}>
        <ul className="grid gap-3 lg:grid-cols-2">
          {list.items.map((remittance) => (
            <li key={remittance.collectionId} className={ITEM}>
              <p className="flex flex-wrap items-baseline justify-between gap-2">
                <Link
                  href={recoveryPaths.case(remittance.caseId)}
                  className="text-ink font-semibold underline underline-offset-4"
                >
                  {t.caseLink(remittance.caseNumber)}
                </Link>
                <span className="text-small text-ink-muted">
                  {t.creditedOn(formatDateTime(remittance.creditedAt))}
                </span>
              </p>
              <p className="text-small text-ink-muted">{sourceLabel(remittance.source)}</p>
              <dl>
                <SummaryRow label={t.gross}>{formatXof(remittance.gross)}</SummaryRow>
                <SummaryRow label={t.commission}>{formatXof(remittance.commission)}</SummaryRow>
                <SummaryRow label={t.net} strong>
                  {formatXof(remittance.net)}
                </SummaryRow>
              </dl>
            </li>
          ))}
        </ul>
      </PagedListState>
    </div>
  );
}

/** Relevés mensuels par dossier : PDF et facture de commission. Route en 501 : « Bientôt disponible ». */
function Statements() {
  const list = usePagedList(listStatements, describe);
  if (list.pending) {
    return (
      <BackendPending id="releves-attente" title={t.pendingTitle} needs={statementsNeeds} headingAs="h3">
        {t.pendingText}
      </BackendPending>
    );
  }
  return (
    <div className="grid gap-5">
      <p className="text-ink-muted max-w-2xl">{t.statementsLead}</p>
      <PagedListState list={list} labels={t} empty={<p className="text-ink">{t.statementsNone}</p>}>
        <ul className="grid gap-3 lg:grid-cols-2">
          {list.items.map((statement) => (
            <li key={statement.id} className={ITEM}>
              <p className="flex flex-wrap items-baseline justify-between gap-2">
                <span className="text-ink font-semibold first-letter:uppercase">
                  {monthOf(statement.period)}
                </span>
                <Link
                  href={recoveryPaths.case(statement.caseId)}
                  className="text-small text-ink-muted underline underline-offset-4"
                >
                  {t.caseLink(statement.caseNumber)}
                </Link>
              </p>
              <dl>
                <SummaryRow label={t.collected}>{formatXof(statement.collected)}</SummaryRow>
                <SummaryRow label={t.commission}>{formatXof(statement.commission)}</SummaryRow>
                <SummaryRow label={t.costs}>{formatXof(statement.costs)}</SummaryRow>
                <SummaryRow label={t.remitted} strong>
                  {formatXof(statement.remitted)}
                </SummaryRow>
              </dl>
              <p className="text-small text-ink-muted">{t.issuedOn(formatShortDate(statement.issuedAt))}</p>
              <div className="flex flex-wrap gap-x-5">
                {statement.documentId ? (
                  <Link href={recoveryPaths.document(statement.documentId)} className={LINK}>
                    {t.pdf}
                  </Link>
                ) : null}
                {statement.invoiceId ? (
                  <Link href={commissionPaths.invoice(statement.invoiceId)} className={LINK}>
                    {t.invoice}
                  </Link>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      </PagedListState>
    </div>
  );
}

/**
 * « Reversements et relevés » (`/mon-espace/recouvrement/releves`) : reversements crédités au portefeuille,
 * relevés mensuels, factures de commission et reçus des frais (écrans de billing). L'onglet se choisit par
 * l'adresse (`?onglet=factures`, depuis « Mes factures »). Relu à chaque changement de compte actif.
 */
export function RecoveryStatements() {
  const key = contextKey(useSession()) ?? 'none';
  const tab = TAB_PARAMS[useSearchParams().get('onglet') ?? ''];
  return (
    <section
      aria-label={t.tabsLabel}
      className="rounded-panel border-line bg-surface min-w-0 border p-5 shadow-xs sm:p-7"
    >
      <Tabs
        key={key}
        label={t.tabsLabel}
        defaultKey={tab}
        items={[
          { key: 'remittances', label: t.tabs.remittances, render: () => <Remittances /> },
          { key: 'statements', label: t.tabs.statements, render: () => <Statements /> },
          {
            key: 'invoices',
            label: t.tabs.invoices,
            render: () => (
              <div className="grid gap-5">
                <p className="text-ink-muted max-w-2xl">{commissionTexts.listLead}</p>
                <CommissionInvoiceList />
              </div>
            ),
          },
          {
            key: 'receipts',
            label: t.tabs.receipts,
            render: () => (
              <div className="grid gap-5">
                <p className="text-ink-muted max-w-2xl">{commissionTexts.receiptsLead}</p>
                <FeeReceiptList />
              </div>
            ),
          },
        ]}
      />
    </section>
  );
}
