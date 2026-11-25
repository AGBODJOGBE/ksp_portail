'use client';

import Link from 'next/link';
import { useCallback, useRef, useState } from 'react';
import { BandHeader, BandTitle } from '@/components/ui/band-header';
import { Button, ButtonLink } from '@/components/ui/button';
import { FormMessage } from '@/components/ui/field';
import { Skeleton } from '@/components/ui/skeleton';
import { contextKey, useSession } from '@/lib/api';
import { useResource } from '@/lib/use-resource';
import { identityPaths, useOrganizationRole } from '@/features/identity';
import { getProgram, reorderProgram } from '@/features/cleaning/api';
import {
  type CleaningErrorView,
  describeCleaningError,
  errorWithReference,
  fieldMessage,
} from '@/features/cleaning/errors';
import { idempotentSubmission } from '@/features/cleaning/idempotency';
import { cleaningPaths } from '@/features/cleaning/paths';
import { programTexts, reorderTexts as t } from '@/features/cleaning/program-texts';
import { type ScheduleDraft, buildSchedule, draftFromPlan } from '@/features/cleaning/schedule';
import type { CleaningRequest, ProgramDetail } from '@/features/cleaning/schemas';
import { wizardTexts } from '@/features/cleaning/request-texts';
import { Panel } from './fields';
import { ScheduleFields } from './schedule-fields';

/**
 * « Commander à nouveau » un programme ponctuel terminé (R-PG-08, adresse des notifications) : même lieu,
 * mêmes prestations, nouveau rythme saisi avec l'aperçu des dates calculé par la gateway ; l'envoi crée
 * une nouvelle demande (`POST /programs/{id}/reorder`), dont le lien est donné.
 */
export function ReorderProgram({ id }: { id: string }) {
  const key = contextKey(useSession()) ?? 'none';
  return <Reorder key={`${key}-${id}`} id={id} />;
}

/** Rythme repris du programme, sans ses dates passées. */
function freshDraft(program: ProgramDetail): ScheduleDraft {
  return { ...draftFromPlan(program.schedule), dates: [], startDate: '', endDate: '', excludedDates: [] };
}

function Reorder({ id }: { id: string }) {
  const load = useCallback(() => getProgram(id), [id]);
  const { state, reload } = useResource(load);
  const role = useOrganizationRole();

  if (state.status === 'loading') {
    return (
      <div role="status" className="grid gap-8">
        <span className="sr-only">{programTexts.detailLoading}</span>
        <BandHeader>
          <div className="grid gap-3" aria-hidden="true">
            <Skeleton className="h-11 w-48" />
            <Skeleton className="h-11 w-2/3 max-w-md" />
          </div>
        </BandHeader>
        <Skeleton className="rounded-card h-72" />
      </div>
    );
  }
  if (state.status === 'error') {
    const view = describeCleaningError(state.error);
    return (
      <div className="grid gap-8">
        <BandHeader>
          <BandTitle back={{ href: cleaningPaths.programs, label: programTexts.back }} title={t.title} />
        </BandHeader>
        <div className="rounded-card border-line bg-surface grid justify-items-start gap-4 border p-5 shadow-xs sm:p-6">
          <FormMessage>
            {view.kind === 'notFound' ? programTexts.notFound : errorWithReference(view)}
          </FormMessage>
          {view.kind === 'notFound' ? null : (
            <Button variant="secondary" onClick={reload}>
              {programTexts.retry}
            </Button>
          )}
        </div>
      </div>
    );
  }

  const program = state.data;
  const reorderable = program.schedule.kind === 'one_off' && program.status === 'completed';
  return (
    <div className="grid gap-8">
      <BandHeader>
        <BandTitle
          back={{ href: cleaningPaths.program(program.id), label: t.backToProgram }}
          eyebrow={t.eyebrow(program.number)}
          title={t.title}
          lead={`${program.place.name} · ${program.place.placeTypeName} · ${program.place.communeName}${program.cleaningTypes.length ? ` · ${program.cleaningTypes.map((type) => type.name).join(', ')}` : ''}`}
        />
      </BandHeader>
      {!reorderable ? (
        <Notice text={t.notReorderable} programId={program.id} />
      ) : role === 'org_viewer' ? (
        <Notice text={t.readOnly} programId={program.id} />
      ) : (
        <ReorderForm program={program} />
      )}
    </div>
  );
}

function Notice({ text, programId }: { text: string; programId: string }) {
  return (
    <div className="rounded-card border-line bg-surface grid justify-items-start gap-4 border p-5 shadow-xs sm:p-6">
      <FormMessage tone="info">{text}</FormMessage>
      <ButtonLink href={cleaningPaths.program(programId)} variant="secondary">
        {t.backToProgram}
      </ButtonLink>
    </div>
  );
}

function ReorderForm({ program }: { program: ProgramDetail }) {
  const [draft, setDraft] = useState(() => freshDraft(program));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<CleaningErrorView | null>(null);
  const [created, setCreated] = useState<CleaningRequest | null>(null);
  const submission = useRef(idempotentSubmission());

  async function send() {
    const built = buildSchedule(draft);
    if ('errors' in built) {
      setErrors(built.errors);
      setProblem(null);
      return;
    }
    setErrors({});
    setBusy(true);
    setProblem(null);
    try {
      setCreated(await reorderProgram(program.id, built.plan, submission.current.keyFor(built.plan)));
      submission.current.done();
    } catch (error) {
      const view = describeCleaningError(error);
      if (view.code === 'CLEANING_IDEMPOTENCY_KEY_REUSED') submission.current.done();
      if (view.kind === 'fields') setErrors(view.fields);
      setProblem(view);
    } finally {
      setBusy(false);
    }
  }

  if (created) {
    return (
      <section
        aria-labelledby="commande-envoyee"
        className="rounded-panel border-action-muted bg-surface signature-edge grid justify-items-start gap-4 border p-5 shadow-xs sm:p-8"
      >
        <h2 id="commande-envoyee" className="font-display text-h3 text-ink font-semibold">
          {t.sentTitle}
        </h2>
        <FormMessage tone="success">{t.sent(created.number)}</FormMessage>
        <ButtonLink href={cleaningPaths.requestDetail(created.id)} variant="action" size="lg">
          {t.seeRequest}
        </ButtonLink>
      </section>
    );
  }

  const scheduleError = fieldMessage(errors, 'schedule');
  return (
    <form
      noValidate
      className="grid gap-8"
      onSubmit={(event) => {
        event.preventDefault();
        void send();
      }}
    >
      <Panel id="nouveau-rythme" title={t.scheduleTitle}>
        <ScheduleFields idPrefix="commande" draft={draft} onChange={setDraft} errors={errors} />
      </Panel>
      {scheduleError && !problem ? <FormMessage>{t.fixSchedule}</FormMessage> : null}
      {problem?.kind === 'profile' ? (
        <div className="grid justify-items-start gap-2">
          <FormMessage>{wizardTexts.profileIncomplete}</FormMessage>
          <Link
            href={identityPaths.profile}
            className="text-brand-ink inline-flex min-h-11 items-center font-semibold underline underline-offset-4"
          >
            {wizardTexts.profileLink}
          </Link>
        </div>
      ) : problem && problem.kind !== 'fields' ? (
        <FormMessage>{errorWithReference(problem)}</FormMessage>
      ) : null}
      {problem?.kind === 'fields' ? <FormMessage>{problem.message}</FormMessage> : null}
      <div className="flex flex-col gap-3 sm:flex-row">
        <Button type="submit" variant="action" size="lg" disabled={busy}>
          {busy ? t.submitting : t.submit}
        </Button>
        <ButtonLink href={cleaningPaths.program(program.id)} variant="ghost" size="lg">
          {t.backToProgram}
        </ButtonLink>
      </div>
    </form>
  );
}
