'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Agenda } from '@/components/ui/agenda';
import { Badge } from '@/components/ui/badge';
import { SignatureProgress } from '@/components/ui/brand/signature';
import { Button, ButtonLink } from '@/components/ui/button';
import { IconAlert, IconArrowRight, IconSearch } from '@/components/ui/icons';
import { Skeleton } from '@/components/ui/skeleton';
import { MetierIcon } from '@/components/sections/metier-icon';
import { type MetierId, metiers } from '@/config/metiers';
import { navigation } from '@/config/navigation';
import { listMissions, listRequests } from '@/features/cleaning/api';
import { describeCleaningError } from '@/features/cleaning/errors';
import { ownedBy } from '@/features/cleaning/owned';
import { cleaningPaths } from '@/features/cleaning/paths';
import type { Mission, QuoteRequest } from '@/features/cleaning/schemas';
import { actorLabels } from '@/features/cleaning/texts';
import {
  cleaningAgenda,
  cleaningTrackItems,
  countByState,
  filterTrackItems,
  TRACK_STATES,
  type TrackFilter,
  type TrackItem,
  type TrackState,
} from '@/features/cleaning/tracking';
import { trackingTexts as t } from '@/features/cleaning/tracking-texts';
import { serviceName, useServices } from '@/features/cleaning/use-services';
import { contextKey, useSession } from '@/lib/api';
import { cn } from '@/lib/cn';
import { formatShortDate } from '@/lib/format';
import { useResource } from '@/lib/use-resource';

type Data = { requests: QuoteRequest[]; missions: Mission[]; more: boolean };

/** Première page des demandes et des missions, lues ensemble ; `more` : d'autres pages existent. */
async function load(): Promise<Data> {
  const [requests, missions] = await Promise.all([listRequests(), listMissions()]);
  return {
    requests: requests.data,
    missions: missions.data,
    more: !!requests.nextCursor || !!missions.nextCursor,
  };
}

/** Lecture filtrée sur le contexte actif (particulier ou entreprise). */
function useTracking(organizationId: string | null) {
  const services = useServices();
  const resource = useResource(load);
  const keep = ownedBy(organizationId);
  const name = (code: string) => serviceName(services, code);
  if (resource.state.status !== 'ready') return { resource, ready: null };
  const requests = resource.state.data.requests.filter(keep);
  const missions = resource.state.data.missions.filter(keep);
  return {
    resource,
    ready: {
      items: cleaningTrackItems(requests, missions, name),
      agenda: cleaningAgenda(requests, missions, name),
      more: resource.state.data.more,
    },
  };
}

/** Le contexte actif change : la lecture repart de zéro (clé). */
function useContextKey() {
  const key = contextKey(useSession());
  return { key: key ?? 'none', organizationId: key === 'personal' ? null : key };
}

/* Pastille de service : la couleur de la catégorie, le libellé suffit. */
const SERVICE_TONES: Partial<Record<MetierId, 'action'>> = { nettoyage: 'action' };
/** Libellé court d'un métier (« Nettoyage » pour « Nettoyage et assainissement »). */
const shortLabel = (label: string) => label.split(' ')[0] ?? label;

/** Services suivis aujourd'hui ; les autres métiers arrivent avec leurs données (« Bientôt »). */
const LIVE_SERVICES = new Set<MetierId>(['nettoyage']);

function LoadingCards() {
  return (
    <div role="status" className="grid gap-5 lg:grid-cols-2">
      <span className="sr-only">{t.loading}</span>
      {[0, 1, 2, 3].map((row) => (
        <span
          key={row}
          aria-hidden="true"
          className="rounded-card border-line bg-surface grid gap-4 border p-5 shadow-xs sm:p-6"
        >
          <span className="flex justify-between gap-4">
            <Skeleton className="h-6 w-28 rounded-full" />
            <Skeleton className="h-6 w-24 rounded-full" />
          </span>
          <Skeleton className="h-5 w-2/3" />
          <Skeleton className="h-3 w-1/2" />
          <Skeleton className="h-2 w-full rounded-full" />
          <Skeleton className="h-12 w-full" />
        </span>
      ))}
    </div>
  );
}

function ErrorPanel({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div
      role="alert"
      className="rounded-card border-line bg-surface grid justify-items-start gap-4 border p-6"
    >
      <p className="text-danger flex items-start gap-2 font-medium">
        <IconAlert className="mt-0.5 size-5 shrink-0" />
        {message}
      </p>
      <Button variant="outline" onClick={onRetry}>
        {t.retry}
      </Button>
    </div>
  );
}

/** Carte de suivi : service, état, titre, référence, date, fil à cinq étapes, prochaine étape, détail. */
function TrackCard({ item }: { item: TrackItem }) {
  const metier = metiers.find((entry) => entry.id === item.service);
  const titleId = `suivi-${item.key}`;
  const finished = item.step >= t.steps.length;
  return (
    <article
      aria-labelledby={titleId}
      className="rounded-card border-line bg-surface ease-soft hover:shadow-card has-[.stretched-link:focus-visible]:outline-focus relative flex h-full flex-col gap-4 border p-5 shadow-xs transition-[translate,box-shadow] duration-(--motion-slow) hover:-translate-y-0.5 has-[.stretched-link:focus-visible]:outline-2 has-[.stretched-link:focus-visible]:outline-offset-3 sm:p-6"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Badge tone={SERVICE_TONES[item.service] ?? 'brand'} className="font-display min-h-7 px-3 text-sm">
          {metier ? shortLabel(metier.label) : item.service}
        </Badge>
        <Badge tone={item.status.tone} dot>
          {item.status.label}
        </Badge>
      </div>
      <div>
        <h3 id={titleId} className="font-display text-h3 text-ink font-bold">
          {item.title}
        </h3>
        <p className="text-small text-ink-muted mt-1">
          <span className="font-mono">{t.reference(item.reference)}</span> ·{' '}
          {t.requestedOn(formatShortDate(item.date))}
        </p>
      </div>
      <SignatureProgress
        steps={t.steps.map((label) => ({ label }))}
        current={item.step}
        stopped={item.stopped}
        label={t.progress(item.title)}
      />
      {item.next || finished ? (
        <div className="bg-surface-muted rounded-control grid gap-1.5 p-3.5">
          <p className="text-small text-ink-muted flex flex-wrap items-center gap-x-2 gap-y-1 font-semibold">
            {t.nextStep}
            {item.actor ? (
              <Badge tone={item.actor === 'client' ? 'accent' : 'neutral'}>{actorLabels[item.actor]}</Badge>
            ) : null}
          </p>
          <p className="text-small text-ink">{finished ? t.done : item.next}</p>
          {item.link ? (
            // Au-dessus du lien étiré de la carte : un second lien, cliquable à part.
            <Link
              href={item.link.href}
              className="text-action-ink relative z-10 inline-flex min-h-11 items-center gap-1 justify-self-start text-sm font-semibold underline underline-offset-4"
            >
              {item.link.label}
              <IconArrowRight className="size-4" />
            </Link>
          ) : null}
        </div>
      ) : null}
      <Link
        href={item.href}
        className="stretched-link text-brand-ink font-display mt-auto inline-flex min-h-11 items-end gap-1.5 font-semibold underline underline-offset-4 focus-visible:outline-none"
      >
        {t.details}
        <span className="sr-only"> : {item.title}</span>
        <IconArrowRight className="size-4" />
      </Link>
    </article>
  );
}

const CHIP = cn(
  'inline-flex min-h-11 shrink-0 items-center gap-2 rounded-full border px-4 font-display font-medium whitespace-nowrap',
  'border-line bg-surface text-ink-muted hover:text-ink',
  'aria-pressed:border-brand aria-pressed:bg-brand-100 aria-pressed:text-ink aria-pressed:font-semibold',
  'disabled:cursor-not-allowed disabled:opacity-70 disabled:hover:text-ink-muted',
);

function Count({ value }: { value: number }) {
  return (
    <span className="bg-surface-muted text-ink rounded-full px-2 text-xs font-semibold tabular-nums">
      {value}
    </span>
  );
}

/** Filtres par état et par service : colonne sur ordinateur, rangées défilantes sur téléphone. */
function Filters({
  filter,
  setFilter,
  items,
}: {
  filter: TrackFilter;
  setFilter: (next: TrackFilter) => void;
  items: ReadonlyArray<TrackItem>;
}) {
  const counts = countByState(filterTrackItems(items, { ...filter, state: null }));
  const total = Object.values(counts).reduce((sum, value) => sum + value, 0);
  const row =
    '-mx-gutter px-gutter flex gap-2 overflow-x-auto pb-1 lg:mx-0 lg:flex-col lg:items-stretch lg:px-0';
  return (
    <div className="grid min-w-0 content-start gap-6 lg:sticky lg:top-[calc(var(--header-h)+1.5rem)]">
      <fieldset className="min-w-0">
        <legend className="font-display text-brand-ink mb-3 text-lg font-semibold">{t.statesTitle}</legend>
        <div className={row}>
          <button
            type="button"
            aria-pressed={filter.state === null}
            onClick={() => setFilter({ ...filter, state: null })}
            className={cn(CHIP, 'lg:justify-between')}
          >
            {t.allStates}
            <Count value={total} />
          </button>
          {TRACK_STATES.map((state) => (
            <button
              key={state}
              type="button"
              aria-pressed={filter.state === state}
              onClick={() => setFilter({ ...filter, state: filter.state === state ? null : state })}
              className={cn(CHIP, 'lg:justify-between')}
            >
              {t.states[state]}
              <Count value={counts[state]} />
            </button>
          ))}
        </div>
      </fieldset>
      <fieldset className="min-w-0">
        <legend className="font-display text-brand-ink mb-3 text-lg font-semibold">{t.servicesTitle}</legend>
        <div className={row}>
          <button
            type="button"
            aria-pressed={filter.service === null}
            onClick={() => setFilter({ ...filter, service: null })}
            className={CHIP}
          >
            {t.allServices}
          </button>
          {metiers.map((metier) => {
            const live = LIVE_SERVICES.has(metier.id);
            return (
              <button
                key={metier.id}
                type="button"
                disabled={!live}
                aria-pressed={live ? filter.service === metier.id : undefined}
                onClick={() =>
                  setFilter({ ...filter, service: filter.service === metier.id ? null : metier.id })
                }
                className={CHIP}
              >
                <MetierIcon id={metier.id} className="text-brand-ink size-5" />
                {shortLabel(metier.label)}
                {live ? null : (
                  <span className="bg-surface-sunken text-ink-muted rounded-full px-2 text-xs font-semibold">
                    {t.soon}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </fieldset>
    </div>
  );
}

/**
 * « Suivre ma demande » : toutes les demandes du client, tous services confondus (aujourd'hui le
 * Nettoyage ; les autres métiers sont annoncés « Bientôt », sans donnée). Recherche par référence ou
 * prestation, filtres par état et par service, cartes de suivi, puis les prochains rendez-vous.
 */
export function CleaningTracking() {
  const { key, organizationId } = useContextKey();
  return <Tracking key={key} organizationId={organizationId} />;
}

function Tracking({ organizationId }: { organizationId: string | null }) {
  const { resource, ready } = useTracking(organizationId);
  const [filter, setFilter] = useState<TrackFilter>({ state: null, service: null, q: '' });

  if (!ready) {
    if (resource.state.status === 'error') {
      return (
        <ErrorPanel message={describeCleaningError(resource.state.error).message} onRetry={resource.reload} />
      );
    }
    return <LoadingCards />;
  }

  if (!ready.items.length) {
    return (
      <div className="rounded-panel border-line bg-surface grid justify-items-center gap-3 border px-6 py-12 text-center shadow-xs">
        <h2 className="font-display text-h3 text-ink font-bold">{t.emptyTitle}</h2>
        <p className="text-ink-muted max-w-md">{t.emptyText}</p>
        <ButtonLink href={navigation.services.href} variant="accent" className="mt-3">
          {t.emptyAction}
          <IconArrowRight />
        </ButtonLink>
      </div>
    );
  }

  const shown = filterTrackItems(ready.items, filter);
  return (
    <div className="grid gap-10">
      <div className="grid grid-cols-[minmax(0,1fr)] gap-8 lg:grid-cols-[16rem_minmax(0,1fr)] lg:gap-10">
        <Filters filter={filter} setFilter={setFilter} items={ready.items} />
        <div className="min-w-0">
          <div
            role="search"
            className="border-line-strong bg-surface focus-within:border-brand flex min-h-15 items-center gap-3 rounded-full border px-5 shadow-xs"
          >
            <IconSearch className="text-ink-subtle size-6" />
            <label htmlFor="suivi-recherche" className="sr-only">
              {t.searchLabel}
            </label>
            <input
              id="suivi-recherche"
              type="search"
              value={filter.q}
              onChange={(event) => setFilter({ ...filter, q: event.target.value })}
              placeholder={t.searchPlaceholder}
              autoComplete="off"
              className="font-display text-ink placeholder:text-ink-subtle min-w-0 flex-1 bg-transparent py-3 text-lg outline-none"
            />
          </div>
          <p className="text-small text-ink-muted mt-5 font-medium" aria-live="polite">
            {t.count(shown.length)}
          </p>
          {shown.length ? (
            <ul className="mt-4 grid gap-5 lg:grid-cols-2">
              {shown.map((item) => (
                <li key={item.key}>
                  <TrackCard item={item} />
                </li>
              ))}
            </ul>
          ) : (
            <div className="rounded-card border-line bg-surface mt-4 grid justify-items-center gap-2 border p-8 text-center">
              <h2 className="font-display text-h3 text-ink font-bold">{t.noMatchTitle}</h2>
              <p className="text-ink-muted">{t.noMatchText}</p>
              <Button
                variant="outline"
                className="mt-4"
                onClick={() => setFilter({ state: null, service: null, q: '' })}
              >
                {t.reset}
              </Button>
            </div>
          )}
          {ready.more ? (
            <Link
              href={cleaningPaths.space}
              className="text-brand-ink font-display mt-6 inline-flex min-h-11 items-center gap-1.5 font-semibold underline-offset-4 hover:underline"
            >
              {t.more}
              <IconArrowRight className="size-4" />
            </Link>
          ) : null}
        </div>
      </div>
      {ready.agenda.length ? (
        <section
          aria-labelledby="suivi-agenda"
          className="rounded-panel border-line bg-surface border p-5 shadow-xs sm:p-8"
        >
          <h2 id="suivi-agenda" className="font-display text-h3 text-ink font-bold">
            {t.agendaTitle}
          </h2>
          <Agenda entries={ready.agenda} label={t.agendaTitle} className="mt-6" />
        </section>
      ) : null}
    </div>
  );
}

/** Nombre de demandes à suivre : celles qui ne sont ni terminées ni annulées. */
function openCount(counts: Record<TrackState, number>) {
  return counts.action + counts.ongoing;
}

/**
 * Résumé du suivi dans « Mon espace KSP » : combien de demandes sont en cours, dont combien attendent
 * le client, et le lien vers « Suivre ma demande ». Sans la liste détaillée.
 */
export function CleaningTrackingSummary() {
  const { key, organizationId } = useContextKey();
  return <Summary key={key} organizationId={organizationId} />;
}

function Summary({ organizationId }: { organizationId: string | null }) {
  const { resource, ready } = useTracking(organizationId);
  const counts = ready ? countByState(ready.items) : null;
  return (
    <div className="grid gap-5">
      <div aria-live="polite">
        {counts ? (
          <>
            <p className="font-display text-h3 text-ink font-bold">{t.summaryOngoing(openCount(counts))}</p>
            {counts.action ? <p className="text-ink-muted mt-1">{t.summaryAction(counts.action)}</p> : null}
          </>
        ) : resource.state.status === 'error' ? (
          <p className="text-ink-muted">{describeCleaningError(resource.state.error).message}</p>
        ) : (
          <span role="status" className="grid gap-2">
            <span className="sr-only">{t.loading}</span>
            <Skeleton className="h-6 w-56" />
            <Skeleton className="h-4 w-40" />
          </span>
        )}
      </div>
      <ButtonLink href={navigation.track.href} variant="outline" className="justify-self-start">
        {t.summaryLink}
        <IconArrowRight />
      </ButtonLink>
    </div>
  );
}
