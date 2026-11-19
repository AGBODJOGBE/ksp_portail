import type { AgendaEntry } from '@/components/ui/agenda';
import type { MetierId } from '@/config/metiers';
import { formatDateTime, isPast } from '@/lib/format';
import { groupStage, LIFECYCLE, missionStage, requestStage, type Stage } from './lifecycle';
import { paymentExpected } from './payment-due';
import { cleaningPaths } from './paths';
import type { Mission, QuoteRequest } from './schemas';
import { spaceTexts } from './space-texts';
import {
  type Actor,
  missionStatuses,
  requestStatuses,
  type StatusLabel,
  statusOf,
  suspendedStatus,
} from './texts';
import { trackingTexts as t } from './tracking-texts';

/*
 * « Suivre ma demande » : demandes et missions du Nettoyage mises à plat en cartes de suivi, puis
 * filtrées dans le navigateur (état, service, recherche). Simple correspondance d'affichage des états
 * de la gateway : aucune règle métier, aucun montant calculé.
 */

/** Rangement d'une carte de suivi. */
export type TrackState = 'action' | 'ongoing' | 'done' | 'cancelled';

export const TRACK_STATES: ReadonlyArray<TrackState> = ['action', 'ongoing', 'done', 'cancelled'];

export interface TrackItem {
  key: string;
  service: MetierId;
  title: string;
  /** Référence courte (fin de l'identifiant), à donner au support ou à chercher. */
  reference: string;
  /** Date de la demande (ISO). */
  date: string;
  status: StatusLabel;
  state: TrackState;
  /** Étape du fil à cinq étapes (`t.steps`) ; `t.steps.length` : tout est fait. */
  step: number;
  stopped: boolean;
  /** Ce qui se passe ensuite, et qui doit agir. */
  next: string | null;
  actor: Actor | null;
  href: string;
  /** Action de repli d'une carte close (devis expiré : « Faire une nouvelle demande »). */
  link?: { href: string; label: string };
}

/** Huit étapes du cycle de vie → cinq étapes du suivi : demande, visite, devis, réservation, passages. */
export function trackStep(stage: Stage): number {
  const current = stage.current;
  if (current >= LIFECYCLE.length) return t.steps.length;
  if (current <= 2) return current;
  return current <= 4 ? 3 : 4;
}

const STOPPED_REQUESTS = new Set(['declined', 'rejected', 'expired', 'cancelled']);

/** Référence affichée : les huit derniers caractères de l'identifiant, en capitales. */
export function shortReference(id: string): string {
  return id.replace(/-/g, '').slice(-8).toUpperCase();
}

function quoteWaiting(request: QuoteRequest): boolean {
  return request.status === 'quote_sent' && !!request.quote && !isPast(request.quote.validUntil);
}

/**
 * Devis dont la validité est passée : la gateway enregistre l'état `expired` (ADR-053, tâche toutes les
 * 10 minutes) ; en attendant, un devis envoyé dont la date de validité est passée s'affiche déjà expiré,
 * comme sur le détail de la demande.
 */
function shownStatus(request: QuoteRequest): QuoteRequest {
  const lapsed = request.status === 'quote_sent' && !!request.quote && isPast(request.quote.validUntil);
  return lapsed ? { ...request, status: 'expired' } : request;
}

function requestItem(source: ReadonlyArray<QuoteRequest>, name: (code: string) => string): TrackItem {
  const requests = source.map(shownStatus);
  const first = requests[0]!;
  const grouped = requests.length > 1 && !!first.groupId;
  const open = requests.filter((request) => !STOPPED_REQUESTS.has(request.status));
  // Statut affiché : celui d'un devis qui attend le client, sinon de la demande ouverte la moins avancée.
  const shown = requests.find(quoteWaiting) ?? open[0] ?? first;
  const status = statusOf(requestStatuses, shown.status);
  const stage = grouped ? groupStage(requests) : requestStage(first);
  const state: TrackState = requests.some(quoteWaiting)
    ? 'action'
    : open.length === 0
      ? 'cancelled'
      : 'ongoing';
  return {
    key: grouped ? `groupe-${first.groupId}` : `demande-${first.id}`,
    service: 'nettoyage',
    title: grouped
      ? t.group(first.placeTypeLabel ?? null, first.groupSize ?? requests.length)
      : (first.serviceName ?? name(first.serviceCode)),
    reference: shortReference(grouped ? first.groupId! : first.id),
    date: requests.map((request) => request.createdAt).sort()[0]!,
    status,
    state,
    step: trackStep(stage),
    stopped: stage.stopped,
    next: status.hint ?? null,
    actor: status.actor ?? null,
    href: grouped ? cleaningPaths.group(first.groupId!) : cleaningPaths.request(first.id),
    link:
      state === 'cancelled' && requests.some((request) => request.status === 'expired')
        ? { href: cleaningPaths.journey, label: t.newRequest }
        : undefined,
  };
}

function missionItem(mission: Mission, name: (code: string) => string): TrackItem {
  const suspended = mission.suspension ? suspendedStatus(mission.suspension) : null;
  const status = suspended ?? statusOf(missionStatuses, mission.status);
  const paying = !mission.suspension && paymentExpected(mission);
  const stage = missionStage(mission);
  const state: TrackState =
    suspended?.actor === 'client' || paying
      ? 'action'
      : mission.status === 'cancelled'
        ? 'cancelled'
        : mission.status === 'completed'
          ? 'done'
          : 'ongoing';
  return {
    key: `mission-${mission.id}`,
    service: 'nettoyage',
    title: name(mission.serviceCode),
    reference: shortReference(mission.id),
    date: mission.createdAt,
    status,
    state,
    step: trackStep(stage),
    stopped: stage.stopped,
    next: paying ? t.payNext : (status.hint ?? null),
    actor: paying ? 'client' : (status.actor ?? null),
    href: cleaningPaths.mission(mission.id),
  };
}

/**
 * Cartes de suivi du Nettoyage : une par mission, une par demande ouverte ou close (un groupe = une
 * carte). Une demande acceptée est suivie par sa mission ; elle n'a sa carte que si la mission n'est pas
 * dans la liste lue. Les plus récentes d'abord.
 */
export function cleaningTrackItems(
  requests: ReadonlyArray<QuoteRequest>,
  missions: ReadonlyArray<Mission>,
  name: (code: string) => string,
): TrackItem[] {
  const missionIds = new Set(missions.map((mission) => mission.id));
  const pending = requests.filter(
    (request) => !(request.status === 'accepted' && request.missionId && missionIds.has(request.missionId)),
  );
  const groups = new Map<string, QuoteRequest[]>();
  for (const request of pending) {
    const key = request.groupId && (request.groupSize ?? 1) > 1 ? request.groupId : request.id;
    groups.set(key, [...(groups.get(key) ?? []), request]);
  }
  return [
    ...[...groups.values()].map((items) => requestItem(items, name)),
    ...missions.map((mission) => missionItem(mission, name)),
  ].sort((a, b) => b.date.localeCompare(a.date));
}

/** Minuscules sans accents : « ménage » et « MENAGE » se rejoignent. */
function fold(text: string): string {
  return text.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();
}

export interface TrackFilter {
  state: TrackState | null;
  service: MetierId | null;
  q: string;
}

/** Filtre par état, par service, puis par recherche (référence, prestation ou état). */
export function filterTrackItems(items: ReadonlyArray<TrackItem>, filter: TrackFilter): TrackItem[] {
  const words = fold(filter.q).split(/\s+/).filter(Boolean);
  return items.filter((item) => {
    if (filter.state && item.state !== filter.state) return false;
    if (filter.service && item.service !== filter.service) return false;
    const text = fold(`${item.title} ${item.reference} ${item.status.label}`);
    return words.every((word) => text.includes(word));
  });
}

/** Nombre de cartes par état (pastilles des filtres). */
export function countByState(items: ReadonlyArray<TrackItem>): Record<TrackState, number> {
  const counts: Record<TrackState, number> = { action: 0, ongoing: 0, done: 0, cancelled: 0 };
  for (const item of items) counts[item.state] += 1;
  return counts;
}

const OPEN_REQUESTS = new Set(['received', 'visit_scheduled', 'quote_sent']);
const ACTIVE_MISSIONS = new Set(['to_schedule', 'scheduled', 'in_progress', 'on_hold']);

/**
 * Rendez-vous à venir : visites des lieux (une seule fois pour un groupe) et prochain passage de chaque
 * mission active, du plus proche au plus lointain. Déplacés de « Mon espace » vers le suivi.
 */
export function cleaningAgenda(
  requests: ReadonlyArray<QuoteRequest>,
  missions: ReadonlyArray<Mission>,
  name: (code: string) => string,
): AgendaEntry[] {
  const s = spaceTexts.todo;
  const seen = new Set<string>();
  const visits = requests.filter((request) => {
    if (request.visit?.status !== 'scheduled' || !OPEN_REQUESTS.has(request.status)) return false;
    if (isPast(request.visit.scheduledAt)) return false;
    const key = `${request.groupId ?? request.id}:${request.visit.scheduledAt}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  const passages = missions
    .filter((mission) => ACTIVE_MISSIONS.has(mission.status) && !mission.suspension)
    .map((mission) => ({
      mission,
      next: mission.interventions
        .filter((item) => item.status === 'planned' && !isPast(item.scheduledStart))
        .sort((a, b) => a.scheduledStart.localeCompare(b.scheduledStart))[0],
    }))
    .filter((item) => item.next);
  return [
    ...visits.map((request) => ({
      key: `visite-${request.id}`,
      date: request.visit!.scheduledAt,
      title: s.visitTitle,
      text: s.visitText(formatDateTime(request.visit!.scheduledAt)),
      link: {
        href:
          request.groupId && (request.groupSize ?? 1) > 1
            ? cleaningPaths.group(request.groupId)
            : cleaningPaths.request(request.id),
        label: s.seeAction,
      },
    })),
    ...passages.map(({ mission, next }) => ({
      key: `passage-${mission.id}`,
      date: next!.scheduledStart,
      title: `${s.passageTitle} · ${name(mission.serviceCode)}`,
      text: s.passageText(formatDateTime(next!.scheduledStart)),
      link: { href: cleaningPaths.mission(mission.id), label: s.seeAction },
    })),
  ]
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((entry, index) => ({ ...entry, state: index === 0 ? ('next' as const) : ('default' as const) }));
}
