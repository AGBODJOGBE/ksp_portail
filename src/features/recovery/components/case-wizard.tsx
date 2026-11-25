'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { type ReactNode, type RefObject, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Button, ButtonLink } from '@/components/ui/button';
import { FormMessage } from '@/components/ui/field';
import { IconCheck } from '@/components/ui/icons';
import { SkeletonCards } from '@/components/ui/skeleton';
import { WizardNav, WizardProgress } from '@/components/ui/wizard';
import { beninDate, formatDateTime, formatXof } from '@/lib/format';
import { idempotentSubmission } from '@/lib/idempotency';
import { useResource } from '@/lib/use-resource';
import { useReadOnly } from '@/features/identity';
import { type CaseInputBody, createCase, getCase, getPreferences, updateCase } from '@/features/recovery/api';
import {
  type CaseDraft,
  INPUT_STEPS,
  STEPS,
  type StepName,
  caseBody,
  checkStep,
  clearDraft,
  emptyDraft,
  readDraft,
  scaleToDraft,
  stepOfField,
  writeDraft,
} from '@/features/recovery/draft';
import {
  type RecoveryErrorView,
  describeRecoveryError,
  errorWithReference,
} from '@/features/recovery/errors';
import { recoveryPaths } from '@/features/recovery/paths';
import type { RecoveryCase } from '@/features/recovery/schemas';
import { recoveryTexts } from '@/features/recovery/texts';
import { wizardTexts as t } from '@/features/recovery/wizard-texts';
import { FeeStep } from './fee-step';
import { MandateStep } from './mandate-step';
import { ClaimsStep, DebtorsStep, EffortStep, EvidenceStep, ReviewStep, TypeStep } from './wizard-steps';

type Problem = { message: string; step?: StepName } | null;

const PANEL = 'rounded-panel border-line bg-surface border p-5 shadow-xs sm:p-8';

/** Barème des préférences pour le type choisi, tant que le créancier n'a pas réglé celui du dossier. */
function usePreferredScale(draft: CaseDraft) {
  const preferences = useResource(getPreferences);
  const prefs = preferences.state.status === 'ready' ? preferences.state.data : null;
  const scale =
    draft.scale ??
    (prefs && draft.kind ? scaleToDraft(draft.kind === 'b2c' ? prefs.b2cScale : prefs.b2bScale) : null);
  return {
    scale,
    status:
      preferences.state.status === 'loading'
        ? ('loading' as const)
        : prefs
          ? ('ready' as const)
          : ('error' as const),
  };
}

/**
 * Assistant « Nouveau dossier » (`/mon-espace/recouvrement/nouveau`) : type et nature, débiteurs,
 * créances avec l'estimation en direct, pièces (service file), démarches et barème prérempli depuis les
 * préférences, récapitulatif et enregistrement du brouillon (`POST /recovery/cases`, clé d'idempotence
 * par contenu ; ensuite `PUT`), mandat (`MandateStep`), frais (`FeeStep`), confirmation. Brouillon de
 * l'onglet (`sessionStorage`) : une recharge du portefeuille ramène à l'étape des frais.
 */
export function CaseWizard() {
  const readOnly = useReadOnly();
  const [initial] = useState<CaseDraft>(() => readDraft() ?? emptyDraft());
  if (readOnly) return <FormMessage tone="info">{t.readOnly}</FormMessage>;
  return <Wizard mode="new" initial={initial} />;
}

/**
 * Modification d'un brouillon, ou réponse à un complément demandé (`PUT /recovery/cases/{id}`, note de
 * réponse) : mêmes étapes de saisie, puis retour à la fiche du dossier.
 */
export function CaseEditor({ initial, recoveryCase }: { initial: CaseDraft; recoveryCase: RecoveryCase }) {
  return <Wizard mode="edit" initial={initial} recoveryCase={recoveryCase} />;
}

function Wizard({
  mode,
  initial,
  recoveryCase: editedCase,
}: {
  mode: 'new' | 'edit';
  initial: CaseDraft;
  recoveryCase?: RecoveryCase;
}) {
  const router = useRouter();
  const [draft, setDraft] = useState<CaseDraft>(initial);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [problem, setProblem] = useState<Problem>(null);
  const [busy, setBusy] = useState(false);
  const [liveCase, setLiveCase] = useState<RecoveryCase | null>(null);
  const [done, setDone] = useState<RecoveryCase | null>(null);
  const [completion, setCompletion] = useState('');
  const submission = useRef(idempotentSubmission());
  const heading = useRef<HTMLHeadingElement>(null);
  const today = useMemo(() => beninDate(), []);
  const preferred = usePreferredScale(draft);
  const effective = useMemo(() => ({ ...draft, scale: preferred.scale }), [draft, preferred.scale]);
  const steps: ReadonlyArray<StepName> = mode === 'new' ? STEPS : INPUT_STEPS;
  const step = draft.step;
  const index = Math.max(0, steps.indexOf(step));
  const completing = editedCase?.status === 'info_requested';

  useEffect(() => {
    if (mode === 'new' && !done) writeDraft(draft);
  }, [mode, draft, done]);

  const update = (patch: Partial<CaseDraft>) => setDraft((current) => ({ ...current, ...patch }));
  const goTo = useCallback((next: StepName) => {
    setErrors({});
    setProblem(null);
    setDraft((current) => ({ ...current, step: next }));
    requestAnimationFrame(() => heading.current?.focus());
  }, []);

  function next() {
    const found = checkStep(effective, step, today);
    setErrors(found);
    if (Object.keys(found).length) {
      requestAnimationFrame(() => document.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus());
      return;
    }
    const following = steps[index + 1];
    if (following) goTo(following);
  }

  function problemOf(view: RecoveryErrorView): Problem {
    if (view.kind === 'forbidden') return { message: recoveryTexts.readOnly };
    if (view.kind === 'belowMinimum') {
      return {
        message: t.belowMinimum(view.minimum === null ? null : formatXof(view.minimum)),
        step: 'claims',
      };
    }
    if (view.kind === 'fields') {
      const first = stepOfField(Object.keys(view.fields)[0] ?? '');
      return { message: `${view.message} ${t.fixStep(t.steps[first])}`, step: first };
    }
    if (view.kind === 'stale') return { message: mode === 'edit' ? t.notEditable : view.message };
    return { message: errorWithReference(view) };
  }

  async function save() {
    const built = caseBody(effective, today);
    if ('errors' in built) {
      const first = stepOfField(Object.keys(built.errors)[0] ?? '');
      setErrors(built.errors);
      setProblem({ message: t.fixStep(t.steps[first]), step: first });
      return;
    }
    const body: CaseInputBody = built.body;
    const serialized = JSON.stringify(body);
    // Brouillon déjà enregistré sans changement : on passe au mandat sans rien renvoyer.
    if (mode === 'new' && draft.caseId && draft.saved === serialized) {
      goTo('mandate');
      return;
    }
    setBusy(true);
    setProblem(null);
    try {
      if (mode === 'edit' && editedCase) {
        const note = completion.trim();
        await updateCase(editedCase.id, {
          input: body,
          ...(completing && note ? { completionNote: note } : {}),
        });
        router.push(recoveryPaths.case(editedCase.id));
        return;
      }
      if (draft.caseId) {
        const updated = await updateCase(draft.caseId, { input: body });
        setLiveCase(updated);
        setDraft((current) => ({ ...current, scale: effective.scale, saved: serialized, step: 'mandate' }));
      } else {
        const created = await createCase(body, submission.current.keyFor(body));
        submission.current.done();
        setLiveCase(created.case);
        setDraft((current) => ({
          ...current,
          scale: effective.scale,
          caseId: created.case.id,
          caseNumber: created.case.number,
          saved: serialized,
          duplicates: created.possibleDuplicates.map((item) => ({
            id: item.id,
            number: item.number,
            debtorName: item.debtorName,
          })),
          step: 'mandate',
        }));
      }
      requestAnimationFrame(() => heading.current?.focus());
    } catch (caught) {
      const view = describeRecoveryError(caught);
      if (view.kind === 'newKey') submission.current.done();
      if (view.kind === 'fields') setErrors(view.fields);
      setProblem(problemOf(view));
    } finally {
      setBusy(false);
    }
  }

  const finish = useCallback((paid: RecoveryCase) => {
    clearDraft();
    setDone(paid);
    requestAnimationFrame(() => heading.current?.focus());
  }, []);

  const toFee = useCallback(
    (ready: RecoveryCase) => {
      setLiveCase(ready);
      if (ready.status === 'awaiting_fee') goTo('fee');
      else finish(ready);
    },
    [goTo, finish],
  );

  if (done) return <Done recoveryCase={done} heading={heading} />;

  const inputStep = INPUT_STEPS.includes(step);
  const saveLabel =
    mode === 'edit'
      ? completing
        ? t.sendCompletion
        : t.saveChanges
      : draft.caseId &&
          draft.saved === JSON.stringify((caseBody(effective, today) as { body?: unknown }).body)
        ? t.next
        : t.save;

  return (
    <div className="grid gap-6">
      <WizardProgress
        steps={steps.map((name) => t.steps[name])}
        index={index}
        progressLabel={t.progress(index + 1, steps.length)}
      />
      {draft.caseNumber && mode === 'new' && inputStep ? (
        <FormMessage tone="info">{t.savedTitle(draft.caseNumber)}</FormMessage>
      ) : null}
      <section aria-labelledby="etape-titre" className={PANEL}>
        <h2
          id="etape-titre"
          ref={heading}
          tabIndex={-1}
          className="font-display text-h2 text-ink font-semibold outline-none"
        >
          {t.steps[step]}
        </h2>
        <p className="text-ink-muted mt-2">{t.stepLeads[step]}</p>

        <div className="swap-in mt-8" key={step}>
          {step === 'type' ? <TypeStep draft={effective} onChange={update} errors={errors} /> : null}
          {step === 'debtors' ? <DebtorsStep draft={effective} onChange={update} errors={errors} /> : null}
          {step === 'claims' ? (
            <ClaimsStep draft={effective} onChange={update} errors={errors} today={today} />
          ) : null}
          {step === 'evidence' ? <EvidenceStep draft={effective} onChange={update} errors={errors} /> : null}
          {step === 'effort' ? (
            <EffortStep
              draft={effective}
              onChange={update}
              errors={errors}
              today={today}
              scaleState={preferred.status}
            />
          ) : null}
          {step === 'review' ? (
            <div className="grid gap-6">
              {completing && editedCase?.reviewNote ? (
                <div className="rounded-card border-warning bg-warning-soft grid gap-1 border p-4">
                  <p className="text-ink font-semibold">{t.requestedNote}</p>
                  <p className="text-ink whitespace-pre-line">{editedCase.reviewNote}</p>
                </div>
              ) : null}
              {mode === 'edit' && editedCase?.mandate?.status === 'pending_signature' ? (
                <FormMessage tone="info">{t.mandateReset}</FormMessage>
              ) : null}
              <ReviewStep
                draft={effective}
                onEdit={goTo}
                completion={completing ? { value: completion, onChange: setCompletion } : undefined}
              />
            </div>
          ) : null}
          {(step === 'mandate' || step === 'fee') && draft.caseId ? (
            <SavedCase caseId={draft.caseId} known={liveCase}>
              {(recoveryCase, reload) =>
                step === 'mandate' ? (
                  <div className="grid gap-6">
                    <MandateStep
                      recoveryCase={recoveryCase}
                      duplicates={draft.duplicates}
                      onReady={toFee}
                      onFix={goTo}
                      onPrepared={setLiveCase}
                    />
                    {recoveryCase.status === 'draft' && !recoveryCase.mandate ? (
                      <Button variant="ghost" className="justify-self-start" onClick={() => goTo('review')}>
                        {`${t.back} : ${t.steps.review}`}
                      </Button>
                    ) : null}
                  </div>
                ) : recoveryCase.status === 'awaiting_fee' ? (
                  <FeeStep
                    recoveryCase={recoveryCase}
                    returnTo={recoveryPaths.newCase}
                    onPaid={(paid) => finish(paid)}
                    onStale={reload}
                  />
                ) : recoveryCase.status === 'draft' ? (
                  <Button variant="secondary" onClick={() => goTo('mandate')}>
                    {t.steps.mandate}
                  </Button>
                ) : (
                  <FinishNow recoveryCase={recoveryCase} onFinish={finish} />
                )
              }
            </SavedCase>
          ) : null}
        </div>

        {problem ? (
          <div className="mt-8 grid justify-items-start gap-3">
            <FormMessage>{problem.message}</FormMessage>
            {problem.step && problem.step !== step ? (
              <Button variant="secondary" onClick={() => problem.step && goTo(problem.step)}>
                {`${t.goToStep} : ${t.steps[problem.step]}`}
              </Button>
            ) : null}
          </div>
        ) : null}
      </section>

      {inputStep ? (
        <WizardNav
          showBack={index > 0}
          busy={busy}
          backLabel={t.back}
          nextLabel={step === 'review' ? (busy ? t.saving : saveLabel) : t.next}
          arrow={step !== 'review'}
          onBack={() => {
            const previous = steps[index - 1];
            if (previous) goTo(previous);
          }}
          onNext={step === 'review' ? () => void save() : next}
        />
      ) : null}
      {mode === 'new' && inputStep ? (
        <div className="grid justify-items-center gap-1 text-center">
          <button
            type="button"
            className="text-small text-ink-muted inline-flex min-h-11 items-center underline underline-offset-4"
            onClick={() => {
              clearDraft();
              submission.current.done();
              setLiveCase(null);
              setErrors({});
              setProblem(null);
              setDraft(emptyDraft());
            }}
          >
            {t.restart}
          </button>
          <p className="text-small text-ink-subtle max-w-md">{t.restartConfirm}</p>
        </div>
      ) : null}
    </div>
  );
}

/** Dossier enregistré, lu par la gateway au besoin (reprise de l'assistant après une recharge). */
function SavedCase({
  caseId,
  known,
  children,
}: {
  caseId: string;
  known: RecoveryCase | null;
  children: (recoveryCase: RecoveryCase, reload: () => void) => ReactNode;
}) {
  const [fresh, setFresh] = useState(known === null || known.id !== caseId);
  const load = useCallback(() => getCase(caseId), [caseId]);
  if (!fresh && known) return children(known, () => setFresh(true));
  return <LoadedCase load={load}>{children}</LoadedCase>;
}

function LoadedCase({
  load,
  children,
}: {
  load: () => Promise<RecoveryCase>;
  children: (recoveryCase: RecoveryCase, reload: () => void) => ReactNode;
}) {
  const { state, reload, refresh } = useResource(load);
  if (state.status === 'loading') return <SkeletonCards label={t.loading} rows={1} />;
  if (state.status === 'error') {
    return (
      <div className="grid justify-items-start gap-3">
        <FormMessage>{errorWithReference(describeRecoveryError(state.error))}</FormMessage>
        <Button variant="secondary" onClick={reload}>
          {t.retry}
        </Button>
      </div>
    );
  }
  return children(state.data, refresh);
}

/** Frais déjà payés ailleurs (autre onglet) : l'assistant se termine. */
function FinishNow({
  recoveryCase,
  onFinish,
}: {
  recoveryCase: RecoveryCase;
  onFinish: (recoveryCase: RecoveryCase) => void;
}) {
  useEffect(() => {
    onFinish(recoveryCase);
  }, [recoveryCase, onFinish]);
  return null;
}

/** Confirmation : dossier en examen, réponse sous 2 jours ouvrés (date de la gateway quand elle est donnée). */
function Done({
  recoveryCase,
  heading,
}: {
  recoveryCase: RecoveryCase;
  heading: RefObject<HTMLHeadingElement | null>;
}) {
  const review = recoveryCase.nextDeadline?.kind === 'review' ? recoveryCase.nextDeadline.dueAt : null;
  return (
    <section aria-labelledby="dossier-envoye" className={`${PANEL} grid gap-6`}>
      <div className="flex items-start gap-4">
        <span
          aria-hidden="true"
          className="bg-action text-on-action pop grid size-12 shrink-0 place-items-center rounded-full"
        >
          <IconCheck className="size-6" />
        </span>
        <div className="grid gap-2">
          <h2
            id="dossier-envoye"
            ref={heading}
            tabIndex={-1}
            className="font-display text-h2 text-ink font-semibold outline-none"
          >
            {t.doneTitle}
          </h2>
          <p className="text-ink">{t.doneText(recoveryCase.number)}</p>
          {review ? <p className="text-ink-muted">{t.doneBefore(formatDateTime(review))}</p> : null}
          <p className="text-small text-ink-muted">{t.doneNotice}</p>
        </div>
      </div>
      <div className="flex flex-wrap gap-3">
        <ButtonLink href={recoveryPaths.case(recoveryCase.id)} variant="action" size="lg">
          {t.seeCase}
        </ButtonLink>
        <Link
          href={recoveryPaths.space}
          className="text-brand-ink inline-flex min-h-11 items-center font-semibold underline underline-offset-4"
        >
          {recoveryTexts.back}
        </Link>
      </div>
    </section>
  );
}
