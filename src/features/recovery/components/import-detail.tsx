'use client';

import Link from 'next/link';
import { useCallback, useRef, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button, ButtonLink } from '@/components/ui/button';
import { FormMessage, TextField } from '@/components/ui/field';
import { Panel, SelectField } from '@/components/ui/form-fields';
import { FigureTile } from '@/components/ui/figure-tile';
import { SkeletonCards } from '@/components/ui/skeleton';
import { formatDateTime, formatXof } from '@/lib/format';
import { idempotentSubmission } from '@/lib/idempotency';
import { useResource } from '@/lib/use-resource';
import { useReadOnly } from '@/features/identity';
import { listCases } from '@/features/recovery/api';
import { describeRecoveryError, errorWithReference } from '@/features/recovery/errors';
import { confirmImport, getImport, updateImportLine } from '@/features/recovery/import-api';
import {
  IMPORT_DEBTOR_KINDS,
  IMPORT_NATURES,
  TEMPLATE_COLUMNS,
  type TemplateColumn,
  importAmount,
} from '@/features/recovery/import-check';
import type { ImportLine, ImportValues, RecoveryCaseImport } from '@/features/recovery/import-schemas';
import {
  COLUMN_HELP,
  importStatus,
  importTexts as t,
  lineMessage,
  lineStatus,
} from '@/features/recovery/import-texts';
import { recoveryPaths } from '@/features/recovery/paths';
import { DEBTOR_KINDS, natureLabel } from '@/features/recovery/texts';

const CARD = 'rounded-panel border-line bg-surface grid gap-4 border p-5 shadow-xs sm:p-7';
const LINK = 'text-brand-ink inline-flex min-h-11 items-center font-semibold underline underline-offset-4';

/** `debtor_phone` (erreur de recovery) → `debtorPhone` (colonne du modèle). */
const columnOf = (field: string) => field.replace(/_([a-z])/g, (_, letter: string) => letter.toUpperCase());

const valueOf = (values: ImportValues, column: TemplateColumn) => values[column] ?? '';

/** Résumé d'une ligne : débiteur, facture, montant, échéance. */
function LineSummary({ line }: { line: ImportLine }) {
  const values = line.values;
  const amount = importAmount(valueOf(values, 'amount'));
  return (
    <span className="grid min-w-0 gap-0.5">
      <span className="text-ink font-medium break-words">
        {t.debtorOf(
          [valueOf(values, 'debtorFirstNames'), valueOf(values, 'debtorName')].filter(Boolean).join(' ') ||
            '—',
          valueOf(values, 'debtorPhone'),
        )}
      </span>
      <span className="text-small text-ink-muted break-words">
        {t.invoiceOf(
          valueOf(values, 'invoiceReference'),
          amount ? formatXof(amount) : valueOf(values, 'amount'),
          valueOf(values, 'dueDate'),
        )}
      </span>
    </span>
  );
}

/**
 * Résultat d'un import (`/mon-espace/recouvrement/import/[id]`) : lignes lues, valides et à corriger,
 * dossiers prévus ; correction ou mise de côté d'une ligne (`PUT …/lines/{row}`, contrôlée de nouveau par
 * recovery) ; confirmation (`POST …/confirm`, un brouillon par débiteur) ; puis les brouillons créés, à
 * compléter un par un (pièces, mandat, frais de dossier).
 */
export function ImportDetail({ id }: { id: string }) {
  const { state, reload, set } = useResource(useCallback(() => getImport(id), [id]));
  const readOnly = useReadOnly();
  const [notice, setNotice] = useState<string | null>(null);

  if (state.status === 'loading') return <SkeletonCards label={t.loading} rows={3} />;
  if (state.status === 'error') {
    const view = describeRecoveryError(state.error);
    return (
      <div className={`${CARD} justify-items-start`}>
        <FormMessage>{view.kind === 'notFound' ? t.notFound : errorWithReference(view)}</FormMessage>
        {view.kind === 'notFound' ? (
          <Link href={recoveryPaths.imports} className={LINK}>
            {t.again}
          </Link>
        ) : (
          <Button variant="secondary" onClick={reload}>
            {t.retry}
          </Button>
        )}
      </div>
    );
  }

  const report = state.data;
  const status = importStatus(report.status);
  const invalid = report.lines.filter((line) => line.status === 'invalid');
  const valid = report.lines.filter((line) => line.status === 'valid');
  const ignored = report.lines.filter((line) => line.status === 'ignored');
  const update = (next: RecoveryCaseImport, message: string) => {
    set(next);
    setNotice(message);
  };

  return (
    <div className="grid gap-8">
      <div className="flex flex-wrap items-center gap-3">
        <Badge tone={status.tone} dot>
          {status.label}
        </Badge>
        <span className="text-small text-ink-muted">
          {`${t.kindOf(report.kind)} · ${t.createdOn(formatDateTime(report.createdAt))}`}
        </span>
      </div>
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <FigureTile label={t.linesTotal} value={String(report.linesTotal)} />
        <FigureTile label={t.linesValid} value={String(report.linesValid)} />
        <FigureTile label={t.linesInvalid} value={String(report.linesInvalid)} />
        <FigureTile label={t.casesPlanned} value={String(report.casesPlanned)} />
      </div>
      <FormMessage tone="success">{notice}</FormMessage>

      {report.status === 'confirmed' ? (
        <CreatedDrafts caseIds={report.caseIds} />
      ) : report.status === 'expired' ? (
        <div className={`${CARD} justify-items-start`}>
          <FormMessage tone="info">{t.expired}</FormMessage>
          <ButtonLink href={recoveryPaths.imports} variant="secondary">
            {t.again}
          </ButtonLink>
        </div>
      ) : (
        <>
          <Panel id="import-a-corriger" title={t.invalidTitle}>
            {invalid.length ? (
              <ul className="grid gap-4">
                {invalid.map((line) => (
                  <InvalidLine
                    key={line.row}
                    importId={report.id}
                    line={line}
                    readOnly={readOnly}
                    onUpdated={update}
                  />
                ))}
              </ul>
            ) : (
              <p className="text-ink-muted">{t.invalidNone}</p>
            )}
          </Panel>
          {readOnly ? (
            <FormMessage tone="info">{t.readOnly}</FormMessage>
          ) : (
            <Confirm report={report} onConfirmed={(next) => set(next)} onStale={reload} />
          )}
        </>
      )}

      {valid.length ? <LineGroup title={`${t.validTitle} (${valid.length})`} lines={valid} /> : null}
      {ignored.length ? <LineGroup title={`${t.ignoredTitle} (${ignored.length})`} lines={ignored} /> : null}
    </div>
  );
}

function LineGroup({ title, lines }: { title: string; lines: ImportLine[] }) {
  return (
    <details className="rounded-panel border-line bg-surface border p-5 shadow-xs sm:p-7">
      <summary className="font-display text-ink min-h-11 cursor-pointer text-lg font-semibold">
        {title}
      </summary>
      <ul className="mt-4 grid gap-2">
        {lines.map((line) => {
          const status = lineStatus(line.status);
          return (
            <li
              key={line.row}
              className="border-line flex flex-wrap items-center justify-between gap-x-4 gap-y-1 border-b py-2 last:border-b-0"
            >
              <span className="flex min-w-0 items-start gap-3">
                <span className="text-small text-ink-subtle w-16 shrink-0 tabular-nums">
                  {t.row(line.row)}
                </span>
                <LineSummary line={line} />
              </span>
              <Badge tone={status.tone}>{status.label}</Badge>
            </li>
          );
        })}
      </ul>
    </details>
  );
}

/** Ligne refusée par recovery : ses erreurs, puis la correction en ligne ou la mise de côté. */
function InvalidLine({
  importId,
  line,
  readOnly,
  onUpdated,
}: {
  importId: string;
  line: ImportLine;
  readOnly: boolean;
  onUpdated: (next: RecoveryCaseImport, message: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [values, setValues] = useState<Record<TemplateColumn, string>>(
    () =>
      Object.fromEntries(TEMPLATE_COLUMNS.map((column) => [column, valueOf(line.values, column)])) as Record<
        TemplateColumn,
        string
      >,
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const errorsByColumn = new Map(line.errors.map((item) => [columnOf(item.field), lineMessage(item.code)]));
  const prefix = `ligne-${line.row}`;

  async function save(body: { values: ImportValues } | { ignore: true }, message: string) {
    setBusy(true);
    setError(null);
    try {
      const next = await updateImportLine(importId, line.row, body);
      setBusy(false);
      setEditing(false);
      onUpdated(next, message);
    } catch (caught) {
      setBusy(false);
      setError(errorWithReference(describeRecoveryError(caught)));
    }
  }

  return (
    <li className="rounded-card border-l-danger border-line bg-surface grid gap-3 border border-l-4 p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <span className="flex min-w-0 items-start gap-3">
          <span className="text-ink w-16 shrink-0 font-semibold tabular-nums">{t.row(line.row)}</span>
          <LineSummary line={line} />
        </span>
        <Badge tone="danger">{lineStatus(line.status).label}</Badge>
      </div>
      <ul className="text-small text-ink grid list-disc gap-0.5 pl-5">
        {line.errors.map((item) => (
          <li key={`${item.field}-${item.code}`}>
            <span className="font-semibold">
              {COLUMN_HELP[columnOf(item.field) as TemplateColumn]?.label ?? item.field}
            </span>
            {` : ${lineMessage(item.code)}`}
          </li>
        ))}
      </ul>
      {readOnly ? null : editing ? (
        <form
          noValidate
          className="rounded-control border-line bg-surface-muted grid gap-4 border p-4"
          aria-label={t.editLegend(line.row)}
          onSubmit={(event) => {
            event.preventDefault();
            void save({ values }, t.lineSaved(line.row));
          }}
        >
          <div className="grid gap-4 sm:grid-cols-2">
            {TEMPLATE_COLUMNS.map((column) => {
              const label = COLUMN_HELP[column].label;
              const fieldError = errorsByColumn.get(column) ?? null;
              const change = (value: string) => setValues((previous) => ({ ...previous, [column]: value }));
              if (column === 'debtorKind' || column === 'nature') {
                const options: ReadonlyArray<readonly [string, string]> =
                  column === 'debtorKind'
                    ? IMPORT_DEBTOR_KINDS.map((value) => [value, DEBTOR_KINDS[value] ?? value] as const)
                    : IMPORT_NATURES.map((value) => [value, natureLabel(value)] as const);
                return (
                  <SelectField
                    key={column}
                    id={`${prefix}-${column}`}
                    label={label}
                    error={fieldError}
                    value={values[column]}
                    onChange={(event) => change(event.target.value)}
                  >
                    {column === 'debtorKind' && !options.some(([value]) => value === values[column]) ? (
                      <option value={values[column]}>{values[column] || '—'}</option>
                    ) : null}
                    {options.map(([value, text]) => (
                      <option key={value} value={value}>
                        {text}
                      </option>
                    ))}
                  </SelectField>
                );
              }
              return (
                <TextField
                  key={column}
                  id={`${prefix}-${column}`}
                  label={label}
                  hint={
                    column === 'dueDate' || column === 'debtorPhone' || column === 'amount'
                      ? COLUMN_HELP[column].help
                      : undefined
                  }
                  error={fieldError}
                  value={values[column]}
                  maxLength={300}
                  onChange={(event) => change(event.target.value)}
                />
              );
            })}
          </div>
          <FormMessage>{error}</FormMessage>
          <div className="flex flex-wrap gap-3">
            <Button type="submit" variant="action" disabled={busy} aria-busy={busy || undefined}>
              {busy ? t.saving : t.save}
            </Button>
            <Button type="button" variant="ghost" onClick={() => setEditing(false)} disabled={busy}>
              {t.cancel}
            </Button>
          </div>
        </form>
      ) : (
        <div className="grid gap-2">
          <FormMessage>{error}</FormMessage>
          <div className="flex flex-wrap gap-3">
            <Button variant="secondary" onClick={() => setEditing(true)} disabled={busy}>
              {t.edit}
            </Button>
            <Button
              variant="ghost"
              onClick={() => void save({ ignore: true }, t.lineIgnored(line.row))}
              disabled={busy}
              aria-busy={busy || undefined}
            >
              {t.ignore}
            </Button>
          </div>
        </div>
      )}
    </li>
  );
}

/** Confirmation : un brouillon par débiteur ; bloquée tant qu'une ligne reste à corriger. */
function Confirm({
  report,
  onConfirmed,
  onStale,
}: {
  report: RecoveryCaseImport;
  onConfirmed: (next: RecoveryCaseImport) => void;
  onStale: () => void;
}) {
  const submission = useRef(idempotentSubmission());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const blocked = report.linesInvalid > 0;
  const nothing = report.linesValid === 0 || report.casesPlanned === 0;

  async function confirm() {
    setBusy(true);
    setError(null);
    try {
      const next = await confirmImport(report.id, submission.current.keyFor({ confirm: report.id }));
      submission.current.done();
      setBusy(false);
      onConfirmed(next);
    } catch (caught) {
      setBusy(false);
      const view = describeRecoveryError(caught);
      if (view.kind === 'newKey') submission.current.done();
      setError(errorWithReference(view));
      if (view.kind === 'stale') onStale();
    }
  }

  return (
    <Panel id="import-confirmer" title={t.confirmTitle} className="border-l-action border-l-4">
      <div className="grid gap-4">
        <p className="text-ink">{nothing ? t.confirmNothing : t.confirmLead(report.casesPlanned)}</p>
        {blocked ? <p className="text-small text-ink-muted">{t.confirmBlocked}</p> : null}
        <FormMessage>{error}</FormMessage>
        <Button
          variant="action"
          className="justify-self-start"
          onClick={() => void confirm()}
          disabled={busy || blocked || nothing}
          aria-busy={busy || undefined}
        >
          {busy ? t.confirming : t.confirm}
        </Button>
      </div>
    </Panel>
  );
}

/** Brouillons créés : numéro et débiteur lus dans la liste des brouillons (100 au plus). */
function CreatedDrafts({ caseIds }: { caseIds: string[] }) {
  const { state } = useResource(useCallback(() => listCases({ status: 'draft' }), []));
  const byId = new Map(
    state.status === 'ready' ? state.data.cases.map((summary) => [summary.id, summary]) : [],
  );
  return (
    <Panel id="import-brouillons" title={t.createdTitle} className="border-l-action border-l-4">
      <div className="grid gap-5">
        <p className="text-ink">{t.createdLead}</p>
        <ul className="grid gap-2">
          {caseIds.map((caseId) => {
            const summary = byId.get(caseId);
            return (
              <li
                key={caseId}
                className="border-line flex flex-wrap items-center justify-between gap-x-4 gap-y-1 border-b py-2 last:border-b-0"
              >
                <span className="grid gap-0.5">
                  <span className="text-ink font-medium">
                    {summary ? t.createdCase(summary.number) : t.createdUnknown}
                  </span>
                  {summary ? (
                    <span className="text-small text-ink-muted">{`${summary.debtorName} · ${formatXof(summary.due)}`}</span>
                  ) : null}
                </span>
                <Link href={recoveryPaths.case(caseId)} className={LINK}>
                  {t.complete}
                  {summary ? <span className="sr-only">{` : ${summary.number}`}</span> : null}
                </Link>
              </li>
            );
          })}
        </ul>
        <Link href={recoveryPaths.casesWith({ etat: 'brouillon' })} className={LINK}>
          {t.allCases}
        </Link>
      </div>
    </Panel>
  );
}
