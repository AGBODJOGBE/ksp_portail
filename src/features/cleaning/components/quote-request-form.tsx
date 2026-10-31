'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { type FormEvent, type ReactNode, type Ref, useEffect, useId, useMemo, useRef, useState } from 'react';
import { SignatureProgress } from '@/components/ui/brand/signature';
import { Badge } from '@/components/ui/badge';
import { Button, ButtonLink } from '@/components/ui/button';
import { FieldError, FormMessage, TextField, fieldIds, inputClasses } from '@/components/ui/field';
import { Heading } from '@/components/ui/heading';
import { IconCheck, IconClock } from '@/components/ui/icons';
import { ContextSwitcher, ProfileForm } from '@/features/identity';
import { useSession } from '@/lib/api';
import { frenchSpacing } from '@/lib/typography';
import { requestQuote } from '@/features/cleaning/api';
import { draftFromParams, type SimulationDraft } from '@/features/cleaning/draft';
import { describeCleaningError } from '@/features/cleaning/errors';
import { formatDateTime, formatShortDate } from '@/lib/format';
import { cleaningPaths } from '@/features/cleaning/paths';
import { idempotentSubmission } from '@/features/cleaning/idempotency';
import {
  type CustomerKind,
  MAX_COMMENT,
  MAX_SLOTS,
  type PeriodValue,
  type RequestErrors,
  type RequestField,
  type RequestFormValues,
  buildQuoteRequest,
  firstAllowedDate,
  recurrencePeriod,
} from '@/features/cleaning/request-form';
import type { QuoteRequest, ServedZone } from '@/features/cleaning/schemas';
import {
  cleaningTexts,
  frequencies,
  premisesTypes,
  requestJourney,
  requestStatuses,
  statusOf,
} from '@/features/cleaning/texts';
import { optionLabels, quantityLabel, serviceName, useServices } from '@/features/cleaning/use-services';
import { useZones } from '@/features/cleaning/use-zones';
import { OTHER_COMMUNE, zoneFor, zonesSentence } from '@/features/cleaning/zones';

const t = cleaningTexts.request;

/**
 * Champ du contrat (`details.field` d'une erreur `CLEANING_VALIDATION_FAILED`) → champ du formulaire.
 * Les champs repris de la simulation (prestation, locaux, taille, options) renvoient à la simulation.
 */
const CONTRACT_FIELDS: Record<string, RequestField> = {
  commune: 'commune',
  address: 'address',
  preferredSlots: 'slots',
  recurrence: 'recurrence',
  daysPerWeek: 'days',
  requestedTeamSize: 'team',
  comment: 'comment',
};

/** Partie numérotée du formulaire (fieldset et sa légende). */
function FormPart({
  index,
  title,
  hint,
  children,
  partRef,
  describedBy,
}: {
  index: number;
  title: string;
  hint?: string;
  children: ReactNode;
  partRef?: Ref<HTMLFieldSetElement>;
  describedBy?: string;
}) {
  return (
    <fieldset
      ref={partRef}
      aria-describedby={describedBy}
      className="rounded-card border-line bg-surface grid gap-5 border p-5 shadow-xs sm:p-6"
    >
      <legend className="sr-only">{title}</legend>
      <div aria-hidden="true" className="flex items-center gap-3">
        <span className="bg-brand text-on-brand grid size-8 shrink-0 place-items-center rounded-full text-sm font-semibold tabular-nums">
          {index}
        </span>
        <span className="font-display text-ink text-xl font-semibold">{title}</span>
      </div>
      {hint ? <p className="text-small text-ink-muted -mt-2">{hint}</p> : null}
      {children}
    </fieldset>
  );
}

/**
 * Type de client de la demande : celui du contexte actif de la session (`activeContext`), que la gateway
 * applique elle-même. Il se change ici avec le sélecteur de contexte (ADR-027) : le formulaire suit.
 */
function ContextNotice({ kind, organizationName }: { kind: CustomerKind; organizationName: string | null }) {
  const c = cleaningTexts.context;
  return (
    <div className="grid gap-3">
      <ContextSwitcher />
      <p className="text-small text-ink-muted">
        {frenchSpacing(
          kind === 'business'
            ? c.requestBusiness(organizationName)
            : `${c.requestIndividual} ${c.businessLater}`,
        )}
      </p>
    </div>
  );
}

/** Récapitulatif du besoin repris de la simulation, avec ce qui se passe après l'envoi. */
function Recap({ draft }: { draft: SimulationDraft }) {
  const services = useServices();
  const options = optionLabels(services, draft.serviceCode, draft.options);
  const rows = [
    ['Prestation', serviceName(services, draft.serviceCode)],
    ['Locaux', premisesTypes[draft.premisesType] ?? draft.premisesType],
    ['Taille', quantityLabel(services, draft.serviceCode, draft.quantity)],
    ...(options.length ? [['Options', options.join(', ')]] : []),
    ...(draft.frequency ? [['Fréquence', frequencies[draft.frequency] ?? draft.frequency]] : []),
  ];
  return (
    <aside className="order-first grid gap-5 lg:sticky lg:top-[calc(var(--header-h)+1.5rem)] lg:order-none">
      <section
        aria-labelledby="besoin-titre"
        className="rounded-card border-line bg-surface-muted grid gap-3 border p-5"
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Heading as="h2" size="h3" id="besoin-titre">
            {t.summaryTitle}
          </Heading>
          <Badge tone="action" dot>
            {t.fromSimulation}
          </Badge>
        </div>
        <dl className="divide-line grid divide-y">
          {rows.map(([label, value]) => (
            <div key={label} className="flex flex-wrap justify-between gap-x-4 gap-y-0.5 py-2">
              <dt className="text-small text-ink-muted">{label}</dt>
              <dd className="text-ink text-right font-semibold">{value}</dd>
            </div>
          ))}
        </dl>
        <Link
          href={cleaningPaths.simulator}
          className="text-action-ink inline-flex min-h-11 items-center text-sm font-semibold underline-offset-4 hover:underline"
        >
          {t.editSimulation}
        </Link>
      </section>
      {/* Sur téléphone, l'encadré de l'envoi (visite obligatoire) suffit : le formulaire reste près du haut. */}
      <section
        aria-labelledby="ensuite-titre"
        className="rounded-card border-line hidden gap-3 border p-5 lg:grid"
      >
        <Heading as="h2" size="h3" id="ensuite-titre">
          {t.afterTitle}
        </Heading>
        <ol className="text-small text-ink-muted grid list-decimal gap-2 pl-5">
          {t.afterSteps.map((step) => (
            <li key={step}>{frenchSpacing(step)}</li>
          ))}
        </ol>
      </section>
    </aside>
  );
}

/** Accusé de réception : la demande est enregistrée, voici la suite. */
function Success({ request }: { request: QuoteRequest }) {
  const status = statusOf(requestStatuses, request.status);
  const ref = useRef<HTMLDivElement>(null);
  // L'accusé de réception remplace le formulaire : il reçoit le focus (et vient à l'écran).
  useEffect(() => ref.current?.focus(), []);
  return (
    <div
      ref={ref}
      tabIndex={-1}
      role="status"
      className="rounded-card border-action-muted bg-surface grid gap-6 border p-6 focus-visible:outline-none sm:p-8"
    >
      <div className="flex items-start gap-4">
        <span
          aria-hidden="true"
          className="bg-action text-on-action grid size-12 shrink-0 place-items-center rounded-full"
        >
          <IconCheck className="size-6" />
        </span>
        <div className="grid gap-2">
          <p className="font-display text-ink text-2xl font-semibold">{t.successTitle}</p>
          <p className="text-ink-muted">{frenchSpacing(t.successText)}</p>
        </div>
      </div>
      <dl className="rounded-control bg-surface-muted grid gap-3 p-4 sm:grid-cols-3">
        <div>
          <dt className="text-small text-ink-muted">{t.successReceived}</dt>
          <dd className="text-ink font-semibold">{formatDateTime(request.createdAt)}</dd>
        </div>
        <div>
          <dt className="text-small text-ink-muted">{t.successStatus}</dt>
          <dd>
            <Badge tone={status.tone} dot>
              {status.label}
            </Badge>
          </dd>
        </div>
        <div>
          <dt className="text-small text-ink-muted">{t.successReference}</dt>
          <dd className="text-ink font-mono text-sm break-all">{request.id}</dd>
        </div>
      </dl>
      <SignatureProgress steps={requestJourney} current={1} label={cleaningTexts.journey.requestProgress} />
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
        <ButtonLink href={cleaningPaths.request(request.id)} variant="action" size="lg">
          {t.seeRequest}
        </ButtonLink>
        <ButtonLink href={cleaningPaths.space} variant="secondary" size="lg">
          {cleaningTexts.space.homeLink}
        </ButtonLink>
      </div>
    </div>
  );
}

function RequestForm({
  draft,
  zones,
  onCreated,
}: {
  draft: SimulationDraft;
  zones: ReadonlyArray<ServedZone>;
  onCreated: (request: QuoteRequest) => void;
}) {
  const baseId = useId();
  const context = useSession()?.activeContext;
  const kind: CustomerKind = context?.type === 'business' ? 'business' : 'individual';
  const zonesText = zonesSentence(zones);
  const minDate = useMemo(() => firstAllowedDate(), []);
  const submission = useRef(idempotentSubmission());
  const addressRef = useRef<HTMLInputElement>(null);
  const communeRef = useRef<HTMLSelectElement>(null);
  const daysRef = useRef<HTMLInputElement>(null);
  const teamRef = useRef<HTMLInputElement>(null);
  const commentRef = useRef<HTMLTextAreaElement>(null);
  const slotsRef = useRef<HTMLFieldSetElement>(null);
  const recurrenceRef = useRef<HTMLFieldSetElement>(null);
  const [values, setValues] = useState<RequestFormValues>(() => ({
    kind,
    commune: zoneFor(zones, draft.commune)?.commune ?? OTHER_COMMUNE,
    address: '',
    slots: [{ date: '', period: 'morning' }],
    visits: '',
    months: '',
    days: '',
    team: '',
    comment: '',
  }));
  const [errors, setErrors] = useState<RequestErrors>({});
  const [message, setMessage] = useState<ReactNode>(null);
  const [pending, setPending] = useState(false);
  const [needsProfile, setNeedsProfile] = useState(false);

  // Le contexte de la session fait foi, même s'il change pendant la saisie.
  const current = { ...values, kind };
  const period = recurrencePeriod(kind, draft);
  const outOfZone = values.commune === OTHER_COMMUNE;
  const update = (patch: Partial<RequestFormValues>) => setValues((previous) => ({ ...previous, ...patch }));
  const updateSlot = (index: number, patch: Partial<{ date: string; period: PeriodValue }>) =>
    update({
      slots: values.slots.map((slot, position) => (position === index ? { ...slot, ...patch } : slot)),
    });

  function focusFirst(found: RequestErrors) {
    if (found.commune) communeRef.current?.focus();
    else if (found.address) addressRef.current?.focus();
    else if (found.slots) slotsRef.current?.querySelector('input')?.focus();
    else if (found.days) daysRef.current?.focus();
    else if (found.recurrence) recurrenceRef.current?.querySelector('input')?.focus();
    else if (found.team) teamRef.current?.focus();
    else if (found.comment) commentRef.current?.focus();
  }

  function showFieldError(field: RequestField, text: string) {
    const found = { [field]: text } as RequestErrors;
    setErrors(found);
    focusFirst(found);
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending || outOfZone) return;
    setMessage(null);
    const { errors: found, input } = buildQuoteRequest(draft, current, new Date(), zonesText);
    setErrors(found);
    if (!input) return focusFirst(found);

    setPending(true);
    try {
      const request = await requestQuote(input, submission.current.keyFor(input));
      submission.current.done();
      onCreated(request);
    } catch (caught) {
      const view = describeCleaningError(caught);
      const field = view.field ? CONTRACT_FIELDS[view.field] : undefined;
      if (view.kind === 'profile') setNeedsProfile(true);
      else if (view.kind === 'zone') showFieldError('commune', view.message);
      else if (view.kind === 'slots') showFieldError('slots', view.message);
      else if (view.kind === 'field' && field) showFieldError(field, view.message);
      else if (view.kind === 'field') {
        // Un champ repris de la simulation (prestation, locaux, taille, options) : la refaire.
        setMessage(
          <>
            {view.message}{' '}
            <Link href={cleaningPaths.simulator} className="underline underline-offset-4">
              {t.editSimulation}
            </Link>
          </>,
        );
      } else if (view.kind === 'tooManyOpen') {
        setMessage(
          <>
            {view.message}{' '}
            <Link href={cleaningPaths.space} className="underline underline-offset-4">
              {cleaningTexts.space.homeLink}
            </Link>
          </>,
        );
      } else if (view.kind === 'organizationSuspended') {
        setMessage(cleaningTexts.common.organizationSuspendedRequest);
      } else setMessage(view.message);
    } finally {
      setPending(false);
    }
  }

  if (needsProfile) {
    return (
      <div className="grid gap-4">
        <FormMessage tone="info">{t.profileNeeded}</FormMessage>
        <ProfileForm autoFocus onDone={() => setNeedsProfile(false)} />
      </div>
    );
  }

  const slotIds = fieldIds(`${baseId}-creneaux`);
  const recurrenceIds = fieldIds(`${baseId}-regularite`);
  const commentIds = fieldIds(`${baseId}-commentaire`);
  const communeError =
    errors.commune ??
    (outOfZone
      ? `${cleaningTexts.simulator.outOfZoneTitle}. ${cleaningTexts.simulator.outOfZoneText(zonesText)}`
      : null);
  return (
    <form noValidate onSubmit={submit} aria-label={t.title} className="grid gap-6">
      <FormPart index={1} title={t.partWho}>
        <ContextNotice kind={kind} organizationName={context?.organizationName ?? null} />
        {kind === 'business' ? (
          <TextField
            id={`${baseId}-jours`}
            inputRef={daysRef}
            label={t.daysPerWeek}
            hint={t.daysHint}
            inputMode="numeric"
            maxLength={1}
            value={values.days}
            onChange={(event) => update({ days: event.target.value })}
            error={errors.days}
            className="max-w-xs"
          />
        ) : null}
      </FormPart>

      <FormPart index={2} title={t.partWhere}>
        <div className="grid gap-2">
          <label htmlFor={`${baseId}-commune`} className="text-ink block font-semibold">
            {t.commune}
          </label>
          <select
            id={`${baseId}-commune`}
            ref={communeRef}
            value={values.commune}
            onChange={(event) => {
              update({ commune: event.target.value });
              setErrors((previous) => ({ ...previous, commune: undefined }));
            }}
            aria-invalid={communeError ? true : undefined}
            aria-describedby={communeError ? `${baseId}-commune-erreur` : undefined}
            className={inputClasses({ invalid: !!communeError })}
          >
            {zones.map((zone) => (
              <option key={zone.code} value={zone.commune}>
                {zone.commune}
              </option>
            ))}
            <option value={OTHER_COMMUNE}>{t.otherCommune}</option>
          </select>
          {communeError ? <FieldError id={`${baseId}-commune-erreur`}>{communeError}</FieldError> : null}
        </div>

        <TextField
          id={`${baseId}-adresse`}
          inputRef={addressRef}
          label={t.address}
          hint={t.addressHint}
          autoComplete="street-address"
          maxLength={500}
          required
          value={values.address}
          onChange={(event) => update({ address: event.target.value })}
          error={errors.address}
        />
      </FormPart>

      <FormPart
        index={3}
        title={t.slotsTitle}
        hint={t.slotsHint(formatShortDate(`${minDate}T12:00:00Z`))}
        partRef={slotsRef}
        describedBy={errors.slots ? slotIds.error : undefined}
      >
        {values.slots.map((slot, index) => (
          <div
            key={index}
            className="rounded-control bg-surface-muted grid gap-3 p-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end"
          >
            <div>
              <label htmlFor={`${baseId}-date-${index}`} className="text-small text-ink font-semibold">
                {t.slotDate(index + 1)}
              </label>
              <input
                id={`${baseId}-date-${index}`}
                type="date"
                min={minDate}
                value={slot.date}
                onChange={(event) => updateSlot(index, { date: event.target.value })}
                aria-invalid={errors.slots ? true : undefined}
                aria-describedby={errors.slots ? slotIds.error : undefined}
                className={inputClasses({ invalid: !!errors.slots, className: 'mt-1' })}
              />
            </div>
            <div>
              <label htmlFor={`${baseId}-moment-${index}`} className="text-small text-ink font-semibold">
                {t.slotPeriod(index + 1)}
              </label>
              <select
                id={`${baseId}-moment-${index}`}
                value={slot.period}
                onChange={(event) => updateSlot(index, { period: event.target.value as PeriodValue })}
                className={inputClasses({ className: 'mt-1' })}
              >
                {cleaningTexts.periods.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </select>
            </div>
            {values.slots.length > 1 ? (
              <Button
                variant="ghost"
                onClick={() => update({ slots: values.slots.filter((_, position) => position !== index) })}
              >
                {t.removeSlot(index + 1)}
              </Button>
            ) : null}
          </div>
        ))}
        {errors.slots ? <FieldError id={slotIds.error}>{errors.slots}</FieldError> : null}
        {values.slots.length < MAX_SLOTS ? (
          <Button
            variant="secondary"
            className="justify-self-start"
            onClick={() => update({ slots: [...values.slots, { date: '', period: 'morning' }] })}
          >
            {t.addSlot}
          </Button>
        ) : null}
      </FormPart>

      <FormPart index={4} title={t.partDetails} hint={t.partDetailsHint}>
        {period ? (
          <fieldset
            ref={recurrenceRef}
            aria-describedby={errors.recurrence ? recurrenceIds.error : recurrenceIds.hint}
            className="grid gap-3"
          >
            <legend className="text-ink font-semibold">{t.recurrenceTitle}</legend>
            <p id={recurrenceIds.hint} className="text-small text-ink-muted -mt-1">
              {t.recurrenceHint}
            </p>
            <div className="grid gap-4 sm:grid-cols-2">
              <TextField
                id={`${baseId}-passages`}
                label={period === 'week' ? t.visitsPerWeek : t.visitsPerMonth}
                inputMode="numeric"
                maxLength={2}
                value={values.visits}
                onChange={(event) => update({ visits: event.target.value })}
              />
              <TextField
                id={`${baseId}-duree`}
                label={t.durationMonths}
                inputMode="numeric"
                maxLength={2}
                value={values.months}
                onChange={(event) => update({ months: event.target.value })}
              />
            </div>
            {errors.recurrence ? <FieldError id={recurrenceIds.error}>{errors.recurrence}</FieldError> : null}
          </fieldset>
        ) : null}

        <TextField
          id={`${baseId}-agents`}
          inputRef={teamRef}
          label={t.teamSize}
          hint={t.teamSizeHint}
          inputMode="numeric"
          maxLength={2}
          value={values.team}
          onChange={(event) => update({ team: event.target.value })}
          error={errors.team}
          className="max-w-xs"
        />

        <div>
          <label htmlFor={`${baseId}-commentaire`} className="text-ink block font-semibold">
            {t.comment}
          </label>
          <p id={commentIds.hint} className="text-small text-ink-muted mt-1">
            {t.commentHint}
          </p>
          <textarea
            id={`${baseId}-commentaire`}
            ref={commentRef}
            aria-describedby={errors.comment ? `${commentIds.hint} ${commentIds.error}` : commentIds.hint}
            aria-invalid={errors.comment ? true : undefined}
            maxLength={MAX_COMMENT}
            rows={4}
            value={values.comment}
            onChange={(event) => update({ comment: event.target.value })}
            className={inputClasses({ invalid: !!errors.comment, className: 'mt-2 py-3' })}
          />
          <p className="text-small text-ink-subtle mt-1 text-right tabular-nums">
            {cleaningTexts.common.reasonCount(values.comment.length, MAX_COMMENT)}
          </p>
          {errors.comment ? <FieldError id={commentIds.error}>{errors.comment}</FieldError> : null}
        </div>
      </FormPart>

      <div className="rounded-card border-action-muted bg-action-soft grid gap-4 border p-5 sm:p-6">
        <p className="text-ink flex items-start gap-3">
          <IconClock className="text-action-ink mt-0.5 size-5 shrink-0" />
          <span>{frenchSpacing(t.visitNotice)}</span>
        </p>
        <FormMessage>{message}</FormMessage>
        <Button
          type="submit"
          size="lg"
          variant="action"
          className="w-full sm:w-auto sm:justify-self-start"
          disabled={outOfZone || pending}
          aria-busy={pending || undefined}
        >
          {pending ? cleaningTexts.common.sending : t.submit}
        </Button>
      </div>
    </form>
  );
}

/**
 * Demande de devis : reprend la simulation transmise dans l'adresse (`/nettoyage/devis?…`). Les zones
 * desservies viennent de la page (lues par le serveur), sinon le navigateur les relit.
 */
export function QuoteRequestPanel({ zones: initialZones }: { zones: ReadonlyArray<ServedZone> | null }) {
  const zonesState = useZones(initialZones);
  const [created, setCreated] = useState<QuoteRequest | null>(null);
  const params = useSearchParams();
  const draft = useMemo(() => draftFromParams(new URLSearchParams(params.toString())), [params]);

  if (created) return <Success request={created} />;
  if (!draft) {
    return (
      <div className="rounded-card border-line-strong grid justify-items-start gap-4 border border-dashed p-6 sm:p-8">
        <Heading as="h2" size="h3">
          {t.missingTitle}
        </Heading>
        <p className="text-ink-muted">{t.missingText}</p>
        <ButtonLink href={cleaningPaths.simulator} variant="action">
          {t.toSimulator}
        </ButtonLink>
      </div>
    );
  }
  if (zonesState.status === 'loading') {
    return (
      <p role="status" className="text-ink-muted">
        {t.loadingZones}
      </p>
    );
  }
  if (zonesState.status === 'error') {
    return (
      <div className="grid justify-items-start gap-4">
        <FormMessage>{`${cleaningTexts.simulator.zonesError} ${describeCleaningError(zonesState.error).message}`}</FormMessage>
        <Button variant="secondary" onClick={zonesState.retry}>
          {cleaningTexts.common.retry}
        </Button>
      </div>
    );
  }
  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-start">
      <RequestForm draft={draft} zones={zonesState.zones} onCreated={setCreated} />
      <Recap draft={draft} />
    </div>
  );
}
