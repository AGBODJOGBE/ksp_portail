'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { type FormEvent, useId, useMemo, useRef, useState } from 'react';
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
import { formatShortDate } from '@/lib/format';
import { cleaningPaths } from '@/features/cleaning/paths';
import { idempotentSubmission } from '@/features/cleaning/idempotency';
import {
  type CustomerKind,
  MAX_SLOTS,
  type PeriodValue,
  type RequestErrors,
  type RequestFormValues,
  buildQuoteRequest,
  firstAllowedDate,
  recurrencePeriod,
} from '@/features/cleaning/request-form';
import type { QuoteRequest, ServedZone } from '@/features/cleaning/schemas';
import { cleaningTexts, frequencies, premisesTypes } from '@/features/cleaning/texts';
import { optionLabels, quantityLabel, serviceName, useServices } from '@/features/cleaning/use-services';
import { useZones } from '@/features/cleaning/use-zones';
import { OTHER_COMMUNE, zoneFor, zonesSentence } from '@/features/cleaning/zones';

const t = cleaningTexts.request;

/**
 * Type de client de la demande : celui du contexte actif de la session (`activeContext`), que la gateway
 * applique elle-même. Il se change ici avec le sélecteur de contexte (ADR-027) : le formulaire suit.
 */
function ContextNotice({ kind, organizationName }: { kind: CustomerKind; organizationName: string | null }) {
  const c = cleaningTexts.context;
  return (
    <section aria-labelledby="contexte-titre" className="grid gap-3">
      <p id="contexte-titre" className="text-ink font-semibold">
        {t.customerKind}
      </p>
      <ContextSwitcher />
      <p className="text-small text-ink-muted">
        {frenchSpacing(
          kind === 'business'
            ? c.requestBusiness(organizationName)
            : `${c.requestIndividual} ${c.businessLater}`,
        )}
      </p>
    </section>
  );
}

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
    <section aria-labelledby="besoin-titre" className="rounded-card border-line bg-surface-muted border p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Heading as="h2" size="h3" id="besoin-titre">
          {t.summaryTitle}
        </Heading>
        <Link
          href={cleaningPaths.simulator}
          className="text-accent-ink inline-flex min-h-11 items-center text-sm font-semibold underline-offset-4 hover:underline"
        >
          {t.editSimulation}
        </Link>
      </div>
      <dl className="mt-3 grid gap-2 sm:grid-cols-[10rem_1fr]">
        {rows.map(([label, value]) => (
          <div key={label} className="contents">
            <dt className="text-small text-ink-muted">{label}</dt>
            <dd className="text-ink font-semibold">{value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

function Success({ request }: { request: QuoteRequest }) {
  return (
    <div role="status" className="rounded-card border-success bg-success-soft border p-6">
      <p className="font-display text-ink inline-flex items-center gap-2 text-xl font-semibold">
        <IconCheck className="text-success size-5" />
        {t.successTitle}
      </p>
      <p className="text-ink-muted mt-2">{frenchSpacing(t.successText)}</p>
      <ButtonLink href={cleaningPaths.request(request.id)} className="mt-5">
        {t.seeRequest}
      </ButtonLink>
    </div>
  );
}

function RequestForm({ draft, zones }: { draft: SimulationDraft; zones: ReadonlyArray<ServedZone> }) {
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
  const [message, setMessage] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [needsProfile, setNeedsProfile] = useState(false);
  const [created, setCreated] = useState<QuoteRequest | null>(null);

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
    else if (found.days) daysRef.current?.focus();
    else if (found.team) teamRef.current?.focus();
    else if (found.address) addressRef.current?.focus();
    else if (found.slots) slotsRef.current?.querySelector('input')?.focus();
    else if (found.recurrence) recurrenceRef.current?.querySelector('input')?.focus();
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
      setCreated(request);
    } catch (caught) {
      const view = describeCleaningError(caught);
      if (view.kind === 'profile') setNeedsProfile(true);
      else if (view.kind === 'zone') {
        setErrors({ commune: view.message });
        focusFirst({ commune: view.message });
      } else if (view.kind === 'slots') {
        setErrors({ slots: view.message });
        focusFirst({ slots: view.message });
      } else if (view.kind === 'organizationSuspended') {
        setMessage(cleaningTexts.common.organizationSuspendedRequest);
      } else setMessage(view.message);
    } finally {
      setPending(false);
    }
  }

  if (created) return <Success request={created} />;
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
  return (
    <form noValidate onSubmit={submit} className="grid gap-8">
      <p className="rounded-card border-accent-muted bg-accent-soft text-ink flex items-start gap-3 border p-4">
        <IconClock className="text-accent-ink mt-0.5 size-5 shrink-0" />
        <span>{frenchSpacing(t.visitNotice)}</span>
      </p>

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

      {period ? (
        <fieldset
          ref={recurrenceRef}
          aria-describedby={errors.recurrence ? recurrenceIds.error : recurrenceIds.hint}
          className="grid gap-3"
        >
          <legend className="text-ink font-semibold">{t.recurrenceTitle}</legend>
          <p id={recurrenceIds.hint} className="text-small text-ink-muted">
            {t.recurrenceHint}
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            <TextField
              id={`${baseId}-passages`}
              label={period === 'week' ? t.visitsPerWeek : t.visitsPerMonth}
              inputMode="numeric"
              value={values.visits}
              onChange={(event) => update({ visits: event.target.value })}
            />
            <TextField
              id={`${baseId}-duree`}
              label={t.durationMonths}
              inputMode="numeric"
              value={values.months}
              onChange={(event) => update({ months: event.target.value })}
            />
          </div>
          {errors.recurrence ? <FieldError id={recurrenceIds.error}>{errors.recurrence}</FieldError> : null}
        </fieldset>
      ) : null}

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
          aria-invalid={errors.commune || outOfZone ? true : undefined}
          aria-describedby={errors.commune || outOfZone ? `${baseId}-commune-erreur` : undefined}
          className={inputClasses({ invalid: !!errors.commune || outOfZone })}
        >
          {zones.map((zone) => (
            <option key={zone.code} value={zone.commune}>
              {zone.commune}
            </option>
          ))}
          <option value={OTHER_COMMUNE}>{t.otherCommune}</option>
        </select>
        {errors.commune || outOfZone ? (
          <FieldError id={`${baseId}-commune-erreur`}>
            {errors.commune ??
              `${cleaningTexts.simulator.outOfZoneTitle}. ${cleaningTexts.simulator.outOfZoneText(zonesText)}`}
          </FieldError>
        ) : null}
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

      <fieldset
        ref={slotsRef}
        aria-describedby={errors.slots ? `${slotIds.hint} ${slotIds.error}` : slotIds.hint}
        className="grid gap-4"
      >
        <legend className="text-ink font-semibold">{t.slotsTitle}</legend>
        <p id={slotIds.hint} className="text-small text-ink-muted">
          {t.slotsHint(formatShortDate(`${minDate}T12:00:00Z`))}
        </p>
        {values.slots.map((slot, index) => (
          <div key={index} className="grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
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
      </fieldset>

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
        <p id={`${baseId}-commentaire-aide`} className="text-small text-ink-muted mt-1">
          {t.commentHint}
        </p>
        <textarea
          id={`${baseId}-commentaire`}
          aria-describedby={`${baseId}-commentaire-aide`}
          maxLength={2000}
          rows={4}
          value={values.comment}
          onChange={(event) => update({ comment: event.target.value })}
          className={inputClasses({ className: 'mt-2 py-3' })}
        />
      </div>

      <FormMessage>{message}</FormMessage>
      <Button
        type="submit"
        size="lg"
        className="w-full sm:w-auto sm:justify-self-start"
        disabled={outOfZone}
        aria-busy={pending || undefined}
      >
        {pending ? cleaningTexts.common.sending : t.submit}
      </Button>
    </form>
  );
}

/**
 * Demande de devis : reprend la simulation transmise dans l'adresse (`/nettoyage/devis?…`). Les zones
 * desservies viennent de la page (lues par le serveur), sinon le navigateur les relit.
 */
export function QuoteRequestPanel({ zones: initialZones }: { zones: ReadonlyArray<ServedZone> | null }) {
  const zonesState = useZones(initialZones);
  const params = useSearchParams();
  const draft = useMemo(() => draftFromParams(new URLSearchParams(params.toString())), [params]);

  if (!draft) {
    return (
      <div className="grid justify-items-start gap-4">
        <Heading as="h2" size="h3">
          {t.missingTitle}
        </Heading>
        <p className="text-ink-muted">{t.missingText}</p>
        <ButtonLink href={cleaningPaths.simulator}>{t.toSimulator}</ButtonLink>
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
    <div className="grid gap-8">
      <Recap draft={draft} />
      <RequestForm draft={draft} zones={zonesState.zones} />
    </div>
  );
}
