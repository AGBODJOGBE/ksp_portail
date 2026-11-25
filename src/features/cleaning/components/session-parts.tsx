'use client';

import { useRef } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { IconCheck } from '@/components/ui/icons';
import { cn } from '@/lib/cn';
import { formatDateTime, formatTime } from '@/lib/format';
import { sessionTexts as t } from '@/features/cleaning/program-texts';
import type { CleaningPhoto, Session } from '@/features/cleaning/schemas';
import { incidentCategory, incidentDecision } from '@/features/cleaning/status-texts';
import { Panel, SummaryRow } from '@/components/ui/form-fields';

/*
 * Parties en lecture d'une séance : déroulé (arrivée, début, fin, signature, liste de contrôle), photos
 * avant et après, incidents.
 */

/** Déroulé réel de la séance, rempli par l'équipe sur place. */
export function SessionProgress({ session }: { session: Session }) {
  const started = session.arrival || session.startedAt || session.completedAt;
  if (!started && !session.checklist.length) return null;
  return (
    <Panel id="deroule-titre" title={t.progressTitle}>
      <div className="grid gap-6 lg:grid-cols-2">
        <dl>
          {session.arrival ? (
            <SummaryRow label={t.arrivedAt}>{formatTime(session.arrival.arrivedAt)}</SummaryRow>
          ) : null}
          {session.startedAt ? (
            <SummaryRow label={t.startedAt}>{formatTime(session.startedAt)}</SummaryRow>
          ) : null}
          {session.completedAt ? (
            <SummaryRow label={t.completedAt}>{formatDateTime(session.completedAt)}</SummaryRow>
          ) : null}
          {session.signed ? <SummaryRow label={t.signed}>✓</SummaryRow> : null}
        </dl>
        {session.checklist.length ? (
          <div>
            <h3 className="text-ink font-semibold">{t.checklistTitle}</h3>
            <ul className="mt-2 grid gap-1.5">
              {session.checklist.map((item) => (
                <li key={item.code} className="flex items-start gap-2">
                  <span
                    aria-hidden="true"
                    className={cn(
                      'mt-0.5 grid size-5 shrink-0 place-items-center rounded-md border-2',
                      item.checked ? 'border-action bg-action text-on-action' : 'border-line-strong',
                    )}
                  >
                    {item.checked ? <IconCheck className="size-3.5" /> : null}
                  </span>
                  <span className="text-ink">
                    {item.label}
                    <span className="text-small text-ink-muted">
                      {' — '}
                      {item.checked && item.checkedAt
                        ? t.checkedAt(formatTime(item.checkedAt))
                        : t.notChecked}
                    </span>
                  </span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>
    </Panel>
  );
}

/**
 * Photos d'une séance ou d'une réclamation par nature (avant, après, incident, jointes à la réclamation). Liens temporaires du stockage, lus directement
 * (`<img>`, jamais par l'optimiseur de Next, qui les garderait dans un cache partagé) ; un lien expiré
 * relit la séance une fois, puis « Recharger les photos ».
 */
export function SessionPhotos({
  photos,
  onRefresh,
}: {
  photos: ReadonlyArray<CleaningPhoto>;
  onRefresh: () => void;
}) {
  const retried = useRef(false);
  const groups = [
    { kind: 'before', label: t.photosBefore },
    { kind: 'after', label: t.photosAfter },
    { kind: 'incident', label: t.photosIncident },
    { kind: 'claim', label: t.photosClaim },
  ]
    .map((group) => ({ ...group, items: photos.filter((photo) => photo.kind === group.kind) }))
    .filter((group) => group.items.length);
  if (!groups.length) return null;
  const failed = () => {
    if (retried.current) return;
    retried.current = true;
    onRefresh();
  };
  return (
    <Panel
      id="photos-titre"
      title={t.photosTitle}
      action={
        <Button variant="ghost" onClick={onRefresh}>
          {t.photosRefresh}
        </Button>
      }
    >
      <div className="grid gap-6">
        {groups.map((group) => (
          <figure key={group.kind} className="grid gap-2">
            <figcaption className="text-small text-ink-muted font-semibold">
              {group.label} ({group.items.length})
            </figcaption>
            <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {group.items.map((photo, index) => (
                <li key={photo.fileId}>
                  {photo.url ? (
                    <a href={photo.url} target="_blank" rel="noreferrer noopener" className="block">
                      {/* eslint-disable-next-line @next/next/no-img-element -- lien temporaire du stockage */}
                      <img
                        src={photo.url}
                        alt={t.photoAlt(group.label, index + 1)}
                        loading="lazy"
                        onError={failed}
                        className="rounded-control bg-surface-sunken aspect-[4/3] w-full object-cover"
                      />
                    </a>
                  ) : (
                    <span className="rounded-control bg-surface-sunken text-small text-ink-muted grid aspect-[4/3] place-items-center p-2 text-center">
                      {t.photoUnavailable}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </figure>
        ))}
      </div>
    </Panel>
  );
}

/** Incidents signalés sur place et décision du superviseur. */
export function SessionIncidents({ session }: { session: Session }) {
  if (!session.incidents.length) return null;
  return (
    <Panel id="incidents-titre" title={t.incidentsTitle}>
      <ul className="grid gap-4">
        {session.incidents.map((incident) => (
          <li key={incident.id} className="border-line grid gap-1.5 border-b pb-4 last:border-b-0 last:pb-0">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-ink font-semibold">{incidentCategory(incident.category)}</p>
              <Badge tone={incident.decision === 'pending' ? 'warning' : 'neutral'}>
                {incidentDecision(incident.decision)}
              </Badge>
            </div>
            <p className="text-small text-ink-muted">{formatDateTime(incident.reportedAt)}</p>
            <p className="text-ink whitespace-pre-line">{incident.note}</p>
          </li>
        ))}
      </ul>
    </Panel>
  );
}
