'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { type ReactNode, type RefObject, useEffect, useMemo, useRef, useState } from 'react';
import { Button, ButtonArrow, ButtonLink } from '@/components/ui/button';
import { FormMessage } from '@/components/ui/field';
import { IconArrowLeft, IconArrowRight, IconCheck } from '@/components/ui/icons';
import { SkeletonCards } from '@/components/ui/skeleton';
import { cn } from '@/lib/cn';
import { session, useSession } from '@/lib/api';
import { RequireSession, identityPaths, useOrganizationRole } from '@/features/identity';
import { type SubmitRequestBody, getPlace, listCatalog, submitRequest } from '@/features/cleaning/api';
import {
  FIRST_PRIVATE_STEP,
  MAX_DESCRIPTION,
  type RequestDraft,
  STEPS,
  type StepName,
  buildSlots,
  buildValues,
  clearDraft,
  emptyDraft,
  keptTypes,
  rawValues,
  readDraft,
  relevantParameters,
  requestBody,
  simulationBody,
  stepOfField,
  toggleType,
  writeDraft,
} from '@/features/cleaning/draft';
import { describeCleaningError, errorWithReference } from '@/features/cleaning/errors';
import { idempotentSubmission } from '@/features/cleaning/idempotency';
import { cleaningPaths } from '@/features/cleaning/paths';
import { wizardTexts as t } from '@/features/cleaning/request-texts';
import { buildSchedule } from '@/features/cleaning/schedule';
import type { CleaningRequest, Place } from '@/features/cleaning/schemas';
import { CURRENT_TERMS_VERSION } from '@/features/cleaning/terms';
import { CleaningTypePicker, ParameterFields, PlaceTypePicker } from './catalog-fields';
import { TextAreaField } from './fields';
import { ScheduleFields } from './schedule-fields';
import { SimulationResult } from './simulation-result';
import { visibleValueErrors } from './simulator';
import { SlotFields } from './slot-fields';
import { useCatalog, usePlaceType, useSimulation } from './use-public';
import { VisitFeePay } from './visit-fee-pay';
import { DetailsStep, PlaceStep, ReviewStep } from './wizard-steps';

type Problem = { message: string; step?: StepName; link?: { href: string; label: string } } | null;

const privateIndex = STEPS.indexOf(FIRST_PRIVATE_STEP);

/**
 * Assistant de demande de devis (`/nettoyage/demande`). Étapes publiques d'abord (lieu et types,
 * paramètres avec l'estimation en direct, rythme avec l'aperçu des dates), brouillon dans l'onglet,
 * puis connexion, lieu (« Mes lieux » ou nouveau lieu sur la carte), créneaux de visite, photos et
 * précisions, récapitulatif et envoi (`POST /cleaning/requests`, clé d'idempotence). Après l'envoi :
 * frais payés, ou « Payer maintenant » avant la date limite.
 */
export function RequestWizard() {
  const [draft, setDraft] = useState<RequestDraft>(() => readDraft() ?? emptyDraft());
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [problem, setProblem] = useState<Problem>(null);
  const [sent, setSent] = useState<CleaningRequest | null>(null);
  const [busy, setBusy] = useState(false);
  const [place, setPlace] = useState<Place | null>(null);
  const submission = useRef(idempotentSubmission());
  const heading = useRef<HTMLHeadingElement>(null);
  const catalog = useCatalog();
  const detail = usePlaceType(draft.placeTypeId);
  const placeType = detail.state.status === 'ready' ? detail.state.data : null;
  const step = draft.step;
  const index = STEPS.indexOf(step);

  useEffect(() => {
    if (!sent) writeDraft(draft);
  }, [draft, sent]);

  // Lien « Demander un devis pour ce lieu » (`?lieu=`) : le lieu, son type et ses caractéristiques.
  useEffect(() => {
    const placeId = new URLSearchParams(window.location.search).get('lieu');
    if (!placeId) return;
    let active = true;
    session.restore().then(async (result) => {
      if (!active || result.status !== 'authenticated') return;
      try {
        const [found, catalogData] = await Promise.all([getPlace(placeId), listCatalog()]);
        if (!active) return;
        const summary = catalogData.data
          .flatMap((category) => category.placeTypes)
          .find((item) => item.id === found.placeTypeId);
        setPlace(found);
        setDraft({
          ...emptyDraft(),
          placeTypeId: found.placeTypeId,
          freeDescription: summary?.freeDescription ?? false,
          values: rawValues(found.declaredValues),
          placeId: found.id,
        });
      } catch {
        // Lieu introuvable ou illisible : l'assistant part de zéro.
      }
    });
    return () => {
      active = false;
    };
  }, []);

  const update = (patch: Partial<RequestDraft>) => setDraft((current) => ({ ...current, ...patch }));
  const goTo = (next: StepName) => {
    setErrors({});
    setProblem(null);
    update({ step: next });
    requestAnimationFrame(() => heading.current?.focus());
  };

  const sim = useMemo(() => simulationBody(draft, placeType), [draft, placeType]);
  const simulation = useSimulation(step === 'params' ? sim.body : null);

  /** Contrôle de l'étape avant de passer à la suivante. */
  function check(current: StepName): Record<string, string> {
    if (current === 'type') {
      if (!draft.placeTypeId) return { placeTypeId: 'Choisissez votre lieu.' };
      if (!draft.freeDescription && placeType && !keptTypes(placeType, draft.cleaningTypeIds).length) {
        return { cleaningTypeIds: 'Choisissez au moins un type de nettoyage.' };
      }
      return {};
    }
    if (current === 'params' && placeType) {
      const types = draft.freeDescription ? [] : keptTypes(placeType, draft.cleaningTypeIds);
      const found = buildValues(relevantParameters(placeType, types), draft.values).errors;
      if (draft.freeDescription && !draft.description.trim())
        found['freeDescription'] = 'Décrivez votre besoin.';
      return found;
    }
    if (current === 'schedule') {
      const built = buildSchedule(draft.schedule);
      return 'errors' in built ? built.errors : {};
    }
    if (current === 'place') return draft.placeId ? {} : { placeId: 'Choisissez ou enregistrez le lieu.' };
    if (current === 'slots') return buildSlots(draft.slots).errors;
    return {};
  }

  function next() {
    const found = check(step);
    setErrors(found);
    if (Object.keys(found).length) return;
    const following = STEPS[index + 1];
    if (following) goTo(following);
  }

  async function send() {
    if (!placeType) return;
    const built = requestBody(draft, placeType);
    if ('errors' in built) {
      const first = Object.keys(built.errors)[0] ?? '';
      setErrors(built.errors);
      setProblem({ message: t.fixStep(t.steps[stepOfField(first)]), step: stepOfField(first) });
      return;
    }
    setBusy(true);
    setProblem(null);
    const body: SubmitRequestBody = built.body;
    try {
      const request = await submitRequest(body, submission.current.keyFor(body));
      submission.current.done();
      clearDraft();
      setSent(request);
      requestAnimationFrame(() => heading.current?.focus());
    } catch (error) {
      const view = describeCleaningError(error);
      if (view.code === 'CLEANING_IDEMPOTENCY_KEY_REUSED') submission.current.done();
      setProblem(problemOf(view));
      if (view.kind === 'fields') setErrors(view.fields);
    } finally {
      setBusy(false);
    }
  }

  function problemOf(view: ReturnType<typeof describeCleaningError>): Problem {
    const scheduleCodes = [
      'CLEANING_LEAD_TIME_TOO_SHORT',
      'CLEANING_SCHEDULE_EMPTY',
      'CLEANING_SCHEDULE_LIMIT_EXCEEDED',
    ];
    const placeCodes = [
      'CLEANING_ZONE_NOT_COVERED',
      'CLEANING_PLACE_LOCATION_MISSING',
      'CLEANING_PLACE_NOT_FOUND',
    ];
    const typeCodes = ['CLEANING_OFFER_NOT_AVAILABLE', 'CLEANING_PLACE_TYPE_NOT_FOUND'];
    if (view.kind === 'profile') {
      return { message: t.profileIncomplete, link: { href: identityPaths.profile, label: t.profileLink } };
    }
    if (view.kind === 'forbidden') return { message: t.readOnly };
    if (view.code === 'CLEANING_TOO_MANY_OPEN_REQUESTS') {
      return { message: view.message, link: { href: cleaningPaths.requests, label: t.seeRequests } };
    }
    if (scheduleCodes.includes(view.code)) return { message: view.message, step: 'schedule' };
    if (placeCodes.includes(view.code)) return { message: view.message, step: 'place' };
    if (typeCodes.includes(view.code)) return { message: view.message, step: 'type' };
    if (view.kind === 'fields') {
      const first = stepOfField(Object.keys(view.fields)[0] ?? '');
      return { message: `${view.message} ${t.fixStep(t.steps[first])}`, step: first };
    }
    return { message: errorWithReference(view) };
  }

  if (sent) return <Sent request={sent} heading={heading} />;

  const loadingCatalog =
    catalog.state.status === 'loading' || (draft.placeTypeId && detail.state.status === 'loading');

  return (
    <div className="grid gap-6">
      <Progress index={index} />
      <section
        aria-labelledby="etape-titre"
        className="rounded-panel border-line bg-surface border p-5 shadow-xs sm:p-8"
      >
        <h2
          id="etape-titre"
          ref={heading}
          tabIndex={-1}
          className="font-display text-h2 text-ink font-semibold outline-none"
        >
          {draft.freeDescription && step === 'params' ? t.descriptionLabel : t.steps[step]}
        </h2>
        <p className="text-ink-muted mt-2">{t.stepLeads[step]}</p>

        <div className="swap-in mt-8" key={step}>
          {catalog.state.status === 'error' || detail.state.status === 'error' ? (
            <div className="grid justify-items-start gap-3">
              <FormMessage>
                {
                  describeCleaningError(
                    catalog.state.status === 'error'
                      ? catalog.state.error
                      : detail.state.status === 'error'
                        ? detail.state.error
                        : null,
                  ).message
                }
              </FormMessage>
              <Button
                variant="secondary"
                onClick={catalog.state.status === 'error' ? catalog.reload : detail.reload}
              >
                {t.retry}
              </Button>
            </div>
          ) : loadingCatalog ? (
            <SkeletonCards label={t.loading} rows={2} />
          ) : index >= privateIndex ? (
            <PrivateStep draft={draft}>
              {placeType ? (
                step === 'place' ? (
                  <PlaceStep
                    draft={draft}
                    detail={placeType}
                    error={errors['placeId'] ?? null}
                    onChange={(placeId, chosen) => {
                      update({ placeId });
                      if (chosen) setPlace(chosen);
                    }}
                  />
                ) : step === 'slots' ? (
                  <SlotFields
                    idPrefix="demande"
                    slots={draft.slots}
                    onChange={(slots) => update({ slots })}
                    errors={errors}
                  />
                ) : step === 'details' ? (
                  <DetailsStep draft={draft} onChange={update} errors={errors} />
                ) : (
                  <ReviewStep
                    draft={draft}
                    detail={placeType}
                    place={place}
                    onEdit={goTo}
                    termsHref={cleaningPaths.terms(CURRENT_TERMS_VERSION)}
                  />
                )
              ) : (
                <FormMessage>{t.catalogChanged}</FormMessage>
              )}
            </PrivateStep>
          ) : catalog.state.status === 'ready' ? (
            step === 'type' ? (
              <div className="grid gap-8">
                <PlaceTypePicker
                  id="demande-lieu-type"
                  catalog={catalog.state.data}
                  value={draft.placeTypeId}
                  error={errors['placeTypeId']}
                  onChange={(placeTypeId, freeDescription) =>
                    update({ placeTypeId, freeDescription, cleaningTypeIds: [], placeId: null })
                  }
                />
                {placeType && !draft.freeDescription ? (
                  <CleaningTypePicker
                    id="demande-types"
                    detail={placeType}
                    selected={draft.cleaningTypeIds}
                    error={errors['cleaningTypeIds']}
                    onToggle={(typeId) =>
                      update({ cleaningTypeIds: toggleType(placeType, draft.cleaningTypeIds, typeId) })
                    }
                  />
                ) : null}
              </div>
            ) : step === 'params' && placeType ? (
              <div className="grid gap-8 lg:grid-cols-12">
                <div className="grid content-start gap-6 lg:col-span-7">
                  {draft.freeDescription ? (
                    <TextAreaField
                      id="demande-besoin"
                      label={t.descriptionLabel}
                      hint={t.descriptionHint}
                      value={draft.description}
                      maxLength={MAX_DESCRIPTION}
                      rows={6}
                      onChange={(event) => update({ description: event.target.value })}
                      counter={t.counter(draft.description.length, MAX_DESCRIPTION)}
                      error={errors['freeDescription']}
                    />
                  ) : null}
                  <ParameterFields
                    idPrefix="demande"
                    parameters={relevantParameters(
                      placeType,
                      draft.freeDescription ? [] : keptTypes(placeType, draft.cleaningTypeIds),
                    )}
                    values={draft.values}
                    errors={{
                      ...visibleValueErrors(
                        sim.errors,
                        draft.values,
                        simulation.status === 'error' ? simulation.error.fields : {},
                      ),
                      ...errors,
                    }}
                    onChange={(code, value) => update({ values: { ...draft.values, [code]: value } })}
                  />
                </div>
                {!draft.freeDescription ? (
                  <div className="lg:col-span-5">
                    <SimulationResult state={simulation} />
                  </div>
                ) : null}
              </div>
            ) : step === 'schedule' ? (
              <ScheduleFields
                idPrefix="demande-rythme"
                draft={draft.schedule}
                onChange={(schedule) => update({ schedule })}
                errors={errors}
              />
            ) : null
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
            {problem.link ? (
              <Link
                href={problem.link.href}
                className="text-brand-ink inline-flex min-h-11 items-center font-semibold underline underline-offset-4"
              >
                {problem.link.label}
              </Link>
            ) : null}
          </div>
        ) : null}
      </section>

      <WizardNav
        index={index}
        busy={busy}
        onBack={() => {
          const previous = STEPS[index - 1];
          if (previous) goTo(previous);
        }}
        onNext={step === 'review' ? () => void send() : next}
        last={step === 'review'}
      />
      <p className="text-center">
        <button
          type="button"
          className="text-small text-ink-muted inline-flex min-h-11 items-center underline underline-offset-4"
          onClick={() => {
            clearDraft();
            setPlace(null);
            setDraft(emptyDraft());
            setErrors({});
            setProblem(null);
          }}
        >
          {t.restart}
        </button>
      </p>
    </div>
  );
}

/** Fil des étapes : « Étape n sur 7 » et la barre de progression. */
function Progress({ index }: { index: number }) {
  return (
    <div className="grid gap-3">
      <p className="text-small text-ink-muted font-semibold">
        {t.progress(index + 1, STEPS.length)}
        {/* Sur téléphone, le nom de l'étape suit le compteur (les libellés sous la barre sont masqués). */}
        <span className="text-ink sm:hidden" aria-hidden="true">
          {` · ${t.steps[STEPS[index] ?? 'type']}`}
        </span>
      </p>
      <ol className="grid grid-cols-7 gap-1.5" aria-label={t.progress(index + 1, STEPS.length)}>
        {STEPS.map((name, position) => (
          <li key={name} className="grid gap-1.5">
            <span
              aria-hidden="true"
              className={cn(
                'h-1.5 rounded-full',
                position < index ? 'bg-action' : position === index ? 'bg-action progress-grow' : 'bg-line',
              )}
            />
            <span
              className={cn(
                'text-xs leading-tight',
                'max-sm:sr-only',
                position === index ? 'text-ink font-semibold' : 'text-ink-muted',
              )}
            >
              <span className="sr-only">
                {position < index ? 'Faite : ' : position === index ? 'En cours : ' : 'À venir : '}
              </span>
              {t.steps[name]}
            </span>
          </li>
        ))}
      </ol>
    </div>
  );
}

/** Boutons « Retour » et « Continuer » / « Envoyer », fixés en bas de l'écran du téléphone. */
function WizardNav({
  index,
  busy,
  last,
  onBack,
  onNext,
}: {
  index: number;
  busy: boolean;
  last: boolean;
  onBack: () => void;
  onNext: () => void;
}) {
  return (
    <div className="border-line bg-surface/95 sticky bottom-0 z-30 -mx-4 flex items-center justify-between gap-3 border-t px-4 py-3 backdrop-blur sm:static sm:mx-0 sm:border-0 sm:bg-transparent sm:p-0 sm:backdrop-blur-none">
      {index > 0 ? (
        <Button variant="secondary" onClick={onBack} disabled={busy}>
          <IconArrowLeft />
          {t.back}
        </Button>
      ) : (
        <span />
      )}
      <Button variant="action" size="lg" onClick={onNext} disabled={busy}>
        {last ? (busy ? t.submitting : t.submit) : t.next}
        {last ? null : (
          <ButtonArrow>
            <IconArrowRight />
          </ButtonArrow>
        )}
      </Button>
    </div>
  );
}

/**
 * Étapes du compte : sans session, une invitation à se connecter (le brouillon reste dans l'onglet) ;
 * avec une session, la garde commune (profil à compléter, compte en cours de suppression). Un membre
 * lecteur d'une organisation ne peut pas envoyer de demande.
 */
function PrivateStep({ draft, children }: { draft: RequestDraft; children: ReactNode }) {
  const current = useSession();
  const [restored, setRestored] = useState<'checking' | 'anonymous' | 'ready' | 'unavailable'>('checking');
  const role = useOrganizationRole();
  const status = current ? 'ready' : restored;

  useEffect(() => {
    if (current) return;
    let active = true;
    session.restore().then((result) => {
      if (!active) return;
      setRestored(
        result.status === 'authenticated'
          ? 'ready'
          : result.status === 'anonymous'
            ? 'anonymous'
            : 'unavailable',
      );
    });
    return () => {
      active = false;
    };
  }, [current]);

  if (status === 'checking')
    return (
      <p role="status" className="text-ink-muted">
        {t.checkingSession}
      </p>
    );
  if (status === 'unavailable') return <FormMessage>{t.sessionUnavailable}</FormMessage>;
  if (status === 'anonymous') {
    const back = `/connexion?retour=${encodeURIComponent(cleaningPaths.request)}`;
    return (
      <div className="rounded-card border-brand-muted bg-brand-soft grid justify-items-start gap-4 border p-5 sm:p-6">
        <p className="font-display text-ink text-lg font-semibold">{t.loginTitle}</p>
        <p className="text-ink">{t.loginText}</p>
        <ButtonLink href={back} variant="primary" size="lg" onClick={() => writeDraft(draft)}>
          {t.loginAction}
        </ButtonLink>
      </div>
    );
  }
  if (role === 'org_viewer') return <FormMessage tone="info">{t.readOnly}</FormMessage>;
  return <RequireSession>{children}</RequireSession>;
}

/** Après l'envoi : frais réglés, ou à régler maintenant (Mobile Money d'abord, puis portefeuille). */
function Sent({
  request,
  heading,
}: {
  request: CleaningRequest;
  heading: RefObject<HTMLHeadingElement | null>;
}) {
  const router = useRouter();
  const awaiting = request.status === 'awaiting_visit_fee';
  const detailHref = cleaningPaths.requestDetail(request.id);
  return (
    <section
      aria-labelledby="demande-envoyee"
      className="rounded-panel border-line bg-surface grid gap-6 border p-5 shadow-xs sm:p-8"
    >
      <div className="flex items-start gap-4">
        <span
          aria-hidden="true"
          className="bg-action text-on-action pop grid size-12 shrink-0 place-items-center rounded-full"
        >
          <IconCheck className="size-6" />
        </span>
        <div>
          <h2
            id="demande-envoyee"
            ref={heading}
            tabIndex={-1}
            className="font-display text-h2 text-ink font-semibold outline-none"
          >
            {awaiting ? t.sentAwaitingTitle : t.sentPaidTitle}
          </h2>
          <p className="text-ink mt-2">
            {awaiting ? t.sentAwaitingText(request.number) : t.sentPaidText(request.number)}
          </p>
        </div>
      </div>
      {awaiting ? (
        <VisitFeePay
          requestId={request.id}
          fee={request.visitFee}
          onChanged={() => router.push(detailHref)}
        />
      ) : null}
      <ButtonLink
        href={detailHref}
        variant={awaiting ? 'secondary' : 'action'}
        size="lg"
        className="justify-self-start"
      >
        {t.seeRequest}
      </ButtonLink>
    </section>
  );
}
