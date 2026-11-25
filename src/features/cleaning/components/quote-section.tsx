'use client';

import Link from 'next/link';
import { useRef, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button, ButtonLink } from '@/components/ui/button';
import { FormMessage, TextField } from '@/components/ui/field';
import { IconFileCheck } from '@/components/ui/icons';
import {
  beninDate,
  formatDate,
  formatDateTime,
  formatDuration,
  formatShortDate,
  formatXof,
} from '@/lib/format';
import type { OrganizationRole } from '@/features/identity';
import { type DeclineReason, acceptQuote, declineQuote, forwardQuote } from '@/features/cleaning/api';
import {
  type CleaningErrorView,
  describeCleaningError,
  errorWithReference,
} from '@/features/cleaning/errors';
import { idempotentSubmission } from '@/features/cleaning/idempotency';
import { cleaningPaths } from '@/features/cleaning/paths';
import { quoteTexts as t, requestTexts } from '@/features/cleaning/request-texts';
import { describeSchedule } from '@/features/cleaning/schedule';
import type { AcceptResult, CleaningRequest, Comparison, Quote } from '@/features/cleaning/schemas';
import { quoteKind, quoteStatus } from '@/features/cleaning/status-texts';
import { SelectField, SummaryRow, TextAreaField } from './fields';

/** Dates du programme montrées avant « et N autres ». */
const SHOWN_DATES = 8;

/**
 * Devis de la demande (section de sa page) : lignes, prix d'une séance, nombre de séances, total, frais
 * de visite déduits, équipe et durée, validité, écarts « déclaré / retenu » ; puis l'action du rôle.
 * Accepter : conditions générales (version du devis) et date de début facultative. Refuser : motif
 * facultatif. Membre d'une entreprise : « Accepter » expliqué, « Transmettre aux administrateurs ».
 * Lecteur : aucune action. Le PDF n'apparaît que lorsqu'il existe.
 */
export function QuoteSection({
  request,
  quote,
  role,
  onChanged,
}: {
  request: CleaningRequest;
  quote: Quote;
  role: OrganizationRole;
  onChanged: () => void;
}) {
  const open = quote.status === 'sent' && request.status === 'quote_sent';
  // Gardé ici : la demande relue après l'acceptation n'a plus de devis à accepter.
  const [accepted, setAccepted] = useState<AcceptResult | null>(null);
  return (
    <section
      id="devis"
      aria-labelledby="devis-titre"
      className="rounded-panel border-line bg-surface scroll-mt-24 border p-5 shadow-xs sm:p-8"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 id="devis-titre" className="font-display text-h2 text-ink font-semibold">
            {t.title}
          </h2>
          <p className="text-small text-ink-muted mt-1">
            {t.version(quoteKind(quote.kind), quote.version)}
            {quote.sentAt ? ` · ${t.sentAt(formatShortDate(quote.sentAt))}` : ''}
          </p>
        </div>
        <Badge tone={quoteStatus(quote.status).tone} dot>
          {quoteStatus(quote.status).label}
        </Badge>
      </div>
      {quote.validUntil && open ? (
        <p className="text-ink mt-3 font-medium">{t.validUntil(formatDateTime(quote.validUntil))}</p>
      ) : null}

      <div className="mt-6">
        <QuoteBody quote={quote} />
      </div>

      {quote.pdfDocumentId ? (
        <ButtonLink
          href={`/mon-espace/documents/${encodeURIComponent(quote.pdfDocumentId)}`}
          variant="secondary"
          className="mt-6"
        >
          <IconFileCheck />
          {t.pdf}
        </ButtonLink>
      ) : null}

      {accepted ? (
        <div className="mt-6 grid justify-items-start gap-3">
          <FormMessage tone="success">{t.acceptedNotice(accepted.program.number)}</FormMessage>
          <ButtonLink href={cleaningPaths.program(accepted.program.id)} variant="action" size="lg">
            {requestTexts.seeProgram}
          </ButtonLink>
        </div>
      ) : open ? (
        <QuoteActions
          request={request}
          quote={quote}
          role={role}
          onChanged={onChanged}
          onAccepted={setAccepted}
        />
      ) : null}
    </section>
  );
}

/** Contenu d'un devis, sans action (version en cours ou précédente). */
export function QuoteBody({ quote }: { quote: Quote }) {
  const dates = quote.sessionStarts;
  return (
    <div className="grid gap-6 lg:grid-cols-12">
      <div className="grid content-start gap-6 lg:col-span-7">
        <div>
          <h3 className="text-ink font-semibold">{t.lines}</h3>
          <dl className="mt-2">
            {quote.lines.map((line) => (
              <SummaryRow
                key={`${line.offerId}-${line.kind}`}
                label={
                  <>
                    <span className="text-ink font-medium">
                      {line.kind === 'pack_discount' ? `${t.packDiscount} — ${line.name}` : line.name}
                    </span>
                    {line.kind === 'offer' && line.quantity ? (
                      <span className="block">{t.quantity(line.quantity, line.unit)}</span>
                    ) : null}
                  </>
                }
              >
                {line.amount ? formatXof(line.amount) : '—'}
              </SummaryRow>
            ))}
            {quote.adjustments.map((adjustment, index) => (
              <SummaryRow
                key={`ajustement-${index}`}
                label={
                  <>
                    <span className="text-ink font-medium">{t.adjustment(adjustment.kind)}</span>
                    <span className="block">{adjustment.reason}</span>
                  </>
                }
              >
                {adjustment.amount ? formatXof(adjustment.amount) : '—'}
              </SummaryRow>
            ))}
          </dl>
        </div>
        {quote.comparison ? <ComparisonTable comparison={quote.comparison} /> : null}
      </div>
      <div className="grid content-start gap-6 lg:col-span-5">
        <dl className="rounded-card border-line bg-surface-muted border px-4 py-2">
          {quote.sessionPrice ? (
            <SummaryRow label={t.sessionPrice}>{formatXof(quote.sessionPrice)}</SummaryRow>
          ) : null}
          <SummaryRow label={t.sessionsCount}>{quote.sessionsCount}</SummaryRow>
          {quote.total ? (
            <SummaryRow label={t.total} strong>
              {formatXof(quote.total)}
            </SummaryRow>
          ) : null}
          {quote.visitFeeDeduction && quote.visitFeeDeduction.amount > 0 ? (
            <SummaryRow label={t.visitFeeDeduction}>{`− ${formatXof(quote.visitFeeDeduction)}`}</SummaryRow>
          ) : null}
          <SummaryRow label={t.teamLabel}>{t.team(quote.teamSize)}</SummaryRow>
          <SummaryRow label={t.duration}>{formatDuration(quote.durationMinutes)}</SummaryRow>
          <SummaryRow label={t.paymentTerms}>
            {quote.paymentTerms === 'monthly_invoice' ? t.monthlyInvoice : t.perSession}
          </SummaryRow>
        </dl>
        <div>
          <h3 className="text-ink font-semibold">{t.dates}</h3>
          <p className="text-small text-ink-muted mt-1">{describeSchedule(quote.schedule)}</p>
          <ul className="mt-2 flex flex-wrap gap-2">
            {dates.slice(0, SHOWN_DATES).map((start) => (
              <li
                key={start}
                className="bg-brand-soft text-brand-ink ring-brand-muted rounded-full px-3 py-1.5 text-sm ring-1 ring-inset"
              >
                {formatShortDate(start)}
              </li>
            ))}
            {dates.length > SHOWN_DATES ? (
              <li className="text-small text-ink-muted self-center">
                {t.datesMore(dates.length - SHOWN_DATES)}
              </li>
            ) : null}
          </ul>
        </div>
      </div>
    </div>
  );
}

/** Déclaré / retenu, motif et effet sur le prix d'une séance (R-CS-01, R-CS-02). */
export function ComparisonTable({ comparison }: { comparison: Comparison }) {
  return (
    <div>
      <h3 className="text-ink font-semibold">{t.comparisonTitle}</h3>
      {comparison.confirmed ? (
        <p className="text-small text-action-ink bg-action-soft rounded-control mt-2 p-3 font-medium">
          {t.confirmed}
        </p>
      ) : (
        <>
          {comparison.rows.length ? (
            <div className="mt-2 overflow-x-auto">
              <table className="w-full min-w-[32rem] text-left text-sm">
                <thead className="text-ink-muted">
                  <tr className="border-line border-b">
                    <th scope="col" className="py-2 pr-3 font-semibold">
                      {t.parameterColumn}
                    </th>
                    <th scope="col" className="py-2 pr-3 font-semibold">
                      {t.declaredColumn}
                    </th>
                    <th scope="col" className="py-2 pr-3 font-semibold">
                      {t.retainedColumn}
                    </th>
                    <th scope="col" className="py-2 pr-3 font-semibold">
                      {t.effectColumn}
                    </th>
                    <th scope="col" className="py-2 font-semibold">
                      {t.reasonColumn}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {comparison.rows.map((row) => (
                    <tr key={row.parameterCode} className="border-line border-b align-top last:border-b-0">
                      <th scope="row" className="text-ink py-2 pr-3 font-medium">
                        {row.label}
                      </th>
                      <td className="py-2 pr-3">{row.declaredDisplay ?? '—'}</td>
                      <td className="text-ink py-2 pr-3 font-semibold">{row.retainedDisplay ?? '—'}</td>
                      <td className="py-2 pr-3 tabular-nums">
                        {row.priceEffect
                          ? `${row.priceEffect.amount > 0 ? '+ ' : ''}${formatXof(row.priceEffect)}`
                          : '—'}
                      </td>
                      <td className="py-2">{row.reason ?? '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
          {comparison.addedCleaningTypes.length ? (
            <p className="text-small mt-2">
              <strong className="font-semibold">{t.added} :</strong>{' '}
              {comparison.addedCleaningTypes.map((item) => item.name).join(', ')}
            </p>
          ) : null}
          {comparison.removedCleaningTypes.length ? (
            <p className="text-small mt-1">
              <strong className="font-semibold">{t.removed} :</strong>{' '}
              {comparison.removedCleaningTypes.map((item) => item.name).join(', ')}
            </p>
          ) : null}
          {comparison.declaredSessionPrice && comparison.retainedSessionPrice ? (
            <dl className="mt-2">
              <SummaryRow label={t.declaredPrice}>{formatXof(comparison.declaredSessionPrice)}</SummaryRow>
              <SummaryRow label={t.retainedPrice}>{formatXof(comparison.retainedSessionPrice)}</SummaryRow>
            </dl>
          ) : null}
        </>
      )}
    </div>
  );
}

type Panel = 'none' | 'accept' | 'decline';

function QuoteActions({
  request,
  quote,
  role,
  onChanged,
  onAccepted,
}: {
  request: CleaningRequest;
  quote: Quote;
  role: OrganizationRole;
  onChanged: () => void;
  onAccepted: (result: AcceptResult) => void;
}) {
  const [panel, setPanel] = useState<Panel>('none');
  const [terms, setTerms] = useState(false);
  const [startDate, setStartDate] = useState('');
  const [reason, setReason] = useState<DeclineReason | ''>('');
  const [comment, setComment] = useState('');
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<CleaningErrorView | null>(null);
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const acceptSubmission = useRef(idempotentSubmission());
  const declineSubmission = useRef(idempotentSubmission());

  if (role === 'org_viewer')
    return (
      <FormMessage tone="info" className="mt-6">
        {requestTexts.readOnly}
      </FormMessage>
    );
  const isMember = role === 'org_member';
  const termsHref = cleaningPaths.terms(quote.termsVersion);
  const maxStart = quote.validUntil ? beninDate(new Date(quote.validUntil)) : undefined;

  async function accept() {
    if (!terms) {
      setFieldError(t.termsRequired);
      return;
    }
    setFieldError(null);
    setBusy(true);
    setProblem(null);
    const body = {
      acceptTerms: true as const,
      termsVersion: quote.termsVersion,
      ...(startDate ? { startDate } : {}),
    };
    try {
      const result = await acceptQuote(quote.id, body, acceptSubmission.current.keyFor(body));
      acceptSubmission.current.done();
      onAccepted(result);
      onChanged();
    } catch (error) {
      const view = describeCleaningError(error);
      if (view.code === 'CLEANING_IDEMPOTENCY_KEY_REUSED') acceptSubmission.current.done();
      setProblem(view);
      if (view.code === 'CLEANING_QUOTE_EXPIRED' || view.kind === 'stale') onChanged();
    } finally {
      setBusy(false);
    }
  }

  async function decline() {
    setBusy(true);
    setProblem(null);
    const body = {
      ...(reason ? { reasonCode: reason } : {}),
      ...(comment.trim() ? { comment: comment.trim() } : {}),
    };
    try {
      await declineQuote(quote.id, body, declineSubmission.current.keyFor(body));
      declineSubmission.current.done();
      setNotice(t.declined);
      onChanged();
    } catch (error) {
      const view = describeCleaningError(error);
      if (view.code === 'CLEANING_IDEMPOTENCY_KEY_REUSED') declineSubmission.current.done();
      setProblem(view);
      if (view.kind === 'stale') onChanged();
    } finally {
      setBusy(false);
    }
  }

  async function forward() {
    setBusy(true);
    setProblem(null);
    try {
      await forwardQuote(quote.id);
      setNotice(t.forwarded);
    } catch (error) {
      setProblem(describeCleaningError(error));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="border-line mt-8 grid gap-5 border-t pt-6">
      {request.warnings.includes('organization_unpaid_invoices') ? (
        <FormMessage tone="info">{requestTexts.warningsUnpaid}</FormMessage>
      ) : null}

      {isMember ? (
        <div className="grid justify-items-start gap-3">
          <Button variant="action" size="lg" disabled aria-describedby="devis-membre">
            {t.accept}
          </Button>
          <p id="devis-membre" className="text-small text-ink-muted max-w-xl">
            {t.memberCannotAccept}
          </p>
          <Button variant="secondary" onClick={() => void forward()} disabled={busy}>
            {busy ? t.forwarding : t.forward}
          </Button>
        </div>
      ) : panel === 'none' ? (
        <div className="flex flex-col gap-3 sm:flex-row">
          <Button variant="action" size="lg" onClick={() => setPanel('accept')}>
            {t.accept}
          </Button>
          <Button variant="secondary" size="lg" onClick={() => setPanel('decline')}>
            {t.decline}
          </Button>
        </div>
      ) : panel === 'accept' ? (
        <form
          className="swap-in rounded-card border-action-muted bg-action-soft/40 grid gap-5 border p-4 sm:p-6"
          onSubmit={(event) => {
            event.preventDefault();
            void accept();
          }}
          noValidate
        >
          <h3 className="font-display text-ink text-lg font-semibold">{t.acceptTitle}</h3>
          <div>
            <label className="flex min-h-11 cursor-pointer items-start gap-3">
              <input
                type="checkbox"
                className="accent-action mt-1 size-5 shrink-0"
                checked={terms}
                onChange={(event) => setTerms(event.target.checked)}
                aria-invalid={fieldError ? true : undefined}
                aria-describedby={fieldError ? 'devis-cg-erreur' : undefined}
              />
              <span className="text-ink">
                {t.acceptTerms}{' '}
                <Link
                  href={termsHref}
                  target="_blank"
                  className="text-brand-ink font-semibold underline underline-offset-4"
                >
                  {t.termsLink}
                </Link>{' '}
                <span className="text-ink-muted text-small">{t.termsVersion(quote.termsVersion)}</span>
              </span>
            </label>
            {fieldError ? (
              <p id="devis-cg-erreur" className="text-small text-danger mt-2 font-medium">
                {fieldError}
              </p>
            ) : null}
          </div>
          <TextField
            id="devis-debut"
            type="date"
            label={t.startDate}
            hint={t.startDateHint}
            value={startDate}
            min={beninDate()}
            max={maxStart}
            onChange={(event) => setStartDate(event.target.value)}
            error={problem?.code === 'CLEANING_LEAD_TIME_TOO_SHORT' ? problem.message : null}
            className="sm:max-w-xs"
          />
          <div className="flex flex-col gap-3 sm:flex-row">
            <Button type="submit" variant="action" size="lg" disabled={busy}>
              {busy ? t.accepting : t.acceptConfirm}
            </Button>
            <Button variant="ghost" onClick={() => setPanel('none')} disabled={busy}>
              {t.cancel}
            </Button>
          </div>
        </form>
      ) : (
        <form
          className="swap-in rounded-card border-line bg-surface-muted grid gap-5 border p-4 sm:p-6"
          onSubmit={(event) => {
            event.preventDefault();
            void decline();
          }}
        >
          <h3 className="font-display text-ink text-lg font-semibold">{t.declineTitle}</h3>
          <p className="text-ink">{t.declineText}</p>
          <SelectField
            id="devis-refus-motif"
            label={t.declineReason}
            value={reason}
            onChange={(event) => setReason(event.target.value as DeclineReason | '')}
            className="sm:max-w-sm"
          >
            <option value="">—</option>
            {(Object.keys(t.declineReasons) as DeclineReason[]).map((code) => (
              <option key={code} value={code}>
                {t.declineReasons[code]}
              </option>
            ))}
          </SelectField>
          <TextAreaField
            id="devis-refus-precision"
            label={t.declineComment}
            value={comment}
            maxLength={1000}
            rows={3}
            onChange={(event) => setComment(event.target.value)}
          />
          <div className="flex flex-col gap-3 sm:flex-row">
            <Button type="submit" variant="primary" size="lg" disabled={busy}>
              {busy ? t.declining : t.declineConfirm}
            </Button>
            <Button variant="ghost" onClick={() => setPanel('none')} disabled={busy}>
              {t.cancel}
            </Button>
          </div>
        </form>
      )}

      {notice ? <FormMessage tone="success">{notice}</FormMessage> : null}
      {problem && problem.code !== 'CLEANING_LEAD_TIME_TOO_SHORT' ? (
        <FormMessage>
          {problem.kind === 'forbidden' ? requestTexts.readOnly : errorWithReference(problem)}
        </FormMessage>
      ) : null}
    </div>
  );
}

/** Versions précédentes du devis, repliées. */
export function QuoteHistory({ quotes }: { quotes: ReadonlyArray<Quote> }) {
  if (!quotes.length) return null;
  return (
    <details className="rounded-panel border-line bg-surface border shadow-xs">
      <summary className="text-ink flex min-h-14 cursor-pointer items-center px-5 font-semibold sm:px-8">
        {t.history(quotes.length)}
      </summary>
      <div className="disclosure-body grid gap-8 px-5 pb-6 sm:px-8">
        {quotes.map((quote) => (
          <article key={quote.id} className="border-line grid gap-4 border-t pt-6">
            <p className="text-ink flex flex-wrap items-center gap-3 font-semibold">
              {t.version(quoteKind(quote.kind), quote.version)}
              <Badge tone={quoteStatus(quote.status).tone}>{quoteStatus(quote.status).label}</Badge>
              {quote.sentAt ? (
                <span className="text-small text-ink-muted font-normal">{formatDate(quote.sentAt)}</span>
              ) : null}
            </p>
            <QuoteBody quote={quote} />
          </article>
        ))}
      </div>
    </details>
  );
}
