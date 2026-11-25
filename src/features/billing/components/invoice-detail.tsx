'use client';

import Link from 'next/link';
import { type ReactNode, useCallback, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { BandBack, BandHeader } from '@/components/ui/band-header';
import { Button } from '@/components/ui/button';
import { Gauge } from '@/components/ui/gauge';
import { Skeleton } from '@/components/ui/skeleton';
import { FormMessage } from '@/components/ui/field';
import { Heading } from '@/components/ui/heading';
import { ApiError } from '@/lib/api';
import { cn } from '@/lib/cn';
import { formatExclusiveEndDate, formatNumber, formatShortDate, formatXof } from '@/lib/format';
import { useResource } from '@/lib/use-resource';
import { WalletPay } from '@/features/wallet';
import { getInvoice, payInvoice } from '@/features/billing/api';
import {
  filled,
  hasPeriod,
  invoiceKind,
  invoiceMonth,
  invoiceSummary,
  lineDetails,
  serviceDate,
} from '@/features/billing/invoice-view';
import type { CreditNote } from '@/features/billing/schemas';
import { billingPaths, billingTexts as t, invoiceMethods, invoiceStatus } from '@/features/billing/texts';
import { InvoiceMobileMoney } from './invoice-mobile-money';

/** Factures payables avec le portefeuille (le reste dû est débité en entier par billing, ADR-046). */
const PAYABLE = new Set(['pending_payment', 'overdue']);

/** Message d'une lecture refusée ; une facture introuvable ne se « réessaie » pas. */
function describe(error: unknown): { message: string; notFound: boolean } {
  const notFound = error instanceof ApiError && error.status === 404;
  if (notFound) return { message: t.notFound, notFound };
  return {
    message:
      error instanceof ApiError
        ? error.message
        : 'Une erreur est survenue. Réessayez dans quelques instants.',
    notFound,
  };
}

function BackLink() {
  return <BandBack href={billingPaths.list} label={t.back} />;
}

/** Numéro d'un dossier du Nettoyage et lien vers sa liste (la facture n'en porte pas l'identifiant). */
function CleaningReference({ number, href, label }: { number: string; href: string; label: string }) {
  return (
    <span className="flex flex-wrap items-baseline gap-x-3">
      <span>{number}</span>
      <Link
        href={href}
        className="text-action-ink text-small inline-flex min-h-11 items-center font-semibold underline-offset-4 hover:underline sm:min-h-0"
      >
        {label}
      </Link>
    </span>
  );
}

/** Avoirs émis sur la facture (R-PE-07) : numéro, date, motif, lignes et où est allé le montant. */
function CreditNotes({ notes }: { notes: ReadonlyArray<CreditNote> }) {
  return (
    <section
      aria-labelledby="facture-avoirs"
      className="rounded-card border-line bg-surface grid gap-4 border p-5 sm:p-6"
    >
      <div className="grid gap-1">
        <Heading as="h2" size="h3" id="facture-avoirs">
          {t.creditNotesTitle}
        </Heading>
        <p className="text-small text-ink-muted">{t.creditNotesLead}</p>
      </div>
      <ul className="divide-line border-line grid divide-y border-y">
        {notes.map((note) => (
          <li key={note.id} className="grid gap-2 py-3">
            <div className="flex flex-wrap items-baseline justify-between gap-x-4">
              <p className="text-ink font-semibold">{t.creditNote(note.number)}</p>
              <p className="text-ink font-semibold tabular-nums">{formatXof(note.total)}</p>
            </div>
            <p className="text-small text-ink-muted">{t.creditIssuedOn(formatShortDate(note.issuedAt))}</p>
            <p className="text-ink">
              <span className="text-ink-muted">{`${t.creditReason} : `}</span>
              {note.reason}
            </p>
            {note.lines.length ? (
              <ul className="text-small text-ink-muted grid gap-0.5">
                {note.lines.map((line, index) => (
                  <li key={`${line.label}-${index}`} className="flex justify-between gap-4">
                    <span>{line.label}</span>
                    <span className="tabular-nums">{formatXof(line.amount)}</span>
                  </li>
                ))}
              </ul>
            ) : null}
            <dl className="text-small grid gap-x-6 gap-y-1 sm:grid-cols-2">
              {note.appliedToBalance.amount > 0 ? (
                <div className="flex justify-between gap-4 sm:block">
                  <dt className="text-ink-muted">{t.creditApplied}</dt>
                  <dd className="text-ink font-medium tabular-nums">{formatXof(note.appliedToBalance)}</dd>
                </div>
              ) : null}
              {note.creditedToWallet.amount > 0 ? (
                <div className="flex justify-between gap-4 sm:block">
                  <dt className="text-ink-muted">{t.creditToWallet}</dt>
                  <dd className="text-ink font-medium tabular-nums">{formatXof(note.creditedToWallet)}</dd>
                </div>
              ) : null}
            </dl>
          </li>
        ))}
      </ul>
    </section>
  );
}

/**
 * Détail d'une facture : v1 (mois d'un contrat, période) ou v2 (séance, frais de visite, mensuelle ;
 * demande, programme, lieu, date), lignes, total, échéance, avoirs, règlements ; paiement par Mobile Money
 * ou par le portefeuille tant qu'il reste à régler.
 */
export function InvoiceDetail({ id }: { id: string }) {
  const { state, reload, refresh, set } = useResource(useCallback(() => getInvoice(id), [id]));
  // Paiement par le portefeuille enregistré : montant et solde restant, annoncés (zone `status`).
  const [paid, setPaid] = useState<string | null>(null);

  if (state.status === 'loading') {
    return (
      <div role="status" className="grid gap-8">
        <span className="sr-only">{t.loading}</span>
        <BandHeader overlap={<Skeleton className="rounded-card h-28" />}>
          <div className="grid gap-3" aria-hidden="true">
            <Skeleton className="h-11 w-48" />
            <Skeleton className="h-11 w-2/3 max-w-md" />
          </div>
        </BandHeader>
        <Skeleton className="rounded-card h-56" />
      </div>
    );
  }
  if (state.status === 'error') {
    const view = describe(state.error);
    return (
      <div className="grid gap-8">
        <BandHeader>
          <BackLink />
        </BandHeader>
        <div className="rounded-card border-line bg-surface grid justify-items-start gap-4 border p-5 shadow-xs sm:p-6">
          <FormMessage>{view.message}</FormMessage>
          {view.notFound ? null : (
            <Button variant="secondary" onClick={reload}>
              {t.retry}
            </Button>
          )}
        </div>
      </div>
    );
  }

  const invoice = state.data;
  const status = invoiceStatus(invoice.status);
  const kind = invoiceKind(invoice);
  const requestNumber = filled(invoice.requestNumber);
  const programNumber = filled(invoice.programNumber);
  // Facture v1 : la période du contrat ; v2 : nature, séance, lieu et date (champs vides masqués).
  const lead =
    hasPeriod(invoice) && invoice.periodStart && invoice.periodEnd
      ? t.period(formatShortDate(invoice.periodStart), formatExclusiveEndDate(invoice.periodEnd))
      : invoiceSummary(invoice);
  const facts: ReadonlyArray<readonly [string, ReactNode]> = [
    [t.facts.origin, t.source[invoice.source] ?? invoice.source],
    [t.facts.kind, kind],
    [t.facts.month, invoiceMonth(invoice)],
    [
      t.facts.request,
      requestNumber ? (
        <CleaningReference
          number={requestNumber}
          href={billingPaths.cleaningRequests}
          label={t.seeRequests}
        />
      ) : null,
    ],
    [
      t.facts.program,
      programNumber ? (
        <CleaningReference
          number={programNumber}
          href={billingPaths.cleaningPrograms}
          label={t.seePrograms}
        />
      ) : null,
    ],
    [t.facts.session, filled(invoice.sessionRank)],
    [t.facts.place, filled(invoice.placeLabel)],
    [t.facts.serviceDate, serviceDate(invoice.serviceDate)],
    [t.facts.issued, formatShortDate(invoice.issuedAt)],
    [t.facts.settled, invoice.paidAt ? t.paidOn(formatShortDate(invoice.paidAt)) : null],
  ];
  const payable = PAYABLE.has(invoice.status) && invoice.balance.amount > 0;

  return (
    <div className="grid gap-8">
      <BandHeader
        overlap={
          <div className="rounded-card border-line bg-surface shadow-float grid gap-5 border p-5 sm:p-6">
            {/* Montants de la gateway : total, déjà réglé, reste à régler (`balance`), échéance. */}
            <dl className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              {(
                [
                  [t.total, formatXof(invoice.total)],
                  [t.paid, formatXof(invoice.paid)],
                  [t.balance, formatXof(invoice.balance)],
                  [t.dueLabel, formatShortDate(invoice.dueAt)],
                ] as const
              ).map(([label, value], index) => (
                <div key={label} className={index === 2 ? 'sm:border-line sm:border-l sm:pl-4' : undefined}>
                  <dt className="text-small text-ink-muted">{label}</dt>
                  <dd
                    className={cn(
                      'font-display text-figure-sm mt-1 font-semibold tabular-nums',
                      // Une seule couleur à la fois : les classes s'ajoutent sans se remplacer (`cn`).
                      index === 2 && invoice.status === 'overdue' ? 'text-danger' : 'text-ink',
                    )}
                  >
                    {value}
                  </dd>
                </div>
              ))}
            </dl>
            {invoice.total.amount > 0 ? (
              <Gauge
                // Montants déjà donnés juste au-dessus : la jauge n'en répète pas la légende.
                legend={false}
                max={invoice.total.amount}
                label={t.dashboard.gaugeLabel(formatXof(invoice.paid), formatXof(invoice.total))}
                segments={[
                  {
                    label: t.dashboard.paidLabel,
                    value: invoice.paid.amount,
                    tone: 'action',
                    display: formatXof(invoice.paid),
                  },
                  {
                    label: t.dashboard.balanceLabel,
                    value: invoice.balance.amount,
                    tone: invoice.status === 'overdue' ? 'danger' : 'brand',
                    display: formatXof(invoice.balance),
                  },
                ]}
              />
            ) : null}
          </div>
        }
      >
        <BackLink />
        <div className="mt-3">
          <Badge tone={status.tone} dot>
            {status.label}
          </Badge>
        </div>
        <Heading as="h1" size="h1" className="mt-3">
          {t.invoice(invoice.number)}
        </Heading>
        {lead ? <p className="text-lead text-ink-muted mt-3">{lead}</p> : null}
      </BandHeader>

      {invoice.status === 'overdue' ? <FormMessage>{`${t.overdueNotice} ${t.howToPay}`}</FormMessage> : null}
      {invoice.status === 'pending_payment' ? (
        <FormMessage tone="info">{`${t.pendingNotice(formatShortDate(invoice.dueAt))} ${t.howToPay}`}</FormMessage>
      ) : null}
      {invoice.status === 'cancelled' ? <FormMessage tone="info">{t.cancelledNotice}</FormMessage> : null}
      <FormMessage tone="success">{paid}</FormMessage>

      {payable ? (
        // Deux moyens : Mobile Money d'abord (R-PE-04), puis le portefeuille (ADR-046).
        <div className="grid gap-4 lg:grid-cols-2 lg:items-start">
          <InvoiceMobileMoney invoice={invoice} onStale={refresh} />
          <section
            aria-labelledby="facture-payer"
            className="rounded-card border-line bg-surface shadow-card grid gap-4 border p-5 sm:p-6"
          >
            <Heading as="h2" size="h3" id="facture-payer">
              {t.payTitle}
            </Heading>
            <WalletPay
              pay={(key) => payInvoice(invoice.id, key)}
              amount={invoice.balance}
              onPaid={(updated, notice) => {
                set(updated);
                setPaid(notice);
              }}
              onStale={refresh}
            />
          </section>
        </div>
      ) : null}

      {invoice.organization ? (
        <section
          aria-labelledby="facture-entete"
          className="rounded-card border-line bg-surface grid gap-2 border p-5 sm:p-6"
        >
          <Heading as="h2" size="h3" id="facture-entete">
            {t.billedTo}
          </Heading>
          <address className="text-ink grid gap-1 not-italic">
            <span className="font-semibold">{invoice.organization.legalName}</span>
            <span>{invoice.organization.address}</span>
            <span className="text-small tabular-nums">
              {t.ifu} : {invoice.organization.ifu}
              {invoice.organization.rccm ? ` · ${t.rccm} : ${invoice.organization.rccm}` : ''}
            </span>
          </address>
          <p className="text-small text-ink-muted">{t.headerFrozen}</p>
        </section>
      ) : null}

      <section
        aria-labelledby="facture-detail"
        className="rounded-card border-line bg-surface grid gap-4 border p-5 sm:p-6"
      >
        <Heading as="h2" size="h3" id="facture-detail">
          {t.linesTitle}
        </Heading>
        {/* Téléphone : lignes empilées ; à partir de 640 px : tableau. */}
        <ul className="divide-line border-line grid divide-y border-y sm:hidden">
          {invoice.lines.map((line, index) => (
            <li key={`${line.label}-${index}`} className="flex items-start justify-between gap-4 py-2.5">
              <span className="min-w-0">
                <span className="text-ink block font-medium">{line.label}</span>
                {lineDetails(line) ? (
                  <span className="text-small text-ink-muted block">{lineDetails(line)}</span>
                ) : null}
                <span className="text-small text-ink-muted tabular-nums">
                  {formatNumber(line.quantity)} × {formatXof(line.unitPrice)}
                </span>
              </span>
              <span className="text-ink shrink-0 font-semibold tabular-nums">{formatXof(line.amount)}</span>
            </li>
          ))}
        </ul>
        <div className="hidden sm:block">
          <table className="w-full text-left">
            <thead className="text-small text-ink-muted">
              <tr className="border-line border-b">
                <th scope="col" className="py-2 pr-3 font-semibold">
                  {t.line}
                </th>
                <th scope="col" className="px-3 py-2 text-right font-semibold">
                  {t.quantity}
                </th>
                <th scope="col" className="px-3 py-2 text-right font-semibold">
                  {t.unitPrice}
                </th>
                <th scope="col" className="py-2 pl-3 text-right font-semibold">
                  {t.amount}
                </th>
              </tr>
            </thead>
            <tbody className="tabular-nums">
              {invoice.lines.map((line, index) => (
                <tr key={`${line.label}-${index}`} className="border-line border-b">
                  <th scope="row" className="text-ink py-2 pr-3 font-medium">
                    {line.label}
                    {lineDetails(line) ? (
                      <span className="text-small text-ink-muted block font-normal">{lineDetails(line)}</span>
                    ) : null}
                  </th>
                  <td className="px-3 py-2 text-right">{formatNumber(line.quantity)}</td>
                  <td className="px-3 py-2 text-right">{formatXof(line.unitPrice)}</td>
                  <td className="py-2 pl-3 text-right">{formatXof(line.amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {/* Prorata des jours facturables : facture mensuelle v1 (avec sa période) seulement. */}
        {!kind && hasPeriod(invoice) ? <p className="text-small text-ink-muted">{t.prorata}</p> : null}
        <dl className="grid gap-x-6 gap-y-2 sm:grid-cols-[11rem_1fr]">
          {facts
            .filter(([, value]) => value)
            .map(([label, value]) => (
              <div key={label} className="contents">
                <dt className="text-small text-ink-muted">{label}</dt>
                <dd className="text-ink font-medium tabular-nums">{value}</dd>
              </div>
            ))}
        </dl>
      </section>

      {invoice.creditNotes?.length ? <CreditNotes notes={invoice.creditNotes} /> : null}

      <section
        aria-labelledby="facture-reglements"
        className="rounded-card border-line bg-surface grid gap-3 border p-5 sm:p-6"
      >
        <Heading as="h2" size="h3" id="facture-reglements">
          {t.paymentsTitle}
        </Heading>
        {invoice.payments.length ? (
          <ul className="grid gap-1">
            {invoice.payments.map((payment) => (
              <li key={payment.id} className="text-ink">
                <span className="font-semibold tabular-nums">{formatXof(payment.amount)}</span> ·{' '}
                {invoiceMethods[payment.method] ?? payment.method} · {formatShortDate(payment.recordedAt)}
                {payment.reference ? ` · ${payment.reference}` : ''}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-ink-muted">{t.noPayments}</p>
        )}
      </section>
    </div>
  );
}
