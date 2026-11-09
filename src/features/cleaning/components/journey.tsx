'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { lazy, type ReactNode, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { SignatureProgress } from '@/components/ui/brand/signature';
import { Button, ButtonArrow, ButtonLink } from '@/components/ui/button';
import { FieldError, FormMessage } from '@/components/ui/field';
import { IconArrowLeft, IconArrowRight } from '@/components/ui/icons';
import { contactHref } from '@/config/navigation';
import { cn } from '@/lib/cn';
import { frenchSpacing } from '@/lib/typography';
import { getPlaceCatalog } from '@/features/cleaning/api';
import { describeCleaningError } from '@/features/cleaning/errors';
import {
  clearDraft,
  emptyDraft,
  fieldId,
  firstInvalidStep,
  hasProgress,
  type JourneyDraft,
  type JourneyErrors,
  loadDraft,
  placeOf,
  saveDraft,
  servicesOf,
  stepErrors,
  STEPS,
  visiblePlaces,
  withPlace,
} from '@/features/cleaning/journey';
import { journeyTexts as t } from '@/features/cleaning/journey-texts';
import { cleaningPaths } from '@/features/cleaning/paths';
import type { PlaceCatalog, RequestGroup, ServedZone } from '@/features/cleaning/schemas';
import { useZones } from '@/features/cleaning/use-zones';
import { PlaceIcon } from './place-icon';

// Étapes suivantes et confirmation : téléchargées seulement quand le client y arrive.
const ServicesStep = lazy(() => import('./journey-services').then((m) => ({ default: m.ServicesStep })));
const AddressStep = lazy(() => import('./journey-address').then((m) => ({ default: m.AddressStep })));
const SlotsStep = lazy(() => import('./journey-slots').then((m) => ({ default: m.SlotsStep })));
const ReviewStep = lazy(() => import('./journey-review').then((m) => ({ default: m.ReviewStep })));
const JourneySent = lazy(() => import('./journey-sent').then((m) => ({ default: m.JourneySent })));

/** Ce que reçoit chaque étape du parcours. */
export interface StepProps {
  draft: JourneyDraft;
  catalog: PlaceCatalog;
  zones: ReadonlyArray<ServedZone>;
  errors: JourneyErrors;
  update: (change: (draft: JourneyDraft) => JourneyDraft) => void;
  clearError: (key: string) => void;
}

const PANEL = 'rounded-card border-line bg-surface border p-6 sm:p-8';

function Waiting({ children }: { children: ReactNode }) {
  return (
    <p role="status" className={cn(PANEL, 'text-ink-muted')}>
      {children}
    </p>
  );
}

/** Étape 1 : cartes des types de lieu (boutons radio natifs, flèches du clavier comprises). */
function PlaceStep({ draft, catalog, errors, update, clearError }: StepProps) {
  const places = visiblePlaces(catalog);
  const error = errors['place'];
  return (
    <fieldset aria-describedby={error ? `${fieldId('place')}-erreur` : undefined} className="grid gap-3">
      <legend className="sr-only">{t.place.title}</legend>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {places.map((place, index) => {
          const count = servicesOf(catalog, place).length;
          return (
            <label
              key={place.code}
              className={cn(
                'group rounded-card border-line bg-surface relative flex cursor-pointer gap-4 border p-4 shadow-xs sm:p-5',
                'ease-soft transition-[border-color,box-shadow,transform] duration-(--motion-fast) active:scale-[0.99]',
                'hover:border-line-strong hover:shadow-card has-[:checked]:border-action has-[:checked]:bg-action-soft has-[:checked]:shadow-card',
                'has-[:focus-visible]:outline-focus has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2',
              )}
            >
              <input
                type="radio"
                name="demande-lieu"
                id={index === 0 ? fieldId('place') : undefined}
                value={place.code}
                checked={draft.placeType === place.code}
                onChange={() => {
                  update((current) => withPlace(current, catalog, place.code));
                  clearError('place');
                }}
                className="sr-only"
              />
              <span
                aria-hidden="true"
                className="rounded-icon bg-brand text-on-brand group-hover:text-accent-bright group-has-[:checked]:bg-action group-has-[:checked]:text-on-action grid size-12 shrink-0 place-items-center transition-colors duration-(--motion-fast)"
              >
                <PlaceIcon icon={place.icon} className="size-6" />
              </span>
              <span className="grid min-w-0 gap-1">
                <span className="font-display text-ink text-lg font-semibold">{place.label}</span>
                {place.description ? (
                  <span className="text-small text-ink-muted">{frenchSpacing(place.description)}</span>
                ) : null}
                <span className="text-small text-action-ink font-semibold">{t.place.services(count)}</span>
              </span>
            </label>
          );
        })}
      </div>
      {error ? <FieldError id={`${fieldId('place')}-erreur`}>{error}</FieldError> : null}
    </fieldset>
  );
}

type CatalogState =
  { status: 'loading' } | { status: 'error'; message: string } | { status: 'ready'; catalog: PlaceCatalog };

/** Brouillon de départ : celui de la session de l'onglet, ou le lieu choisi sur la page Nettoyage. */
function startingDraft(catalog: PlaceCatalog, zones: ReadonlyArray<ServedZone>, place: string | null) {
  const saved = loadDraft();
  const offered = place && placeOf(catalog, place) ? place : null;
  if (saved && (!offered || saved.placeType === offered)) {
    const step = firstInvalidStep(saved.step, saved, catalog, zones);
    return { draft: { ...saved, step }, restored: hasProgress(saved) };
  }
  if (offered) return { draft: { ...withPlace(emptyDraft(), catalog, offered), step: 1 }, restored: false };
  return { draft: emptyDraft(), restored: false };
}

/**
 * Demande de devis du Nettoyage par lieu (ADR-034), en assistant : lieu, prestations et estimation
 * en direct, adresse (position GPS), disponibilités, récapitulatif et envoi (connexion demandée à
 * cette étape seulement), confirmation. Le brouillon est gardé dans l'onglet (`sessionStorage`).
 */
export function CleaningJourney({
  catalog: initialCatalog,
  zones: initialZones,
}: {
  /** Catalogue lu par le serveur ; `null` s'il n'a pas pu le lire (le navigateur le relit). */
  catalog: PlaceCatalog | null;
  zones: ReadonlyArray<ServedZone> | null;
}) {
  const params = useSearchParams();
  const sentId = params.get('groupe');
  const place = params.get('lieu');
  const { replace } = useRouter();
  const zonesState = useZones(initialZones);
  const [catalogState, setCatalogState] = useState<CatalogState>(
    initialCatalog ? { status: 'ready', catalog: initialCatalog } : { status: 'loading' },
  );
  const [attempt, setAttempt] = useState(0);
  const [edited, setEdited] = useState<JourneyDraft | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const [errors, setErrors] = useState<JourneyErrors>({});
  const [sent, setSent] = useState<RequestGroup | null>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const moved = useRef(false);

  useEffect(() => {
    if (initialCatalog) return;
    let active = true;
    getPlaceCatalog().then(
      (catalog) => active && setCatalogState({ status: 'ready', catalog }),
      (error: unknown) =>
        active && setCatalogState({ status: 'error', message: describeCleaningError(error).message }),
    );
    return () => {
      active = false;
    };
  }, [initialCatalog, attempt]);

  const catalog = catalogState.status === 'ready' ? catalogState.catalog : null;
  const zones = zonesState.status === 'ready' ? zonesState.zones : null;

  // Brouillon de l'onglet (rendu dans le navigateur seulement, voir `lazy.tsx`), tant que rien n'a changé.
  const start = useMemo(
    () => (catalog && zones && !sentId ? startingDraft(catalog, zones, place) : null),
    [catalog, zones, sentId, place],
  );
  const draft = edited ?? start?.draft ?? null;
  const restored = !!start?.restored && !edited && !dismissed;

  useEffect(() => {
    if (edited) saveDraft(edited);
  }, [edited]);

  // Nouvelle étape : le focus va à son titre (lu par les lecteurs d'écran), pas au premier chargement.
  const step = draft?.step ?? 0;
  useEffect(() => {
    if (!moved.current) return;
    headingRef.current?.focus();
  }, [step]);

  const initial = start?.draft ?? null;
  const update = useCallback(
    (change: (current: JourneyDraft) => JourneyDraft) => {
      setEdited((current) => {
        const base = current ?? initial;
        return base ? change(base) : current;
      });
    },
    [initial],
  );
  const clearError = useCallback((key: string) => {
    setErrors((current) => {
      if (!(key in current)) return current;
      const next = { ...current };
      delete next[key];
      return next;
    });
  }, []);

  const goTo = useCallback(
    (target: number, found: JourneyErrors = {}) => {
      moved.current = true;
      setErrors(found);
      update((current) => ({ ...current, step: target }));
      const first = Object.keys(found)[0];
      // Erreurs : le focus va au premier champ en cause, une fois l'étape affichée.
      if (first) window.setTimeout(() => document.getElementById(fieldId(first))?.focus(), 60);
    },
    [update],
  );

  if (sentId) {
    return (
      <Suspense fallback={<Waiting>{t.done.loading}</Waiting>}>
        <JourneySent id={sentId} group={sent?.groupId === sentId ? sent : null} catalog={catalog} />
      </Suspense>
    );
  }

  if (catalogState.status === 'error' || zonesState.status === 'error') {
    const message =
      catalogState.status === 'error'
        ? catalogState.message
        : zonesState.status === 'error'
          ? describeCleaningError(zonesState.error).message
          : '';
    return (
      <div className={cn(PANEL, 'grid justify-items-start gap-4')}>
        <FormMessage>{`${t.catalogError} ${message}`}</FormMessage>
        <Button
          variant="secondary"
          onClick={() => {
            if (catalogState.status === 'error') {
              setCatalogState({ status: 'loading' });
              setAttempt((value) => value + 1);
            }
            if (zonesState.status === 'error') zonesState.retry();
          }}
        >
          {t.retry}
        </Button>
      </div>
    );
  }
  if (!catalog || !zones || !draft) return <Waiting>{t.loading}</Waiting>;
  if (!visiblePlaces(catalog).length) {
    return (
      <div className={cn(PANEL, 'grid justify-items-start gap-4')}>
        <p className="text-ink-muted">{t.empty}</p>
        <ButtonLink href={contactHref('nettoyage-devis')} variant="secondary">
          {t.contactUs}
        </ButtonLink>
      </div>
    );
  }

  const props: StepProps = { draft, catalog, zones, errors, update, clearError };
  const name = STEPS[step];
  const titles = {
    place: [t.place.title, t.place.hint],
    services: [t.services.title, t.services.hint],
    address: [t.address.title, t.address.hint],
    slots: [t.slots.title, null],
    review: [t.review.title, t.review.hint],
  } as const;
  const [title, hint] = titles[name ?? 'place'];
  const last = step === STEPS.length - 1;

  function next() {
    if (!draft || !catalog || !zones) return;
    const found = stepErrors(step, draft, catalog, zones);
    if (Object.keys(found).length) return goTo(step, found);
    goTo(step + 1);
  }

  return (
    <div className="grid gap-6 sm:gap-8">
      <SignatureProgress steps={t.steps.map((label) => ({ label }))} current={step} label={t.progressLabel} />

      {restored ? (
        <div className="rounded-control border-line bg-surface-muted flex flex-wrap items-center justify-between gap-3 border p-4">
          <p role="status" className="text-small text-ink">
            {t.draftRestored}
          </p>
          <Button
            variant="ghost"
            onClick={() => {
              clearDraft();
              setDismissed(true);
              setErrors({});
              moved.current = true;
              setEdited(emptyDraft());
              replace(cleaningPaths.journey, { scroll: false });
            }}
          >
            {t.restart}
          </Button>
        </div>
      ) : null}

      <section key={step} aria-labelledby="demande-etape-titre" className="swap-in grid gap-6">
        <div className="grid gap-2">
          <h2
            ref={headingRef}
            tabIndex={-1}
            id="demande-etape-titre"
            className="font-display text-ink text-h2 scroll-mt-[calc(var(--header-h)+1rem)] font-semibold focus:outline-none"
          >
            {title}
          </h2>
          {hint ? <p className="text-ink-muted max-w-reading">{frenchSpacing(hint)}</p> : null}
        </div>

        <Suspense
          fallback={
            <p role="status" className="text-ink-muted">
              {t.loading}
            </p>
          }
        >
          {name === 'place' ? <PlaceStep {...props} /> : null}
          {name === 'services' ? <ServicesStep {...props} /> : null}
          {name === 'address' ? <AddressStep {...props} /> : null}
          {name === 'slots' ? <SlotsStep {...props} /> : null}
          {name === 'review' ? (
            <ReviewStep
              {...props}
              goTo={goTo}
              onSent={(group) => {
                clearDraft();
                setSent(group);
                replace(cleaningPaths.journeySent(group.groupId), { scroll: true });
              }}
            />
          ) : null}
        </Suspense>

        {Object.keys(errors).length > 1 && !last ? <FormMessage>{t.fixErrors}</FormMessage> : null}

        <div
          className={cn(
            'border-line flex flex-col-reverse gap-3 border-t pt-6 sm:flex-row sm:items-center',
            step > 0 ? 'sm:justify-between' : 'sm:justify-end',
          )}
        >
          {step > 0 ? (
            <Button variant="ghost" size="lg" onClick={() => goTo(step - 1)} className="sm:-ml-3">
              <IconArrowLeft />
              {t.back}
            </Button>
          ) : null}
          {!last ? (
            <Button variant="action" size="lg" onClick={next} className="w-full sm:w-auto">
              {step === STEPS.length - 2 ? t.toReview : t.next}
              <ButtonArrow>
                <IconArrowRight />
              </ButtonArrow>
            </Button>
          ) : null}
        </div>
      </section>
    </div>
  );
}
