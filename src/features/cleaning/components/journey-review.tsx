'use client';

import Link from 'next/link';
import { type ReactNode, useCallback, useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { FormMessage } from '@/components/ui/field';
import { Heading } from '@/components/ui/heading';
import { IconClock } from '@/components/ui/icons';
import { ContextSwitcher, InlineLogin, ProfileForm } from '@/features/identity';
import { ApiError, session, useSession } from '@/lib/api';
import { formatShortDate } from '@/lib/format';
import { frenchSpacing } from '@/lib/typography';
import { requestQuoteGroup } from '@/features/cleaning/api';
import { describeCleaningError } from '@/features/cleaning/errors';
import { idempotentSubmission } from '@/features/cleaning/idempotency';
import {
  type AddressDraft,
  buildGroupInput,
  communeOf,
  type JourneyDraft,
  type JourneyErrors,
  landmarkOf,
  locateContractField,
  outOfZone,
  placeOf,
  type RawAnswers,
  servicesOf,
  stepErrors,
} from '@/features/cleaning/journey';
import { journeyTexts, slotPeriods } from '@/features/cleaning/journey-texts';
import { cleaningPaths } from '@/features/cleaning/paths';
import type { FormField, PlaceService, RequestGroup } from '@/features/cleaning/schemas';
import { cleaningTexts } from '@/features/cleaning/texts';
import type { StepProps } from './journey';
import { OutOfZoneNotice, useResolveLocation } from './journey-address';
import { JourneyEstimate } from './journey-estimate';

const t = journeyTexts.review;

/** Réponse lisible : « 180 m² », « Très sale », « Oui ». */
function answerText(field: FormField, raw: string | undefined): string | null {
  const value = (raw ?? '').trim();
  if (!value) return null;
  if (field.type === 'number') return field.unitLabel ? `${value} ${field.unitLabel}` : value;
  if (field.type === 'boolean') {
    return value === 'yes' ? journeyTexts.services.yes : value === 'no' ? journeyTexts.services.no : null;
  }
  return field.choices.find((choice) => choice.code === value)?.label ?? null;
}

function answerLines(fields: ReadonlyArray<FormField>, raw: RawAnswers): string[] {
  return fields.flatMap((field) => {
    const text = answerText(field, raw[field.code]);
    return text ? [`${field.label} : ${text}`] : [];
  });
}

/** Une prestation du récapitulatif : réponses, options cochées et fréquence. */
function ServiceRecap({ service, draft }: { service: PlaceService; draft: JourneyDraft }) {
  const answers = draft.answers[service.code];
  if (!answers) return null;
  const options = service.form.options.filter((option) => answers.options[option.code]);
  const frequency = service.form.frequencies.find((item) => item.code === answers.frequency);
  return (
    <li className="grid gap-1 py-3">
      <p className="text-ink font-semibold">{service.name}</p>
      <p className="text-small text-ink-muted">
        {[
          ...answerLines(service.form.fields, answers.fields),
          ...options.map((option) => {
            const details = answerLines(option.fields, answers.options[option.code] ?? {});
            return details.length ? `${option.label} (${details.join(', ')})` : option.label;
          }),
          ...(frequency ? [`${t.frequency} : ${frequency.label}`] : []),
        ].join(' · ')}
      </p>
    </li>
  );
}

/** Ligne du récapitulatif, avec « Modifier » qui ramène à l'étape. */
function RecapRow({
  label,
  onEdit,
  editLabel,
  children,
}: {
  label: string;
  onEdit: () => void;
  editLabel: string;
  children: ReactNode;
}) {
  return (
    <div className="grid gap-1 py-4 sm:grid-cols-[10rem_minmax(0,1fr)_auto] sm:gap-4">
      <dt className="text-small text-ink-muted font-semibold">{label}</dt>
      <dd className="text-ink min-w-0">{children}</dd>
      <dd className="sm:text-right">
        <Button variant="ghost" onClick={onEdit} className="-ml-3 sm:ml-0" aria-label={editLabel}>
          {journeyTexts.edit}
        </Button>
      </dd>
    </div>
  );
}

function addressText(address: AddressDraft, commune: string | null): string {
  return [landmarkOf(address), commune].filter(Boolean).join(', ');
}

type Phase = 'checking' | 'anonymous' | 'unavailable' | 'ready';

/** Session au récapitulatif : reprise silencieuse (cookie de renouvellement), sinon connexion intégrée. */
function useAccountPhase(): [Phase, () => void] {
  const current = useSession();
  const [phase, setPhase] = useState<Phase>('checking');
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let active = true;
    session.restore().then((result) => {
      if (!active) return;
      setPhase(result.status === 'authenticated' ? 'ready' : result.status);
    });
    return () => {
      active = false;
    };
  }, [attempt]);
  return [
    current ? 'ready' : phase === 'ready' ? 'anonymous' : phase,
    () => setAttempt((value) => value + 1),
  ];
}

/**
 * Étape 5 : récapitulatif, estimation avec la commune, compte (connexion par téléphone intégrée, profil,
 * contexte particulier ou entreprise), puis envoi de la demande groupée
 * (`POST /cleaning/quote-request-groups`, `Idempotency-Key`). Aucune saisie n'est perdue : le brouillon
 * reste dans l'onglet jusqu'à l'envoi réussi.
 */
export function ReviewStep({
  draft,
  catalog,
  zones,
  update,
  goTo,
  onSent,
}: StepProps & {
  goTo: (step: number, errors?: JourneyErrors) => void;
  onSent: (group: RequestGroup) => void;
}) {
  const current = useSession();
  const [phase, retry] = useAccountPhase();
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<ReactNode>(null);
  const [needsProfile, setNeedsProfile] = useState(false);
  const submission = useRef(idempotentSubmission());
  const setResolved = useCallback(
    (resolved: AddressDraft['resolved']) =>
      update((value) => ({ ...value, address: { ...value.address, resolved } })),
    [update],
  );
  // Une fois connecté, la commune de la position est retrouvée avant l'envoi.
  useResolveLocation(phase === 'ready' ? draft.address : { ...draft.address, location: null }, setResolved);

  const place = placeOf(catalog, draft.placeType);
  const services = servicesOf(catalog, place).filter((service) => draft.services.includes(service.code));
  const commune = communeOf(draft.address, zones);
  const away = outOfZone(draft.address);
  const steps = journeyTexts.steps;
  const context = current?.activeContext;
  const business = context?.type === 'business';

  async function send() {
    if (pending) return;
    setMessage(null);
    const built = buildGroupInput(draft, catalog, zones);
    if (!built.input) {
      return goTo(built.invalidStep, stepErrors(built.invalidStep, draft, catalog, zones));
    }
    const { input } = built;
    setPending(true);
    try {
      const group = await requestQuoteGroup(input, submission.current.keyFor(input));
      submission.current.done();
      onSent(group);
    } catch (caught) {
      const view = describeCleaningError(caught);
      const located = view.path ? locateContractField(view.path, input.items) : null;
      if (view.kind === 'profile') setNeedsProfile(true);
      else if (view.kind === 'zone' || view.kind === 'location') {
        if (view.kind === 'location') setResolved({ commune: null, served: false, displayAddress: null });
        goTo(2, { 'address.commune': view.message });
      } else if (view.kind === 'slots') goTo(3, { slots: view.message });
      else if (view.kind === 'field' && located) goTo(located.step, { [located.key]: view.message });
      else if (view.kind === 'catalog') {
        setMessage(
          <>
            {view.message}{' '}
            <button
              type="button"
              onClick={() => goTo(1)}
              className="font-semibold underline underline-offset-4"
            >
              {t.fixStep(steps[1] ?? '')}
            </button>
          </>,
        );
      } else if (view.kind === 'tooManyOpen') {
        setMessage(
          <>
            {view.message}{' '}
            <Link href={cleaningPaths.space} className="font-semibold underline underline-offset-4">
              {t.tooManyOpen}
            </Link>
          </>,
        );
      } else if (view.kind === 'organizationSuspended') {
        setMessage(cleaningTexts.common.organizationSuspendedRequest);
      } else if (caught instanceof ApiError && caught.status === 401) {
        setMessage(t.loginFirst);
      } else setMessage(view.message);
    } finally {
      setPending(false);
    }
  }

  const name = [current?.user.firstName, current?.user.lastName].filter(Boolean).join(' ');

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_21rem] lg:items-start">
      <div className="grid min-w-0 gap-8">
        <dl className="divide-line border-line divide-y border-y">
          <RecapRow label={t.place} onEdit={() => goTo(0)} editLabel={`${journeyTexts.edit} : ${steps[0]}`}>
            {place?.label ?? draft.placeType}
          </RecapRow>
          <RecapRow
            label={t.services}
            onEdit={() => goTo(1)}
            editLabel={`${journeyTexts.edit} : ${steps[1]}`}
          >
            <ul className="divide-line -my-3 divide-y">
              {services.map((service) => (
                <ServiceRecap key={service.code} service={service} draft={draft} />
              ))}
            </ul>
          </RecapRow>
          <RecapRow label={t.address} onEdit={() => goTo(2)} editLabel={`${journeyTexts.edit} : ${steps[2]}`}>
            <p>{addressText(draft.address, commune ?? draft.address.resolved?.commune ?? null)}</p>
            <p className="text-small text-ink-muted mt-1">
              {t.position} : {draft.address.location ? t.positionSet : t.none}
            </p>
          </RecapRow>
          <RecapRow label={t.slots} onEdit={() => goTo(3)} editLabel={`${journeyTexts.edit} : ${steps[3]}`}>
            <ul className="grid gap-1">
              {draft.slots
                .filter((slot) => slot.date)
                .map((slot) => (
                  <li key={`${slot.date}-${slot.period}`}>
                    {formatShortDate(`${slot.date}T12:00:00Z`)} ·{' '}
                    {slotPeriods.find((period) => period.value === slot.period)?.label}
                  </li>
                ))}
            </ul>
            {draft.comment.trim() ? (
              <p className="text-small text-ink-muted mt-2">
                {t.comment} : {draft.comment.trim()}
              </p>
            ) : null}
          </RecapRow>
        </dl>

        {away ? <OutOfZoneNotice commune={away.commune} zones={zones} /> : null}
      </div>

      {/* Téléphone : l'estimation suit le récapitulatif ; ordinateur : colonne de droite. */}
      <JourneyEstimate
        catalog={catalog}
        draft={draft}
        commune={commune}
        className="lg:sticky lg:top-[calc(var(--header-h)+1.5rem)] lg:col-start-2 lg:row-span-2 lg:row-start-1"
      />

      <div className="grid min-w-0 gap-8 lg:col-start-1">
        <section
          aria-labelledby="demande-compte-titre"
          className="rounded-card border-line bg-surface grid gap-5 border p-5 shadow-xs sm:p-6"
        >
          {phase === 'anonymous' ? (
            <>
              <p id="demande-compte-titre" className="text-ink font-medium">
                {frenchSpacing(t.loginLead)}
              </p>
              <InlineLogin headingLevel="h3" />
            </>
          ) : (
            <Heading as="h3" size="h3" id="demande-compte-titre">
              {t.accountTitle}
            </Heading>
          )}
          {phase === 'checking' ? (
            <p role="status" className="text-ink-muted">
              {t.checking}
            </p>
          ) : null}
          {phase === 'unavailable' ? (
            <div className="grid justify-items-start gap-3">
              <FormMessage>{journeyTexts.catalogError}</FormMessage>
              <Button variant="secondary" onClick={retry}>
                {journeyTexts.retry}
              </Button>
            </div>
          ) : null}
          {phase === 'ready' && current?.profileIncomplete ? <InlineLogin headingLevel="h3" /> : null}
          {phase === 'ready' && current && !current.profileIncomplete ? (
            needsProfile ? (
              <div className="grid gap-4">
                <FormMessage tone="info">{t.profileNeeded}</FormMessage>
                <ProfileForm autoFocus headingLevel="h3" onDone={() => setNeedsProfile(false)} />
              </div>
            ) : (
              <div className="grid gap-3">
                {name ? <p className="text-ink font-semibold">{t.signedInAs(name)}</p> : null}
                <ContextSwitcher />
                <p className="text-small text-ink-muted">
                  {frenchSpacing(
                    business
                      ? t.business(context?.organizationName ?? null)
                      : `${t.individual} ${t.businessLater}`,
                  )}
                </p>
              </div>
            )
          ) : null}
        </section>

        <div className="rounded-card border-action-muted bg-action-soft grid gap-4 border p-5 sm:p-6">
          <p className="text-ink flex items-start gap-3">
            <IconClock className="text-action-ink mt-0.5 size-5 shrink-0" />
            <span>{frenchSpacing(t.visitNotice)}</span>
          </p>
          <FormMessage>{message}</FormMessage>
          <Button
            size="lg"
            variant="action"
            className="w-full sm:w-auto sm:justify-self-start"
            onClick={send}
            disabled={
              phase !== 'ready' || !current || current.profileIncomplete || needsProfile || !!away || pending
            }
            aria-busy={pending || undefined}
          >
            {pending ? t.sending : t.submit}
          </Button>
          {phase !== 'ready' ? <p className="text-small text-ink-muted">{t.loginFirst}</p> : null}
        </div>
      </div>
    </div>
  );
}
