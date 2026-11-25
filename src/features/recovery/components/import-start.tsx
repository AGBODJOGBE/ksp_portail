'use client';

import { useRouter } from 'next/navigation';
import { useRef, useState } from 'react';
import { BackendPending } from '@/components/ui/backend-pending';
import { Button, ButtonLink } from '@/components/ui/button';
import { FieldError, FormMessage, inputClasses } from '@/components/ui/field';
import { ChoicePill, Fieldset, Panel } from '@/components/ui/form-fields';
import { IconCheck } from '@/components/ui/icons';
import { isBackendPending } from '@/lib/api';
import { beninDate } from '@/lib/format';
import { idempotentSubmission } from '@/lib/idempotency';
import { uploadFile } from '@/features/file';
import { useReadOnly } from '@/features/identity';
import { describeRecoveryError, errorWithReference } from '@/features/recovery/errors';
import { createImport } from '@/features/recovery/import-api';
import {
  type ImportCheck,
  IMPORT_MAX_BYTES,
  TEMPLATE_COLUMNS,
  TEMPLATE_FILE_NAME,
  checkImportFile,
  importContentType,
  templateCsv,
} from '@/features/recovery/import-check';
import { COLUMN_HELP, fileMessage, importTexts as t, lineMessage } from '@/features/recovery/import-texts';
import { recoveryPaths } from '@/features/recovery/paths';

/** Lignes en erreur affichées au plus ; les suivantes sont comptées. */
const SHOWN_ERRORS = 50;

/** Modèle en adresse `data:` : un vrai lien de téléchargement, sans fichier à tenir à jour à côté. */
const TEMPLATE_HREF = `data:text/csv;charset=utf-8,${encodeURIComponent(templateCsv())}`;

/**
 * « Importer un tableur » (`/mon-espace/recouvrement/import`, solution 1 du 25 novembre 2026) : modèle CSV à
 * télécharger, vérification du fichier dans le navigateur (colonnes, montants, dates, téléphones, natures,
 * 1 000 lignes, 5 Mo ; un XLSX n'est contrôlé que par KSP), puis envoi : dépôt par file
 * (`recovery_import`) et contrôle par recovery (`POST /recovery/imports`), qui mène au résultat.
 */
export function ImportStart() {
  const readOnly = useReadOnly();
  return (
    <div className="grid gap-8">
      <Template />
      {readOnly ? <FormMessage tone="info">{t.readOnly}</FormMessage> : <ImportForm />}
    </div>
  );
}

function Template() {
  return (
    <Panel id="import-modele" title={t.templateTitle}>
      <div className="grid gap-5">
        <p className="text-ink-muted max-w-3xl">{t.templateLead}</p>
        <a
          href={TEMPLATE_HREF}
          download={TEMPLATE_FILE_NAME}
          className="bg-action text-on-action focus-visible:outline-focus font-display inline-flex min-h-11 items-center justify-center justify-self-start rounded-full px-5 font-semibold focus-visible:outline-2 focus-visible:outline-offset-2"
        >
          {t.templateDownload}
        </a>
        <details>
          <summary className="text-brand-ink min-h-11 cursor-pointer py-2 font-semibold">
            {t.columnsTitle}
          </summary>
          <ol className="mt-3 grid gap-2">
            {TEMPLATE_COLUMNS.map((column, index) => {
              const help = COLUMN_HELP[column];
              return (
                <li key={column} className="border-line grid gap-0.5 border-b pb-2 last:border-b-0">
                  <p className="flex flex-wrap items-baseline gap-x-2">
                    <span className="text-ink-subtle tabular-nums">{index + 1}.</span>
                    <code className="text-ink font-semibold break-all">{column}</code>
                    <span className="text-ink">{help.label}</span>
                    <span className="text-small text-ink-muted">
                      ({help.required ? t.required : t.optional})
                    </span>
                  </p>
                  <p className="text-small text-ink-muted">{help.help}</p>
                </li>
              );
            })}
          </ol>
        </details>
      </div>
    </Panel>
  );
}

/** Résultat de la vérification dans le navigateur. */
function CheckResult({ check }: { check: ImportCheck }) {
  if (check.status === 'refused') return <FormMessage>{fileMessage(check.code)}</FormMessage>;
  if (check.status === 'unchecked') return <FormMessage tone="info">{t.xlsxUnchecked}</FormMessage>;
  if (!check.invalid.length) {
    return (
      <div className="grid gap-2">
        <FormMessage tone="success">{t.checkedOk(check.rows)}</FormMessage>
        <p className="text-small text-ink-muted">{t.minimumNote}</p>
      </div>
    );
  }
  const shown = check.invalid.slice(0, SHOWN_ERRORS);
  return (
    <div className="grid gap-3">
      <FormMessage>{t.checkedErrors(check.invalid.length, check.rows)}</FormMessage>
      <p className="text-small text-ink-muted">{t.rowHint}</p>
      <ul className="grid gap-2" aria-label={t.invalidTitle}>
        {shown.map((line) => (
          <li
            key={line.row}
            className="rounded-control border-danger/30 bg-danger-soft/40 grid gap-1 border p-3"
          >
            <p className="text-ink font-semibold">{t.row(line.row)}</p>
            <ul className="text-small text-ink grid list-disc gap-0.5 pl-5">
              {line.issues.map((issue) => (
                <li key={`${issue.field}-${issue.code}`}>
                  <code className="font-semibold">{issue.field}</code> : {lineMessage(issue.code)}
                </li>
              ))}
            </ul>
          </li>
        ))}
      </ul>
      {check.invalid.length > shown.length ? (
        <p className="text-small text-ink-muted">{t.moreErrors(check.invalid.length - shown.length)}</p>
      ) : null}
    </div>
  );
}

const ready = (check: ImportCheck | null) =>
  !!check && (check.status === 'unchecked' || (check.status === 'checked' && !check.invalid.length));

function ImportForm() {
  const router = useRouter();
  const submission = useRef(idempotentSubmission());
  const [kind, setKind] = useState<'b2b' | 'b2c' | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [check, setCheck] = useState<ImportCheck | null>(null);
  const [checking, setChecking] = useState(false);
  const [step, setStep] = useState<'idle' | 'uploading' | 'analysing'>('idle');
  const [fields, setFields] = useState<{ kind?: string; file?: string }>({});
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const busy = step !== 'idle';

  async function choose(chosen: File | null) {
    setFile(chosen);
    setCheck(null);
    setError(null);
    setFields((previous) => ({ ...previous, file: undefined }));
    if (!chosen) return;
    setChecking(true);
    // Un fichier trop lourd n'est pas lu : seul son poids compte.
    const bytes =
      chosen.size <= IMPORT_MAX_BYTES && chosen.name.toLowerCase().endsWith('.csv')
        ? new Uint8Array(await chosen.arrayBuffer())
        : null;
    setCheck(checkImportFile(chosen, bytes, beninDate()));
    setChecking(false);
  }

  async function send() {
    const problems = {
      ...(!kind ? { kind: t.kindRequired } : {}),
      ...(!file ? { file: t.fileRequired } : {}),
    };
    setFields(problems);
    if (problems.kind) {
      document.querySelector<HTMLInputElement>('input[name="import-type"]')?.focus();
      return;
    }
    if (problems.file || !file || !kind || !check || !ready(check) || check.status === 'refused') {
      document.getElementById('import-fichier')?.focus();
      return;
    }
    setError(null);
    setStep('uploading');
    try {
      const stored = await uploadFile(file, 'recovery_import', undefined, importContentType(check.format));
      setStep('analysing');
      const body = { kind, fileId: stored.id };
      const created = await createImport(body, submission.current.keyFor(body));
      submission.current.done();
      router.push(recoveryPaths.importDetail(created.id));
    } catch (caught) {
      setStep('idle');
      if (isBackendPending(caught)) {
        setPending(true);
        return;
      }
      const view = describeRecoveryError(caught);
      if (view.kind === 'newKey') submission.current.done();
      setError(errorWithReference(view));
    }
  }

  return (
    <>
      <Panel id="import-fichier-titre" title={t.fileTitle}>
        <div className="grid gap-6">
          <Fieldset id="import-type" legend={t.kindLegend} error={fields.kind}>
            <div className="grid gap-3 sm:grid-cols-2">
              {(['b2b', 'b2c'] as const).map((value) => (
                <ChoicePill
                  key={value}
                  name="import-type"
                  value={value}
                  checked={kind === value}
                  onChange={() => {
                    setKind(value);
                    setFields((previous) => ({ ...previous, kind: undefined }));
                  }}
                  label={t.kinds[value].label}
                  hint={t.kinds[value].hint}
                  disabled={busy}
                />
              ))}
            </div>
          </Fieldset>
          <div>
            <label htmlFor="import-fichier" className="text-ink block font-semibold">
              {t.fileLabel}
            </label>
            <input
              id="import-fichier"
              type="file"
              accept=".csv,.xlsx,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
              disabled={busy}
              aria-invalid={fields.file ? true : undefined}
              aria-describedby={fields.file ? 'import-fichier-erreur' : undefined}
              onChange={(event) => void choose(event.target.files?.[0] ?? null)}
              className={inputClasses({
                invalid: !!fields.file,
                className:
                  'file:bg-surface-muted file:text-ink mt-2 py-2 file:mr-3 file:rounded-full file:border-0 file:px-4 file:py-2 file:font-semibold',
              })}
            />
            {fields.file ? <FieldError id="import-fichier-erreur">{fields.file}</FieldError> : null}
          </div>
          <div aria-live="polite" className="grid gap-3">
            {checking ? <p className="text-small text-ink-muted">{t.checking}</p> : null}
            {check && file ? <CheckResult check={check} /> : null}
          </div>
        </div>
      </Panel>
      {pending ? (
        <BackendPending
          id="import-envoi-attente"
          title={t.sendPendingTitle}
          needs={[
            {
              method: 'POST',
              path: '/api/v1/recovery/imports',
              purpose: 'Contrôle du tableur déposé par file (finalité recovery_import), Idempotency-Key.',
            },
          ]}
        >
          {t.sendPendingText}{' '}
          <ButtonLink href={recoveryPaths.newCase} variant="secondary" className="mt-3">
            {t.newCase}
          </ButtonLink>
        </BackendPending>
      ) : (
        <Panel id="import-envoi" title={t.sendTitle}>
          <div className="grid gap-4">
            <p className="text-ink-muted max-w-3xl">{t.sendLead}</p>
            <FormMessage>{error}</FormMessage>
            <div aria-live="polite">
              {step === 'uploading' ? <p className="text-small text-ink-muted">{t.uploading}</p> : null}
              {step === 'analysing' ? <p className="text-small text-ink-muted">{t.analysing}</p> : null}
            </div>
            <Button
              variant="action"
              className="justify-self-start"
              onClick={() => void send()}
              disabled={busy || (!!check && !ready(check))}
              aria-busy={busy || undefined}
            >
              {ready(check) ? <IconCheck className="size-4" /> : null}
              {busy ? t.uploading : t.send}
            </Button>
          </div>
        </Panel>
      )}
    </>
  );
}
