'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { BandHeader, BandTitle } from '@/components/ui/band-header';
import { Button, ButtonLink } from '@/components/ui/button';
import { FormMessage } from '@/components/ui/field';
import { IconPin } from '@/components/ui/icons';
import { PagedListState } from '@/components/ui/paged-list-state';
import { Skeleton } from '@/components/ui/skeleton';
import { contextKey, useSession } from '@/lib/api';
import { cn } from '@/lib/cn';
import { formatShortDate } from '@/lib/format';
import { usePagedList } from '@/lib/use-paged-list';
import { useResource } from '@/lib/use-resource';
import { useOrganizationRole } from '@/features/identity';
import { archivePlace, getPlace, listPlaces } from '@/features/cleaning/api';
import { describeCleaningError, errorWithReference } from '@/features/cleaning/errors';
import { cleaningPaths } from '@/features/cleaning/paths';
import { placeTexts as t } from '@/features/cleaning/place-texts';
import type { Place } from '@/features/cleaning/schemas';
import { cleaningTexts } from '@/features/cleaning/texts';
import { PlaceTypeIcon } from './catalog-fields';
import { Panel, SummaryRow } from './fields';
import { PlaceForm } from './place-form';
import { useCatalog, usePlaceType } from './use-public';

const ROW =
  'rounded-card border-line bg-surface hover:border-line-strong has-[.stretched-link:focus-visible]:outline-focus relative grid gap-3 border p-4 shadow-xs has-[.stretched-link:focus-visible]:outline-2 has-[.stretched-link:focus-visible]:outline-offset-2 sm:grid-cols-[auto_1fr_auto] sm:items-center sm:p-5';

/** Badges d'un lieu : commune desservie, position à redonner, archivé. */
export function PlaceBadges({ place }: { place: Place }) {
  return (
    <span className="flex flex-wrap gap-2">
      {place.served ? <Badge tone="success">{t.served}</Badge> : <Badge tone="danger">{t.notServed}</Badge>}
      {!place.location ? <Badge tone="warning">{t.locationMissing}</Badge> : null}
      {place.archived ? <Badge tone="neutral">{t.archivedBadge}</Badge> : null}
    </span>
  );
}

export function PlaceRow({ place }: { place: Place }) {
  return (
    <li className={ROW}>
      <span
        aria-hidden="true"
        className="rounded-icon bg-brand-soft text-brand-ink grid size-11 place-items-center max-sm:hidden"
      >
        <PlaceTypeIcon icon={null} className="size-6" />
      </span>
      <div className="min-w-0">
        <Link
          href={cleaningPaths.place(place.id)}
          className="stretched-link font-display text-ink text-lg font-semibold underline-offset-4 hover:underline focus-visible:outline-none"
        >
          {place.name}
        </Link>
        <p className="text-small text-ink-muted mt-1">
          {[place.placeTypeName, place.communeName, place.location?.landmark].filter(Boolean).join(' · ')}
        </p>
      </div>
      <PlaceBadges place={place} />
    </li>
  );
}

function List({ archived }: { archived: boolean }) {
  const list = usePagedList(useCallback((cursor?: string) => listPlaces({ cursor, archived }), [archived]));
  const items = archived ? list.items.filter((place) => place.archived) : list.items;
  return (
    <PagedListState
      list={{ ...list, items }}
      labels={t}
      empty={<p className="text-ink">{archived ? t.emptyArchived : t.empty}</p>}
    >
      <ul className="grid gap-3">
        {items.map((place) => (
          <PlaceRow key={place.id} place={place} />
        ))}
      </ul>
    </PagedListState>
  );
}

/** « Mes lieux » : lieux actifs, ou archivés ; « Ajouter un lieu ». */
export function PlaceList() {
  const context = contextKey(useSession()) ?? 'none';
  const role = useOrganizationRole();
  const [archived, setArchived] = useState(false);
  return (
    <div className="grid gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div role="group" aria-label={t.title} className="flex gap-2">
          {[false, true].map((value) => (
            <button
              key={String(value)}
              type="button"
              aria-pressed={archived === value}
              onClick={() => setArchived(value)}
              className={cn(
                'focus-visible:outline-focus inline-flex min-h-11 items-center rounded-full border px-4 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-offset-2',
                archived === value
                  ? 'border-brand bg-brand text-on-brand'
                  : 'border-line-strong bg-surface text-ink hover:border-brand',
              )}
            >
              {value ? t.showArchived : t.showActive}
            </button>
          ))}
        </div>
        {role === 'org_viewer' ? null : (
          <ButtonLink href={cleaningPaths.newPlace} variant="action">
            <IconPin />
            {t.newPlace}
          </ButtonLink>
        )}
      </div>
      <List key={`${context}:${archived}`} archived={archived} />
    </div>
  );
}

/** Ajout d'un lieu : type choisi dans le catalogue, puis la carte. */
export function NewPlace() {
  const router = useRouter();
  const catalog = useCatalog();
  const role = useOrganizationRole();
  if (role === 'org_viewer') return <FormMessage tone="info">{t.readOnly}</FormMessage>;
  return (
    <div className="rounded-panel border-line bg-surface border p-5 shadow-xs sm:p-8">
      {catalog.state.status === 'error' ? (
        <div className="mb-6 grid justify-items-start gap-3">
          <FormMessage>{describeCleaningError(catalog.state.error).message}</FormMessage>
          <Button variant="secondary" onClick={catalog.reload}>
            {t.retry}
          </Button>
        </div>
      ) : null}
      <PlaceForm
        catalog={catalog.state.status === 'ready' ? catalog.state.data : null}
        onSaved={(place) => router.push(`${cleaningPaths.place(place.id)}?enregistre=1`)}
        onCancel={() => router.push(cleaningPaths.places)}
      />
    </div>
  );
}

/** Un lieu : position, repère, caractéristiques déclarées ; modifier, archiver, demander un devis. */
export function PlaceDetail({ id }: { id: string }) {
  const context = contextKey(useSession()) ?? 'none';
  return <Detail key={`${context}:${id}`} id={id} />;
}

function Detail({ id }: { id: string }) {
  const load = useCallback(() => getPlace(id), [id]);
  const resource = useResource(load);
  const role = useOrganizationRole();
  const [editing, setEditing] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [notice, setNotice] = useState<string | null>(() =>
    typeof window !== 'undefined' && new URLSearchParams(window.location.search).has('enregistre')
      ? t.saved
      : null,
  );
  const [problem, setProblem] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const readOnly = role === 'org_viewer';
  const detail = usePlaceType(resource.state.status === 'ready' ? resource.state.data.placeTypeId : null);
  const parameters = detail.state.status === 'ready' && detail.state.data ? detail.state.data.parameters : [];

  if (resource.state.status === 'loading') {
    return (
      <div role="status" className="grid gap-8">
        <span className="sr-only">{t.loadingOne}</span>
        <BandHeader>
          <Skeleton className="h-11 w-2/3 max-w-md" />
        </BandHeader>
        <Skeleton className="rounded-card h-56" />
      </div>
    );
  }
  if (resource.state.status === 'error') {
    const view = describeCleaningError(resource.state.error);
    return (
      <div className="grid gap-8">
        <BandHeader>
          <BandTitle back={{ href: cleaningPaths.places, label: t.back }} title={t.title} />
        </BandHeader>
        <div className="rounded-card border-line bg-surface grid justify-items-start gap-4 border p-5 shadow-xs">
          <FormMessage>{errorWithReference(view)}</FormMessage>
          {view.kind === 'notFound' ? null : (
            <Button variant="secondary" onClick={resource.reload}>
              {t.retry}
            </Button>
          )}
        </div>
      </div>
    );
  }
  const place = resource.state.data;
  const usable = !!place.location && place.served && !place.archived;

  async function archive() {
    setBusy(true);
    setProblem(null);
    try {
      resource.set(await archivePlace(place.id));
      setConfirming(false);
      setNotice(t.archived);
    } catch (error) {
      setProblem(errorWithReference(describeCleaningError(error)));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid gap-8">
      <BandHeader>
        <BandTitle
          back={{ href: cleaningPaths.places, label: t.back }}
          eyebrow={cleaningTexts.space.eyebrow}
          title={place.name}
          lead={`${place.placeTypeName} · ${place.communeName}`}
        >
          <PlaceBadges place={place} />
        </BandTitle>
      </BandHeader>

      {notice ? <FormMessage tone="success">{notice}</FormMessage> : null}
      {!place.location ? <FormMessage tone="info">{t.locationMissingText}</FormMessage> : null}

      {editing ? (
        <Panel id="lieu-modifier" title={t.editTitle}>
          <PlaceForm
            place={place}
            onSaved={(saved) => {
              resource.set(saved);
              setEditing(false);
              setNotice(t.updated);
            }}
            onCancel={() => setEditing(false)}
          />
        </Panel>
      ) : (
        <Panel
          id="lieu-fiche"
          title={t.position}
          action={
            readOnly || place.archived ? null : (
              <Button variant="secondary" onClick={() => setEditing(true)}>
                {t.edit}
              </Button>
            )
          }
        >
          <dl>
            <SummaryRow label={t.commune}>{place.communeName}</SummaryRow>
            {place.location ? (
              <>
                <SummaryRow label={t.landmark}>{place.location.landmark}</SummaryRow>
                {place.location.address ? (
                  <SummaryRow label={t.address}>{place.location.address}</SummaryRow>
                ) : null}
                {place.location.readableAddress ? (
                  <SummaryRow label={t.readableAddress}>{place.location.readableAddress}</SummaryRow>
                ) : null}
              </>
            ) : null}
            <SummaryRow label={t.type}>{place.placeTypeName}</SummaryRow>
          </dl>
          {place.locationCorrectedAt ? (
            <p className="text-small text-ink-muted mt-3">
              {t.corrected(formatShortDate(place.locationCorrectedAt))}
            </p>
          ) : null}
          <p className="text-small text-ink-muted mt-3">{t.createdAt(formatShortDate(place.createdAt))}</p>
        </Panel>
      )}

      <Panel id="lieu-caracteristiques" title={t.declaredTitle}>
        {Object.keys(place.declaredValues).length ? (
          <dl>
            {Object.entries(place.declaredValues).map(([code, value]) => {
              const parameter = parameters.find((item) => item.code === code);
              const display =
                typeof value === 'boolean'
                  ? value
                    ? 'Oui'
                    : 'Non'
                  : (parameter?.choices.find((choice) => choice.code === value)?.label ??
                    `${value}${parameter?.unit ? ` ${parameter.unit}` : ''}`);
              return (
                <SummaryRow key={code} label={parameter?.label ?? code.replaceAll('_', ' ')}>
                  {display}
                </SummaryRow>
              );
            })}
          </dl>
        ) : (
          <p className="text-ink-muted">{t.declaredEmpty}</p>
        )}
      </Panel>

      {readOnly ? (
        <FormMessage tone="info">{t.readOnly}</FormMessage>
      ) : (
        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
          {usable ? (
            <ButtonLink href={cleaningPaths.requestForPlace(place.id)} variant="action" size="lg">
              {t.requestQuote}
            </ButtonLink>
          ) : null}
          {place.archived ? null : confirming ? (
            <div className="rounded-card border-line bg-surface grid gap-3 border p-4 sm:max-w-xl">
              <p className="text-ink">{t.archiveConfirm}</p>
              <div className="flex flex-col gap-3 sm:flex-row">
                <Button variant="primary" onClick={() => void archive()} disabled={busy}>
                  {t.archiveYes}
                </Button>
                <Button variant="ghost" onClick={() => setConfirming(false)} disabled={busy}>
                  {t.archiveNo}
                </Button>
              </div>
            </div>
          ) : (
            <Button variant="danger" onClick={() => setConfirming(true)}>
              {t.archive}
            </Button>
          )}
        </div>
      )}
      {problem ? <FormMessage>{problem}</FormMessage> : null}
    </div>
  );
}
