'use client';

import { api, parseResponse } from '@/lib/api';
import {
  type AcceptResult,
  type Catalog,
  type CleaningRequest,
  type PaymentOutcome,
  type Place,
  type PlaceList,
  type PlaceTypeDetail,
  type PointLocation,
  type Quote,
  type RequestList,
  type SchedulePreview,
  type Simulation,
  type Zone,
  acceptResultSchema,
  catalogSchema,
  paymentOutcomeSchema,
  placeListSchema,
  placeSchema,
  placeTypeDetailSchema,
  pointLocationSchema,
  quoteSchema,
  requestListSchema,
  requestSchema,
  schedulePreviewSchema,
  simulationSchema,
  zonesSchema,
} from './schemas';

/*
 * Appels du Nettoyage v2 (contrat `ksp-api.v1.yaml`). Routes publiques (catalogue, simulation, aperçu des
 * dates) sans jeton ; routes du client dans son contexte actif (personnel ou organisation). Chaque
 * réponse est validée par son schéma. Les écritures sensibles portent une clé d'idempotence, tirée par
 * l'écran (une par soumission, voir `idempotency.ts`).
 */

const BASE = '/api/v1/cleaning';
const id = (value: string) => encodeURIComponent(value);

export const PAGE_SIZE = 20;

/* ——— Corps envoyés (noms du contrat ; un champ inconnu est refusé par la gateway) ——— */

export type Weekday = 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun';
export type MonthRank = 'first' | 'second' | 'third' | 'fourth' | 'last';

/** `CleaningSchedulePlan`, tel qu'envoyé : seuls les champs de la nature choisie. */
export interface SchedulePlan {
  kind: 'one_off' | 'weekly' | 'monthly';
  startTime: string;
  dates?: string[];
  weekdays?: Weekday[];
  everyWeeks?: number;
  monthDays?: number[];
  monthWeekdays?: Array<{ rank: MonthRank; weekday: Weekday }>;
  startDate?: string;
  endDate?: string;
  durationWeeks?: number;
  durationMonths?: number;
  excludedDates?: string[];
  addedDates?: string[];
  excludeHolidays?: boolean;
}

export type ValuesBody = Record<string, number | string | boolean>;

export interface SimulateBody {
  placeTypeId: string;
  cleaningTypeIds: string[];
  values: ValuesBody;
  schedule?: SchedulePlan;
  communeKey?: string;
}

export interface PlaceBody {
  name: string;
  placeTypeId: string;
  latitude: number;
  longitude: number;
  landmark: string;
  address?: string;
  declaredValues?: ValuesBody;
  accuracyMeters?: number;
}

export type PlaceUpdateBody = Partial<Omit<PlaceBody, 'placeTypeId'>>;

export interface TimeSlotBody {
  start: string;
  end: string;
}

export interface SubmitRequestBody {
  placeId: string;
  cleaningTypeIds: string[];
  values: ValuesBody;
  freeDescription?: string;
  schedule: SchedulePlan;
  visitSlots: TimeSlotBody[];
  comment?: string;
  photoFileIds?: string[];
}

export type CancelReason = 'no_longer_needed' | 'found_other_provider' | 'visit_fee' | 'other';
export type DeclineReason = 'price' | 'schedule' | 'no_longer_needed' | 'other';

/* ——— Public ——— */

export async function listCatalog(): Promise<Catalog> {
  return parseResponse(catalogSchema, await api.get(`${BASE}/catalog/place-types`, { auth: false }));
}

export async function getPlaceType(placeTypeId: string): Promise<PlaceTypeDetail> {
  return parseResponse(
    placeTypeDetailSchema,
    await api.get(`${BASE}/catalog/place-types/${id(placeTypeId)}`, { auth: false }),
  );
}

export async function listZones(): Promise<Zone[]> {
  return parseResponse(zonesSchema, await api.get(`${BASE}/catalog/zones`, { auth: false })).data;
}

export async function simulate(body: SimulateBody, signal?: AbortSignal): Promise<Simulation> {
  return parseResponse(
    simulationSchema,
    await api.post(`${BASE}/simulations`, body, { auth: false, signal }),
  );
}

export async function previewSchedule(
  schedule: SchedulePlan,
  signal?: AbortSignal,
): Promise<SchedulePreview> {
  return parseResponse(
    schedulePreviewSchema,
    await api.post(`${BASE}/schedule-previews`, { schedule }, { auth: false, signal }),
  );
}

/* ——— Mes lieux ——— */

export async function listPlaces(
  options: { cursor?: string; archived?: boolean; limit?: number } = {},
): Promise<PlaceList> {
  return parseResponse(
    placeListSchema,
    await api.get(`${BASE}/places`, {
      query: {
        limit: options.limit ?? PAGE_SIZE,
        cursor: options.cursor,
        archived: options.archived ? true : undefined,
      },
    }),
  );
}

export async function getPlace(placeId: string): Promise<Place> {
  return parseResponse(placeSchema, await api.get(`${BASE}/places/${id(placeId)}`));
}

export async function createPlace(body: PlaceBody, idempotencyKey: string): Promise<Place> {
  return parseResponse(placeSchema, await api.post(`${BASE}/places`, body, { idempotencyKey }));
}

export async function updatePlace(placeId: string, body: PlaceUpdateBody): Promise<Place> {
  return parseResponse(placeSchema, await api.patch(`${BASE}/places/${id(placeId)}`, body));
}

export async function archivePlace(placeId: string): Promise<Place> {
  return parseResponse(placeSchema, await api.post(`${BASE}/places/${id(placeId)}/archive`));
}

/** Commune et adresse lisible d'une position, sans rien enregistrer (R-ZN-01). */
export async function locatePoint(point: { latitude: number; longitude: number }): Promise<PointLocation> {
  return parseResponse(pointLocationSchema, await api.post(`${BASE}/places/locate`, point));
}

/* ——— Demandes ——— */

export async function submitRequest(
  body: SubmitRequestBody,
  idempotencyKey: string,
): Promise<CleaningRequest> {
  return parseResponse(requestSchema, await api.post(`${BASE}/requests`, body, { idempotencyKey }));
}

export async function listRequests(
  options: { cursor?: string; status?: string; limit?: number } = {},
): Promise<RequestList> {
  return parseResponse(
    requestListSchema,
    await api.get(`${BASE}/requests`, {
      query: { limit: options.limit ?? PAGE_SIZE, cursor: options.cursor, status: options.status },
    }),
  );
}

export async function getRequest(requestId: string): Promise<CleaningRequest> {
  return parseResponse(requestSchema, await api.get(`${BASE}/requests/${id(requestId)}`));
}

export async function payVisitFee(
  requestId: string,
  method: 'wallet' | 'mobile_money',
  idempotencyKey: string,
): Promise<PaymentOutcome> {
  return parseResponse(
    paymentOutcomeSchema,
    await api.post(`${BASE}/requests/${id(requestId)}/visit-fee/pay`, { method }, { idempotencyKey }),
  );
}

export async function changeVisitSlot(
  requestId: string,
  visitSlots: TimeSlotBody[],
  idempotencyKey: string,
): Promise<CleaningRequest> {
  return parseResponse(
    requestSchema,
    await api.post(`${BASE}/requests/${id(requestId)}/visit-slot`, { visitSlots }, { idempotencyKey }),
  );
}

export async function cancelRequest(
  requestId: string,
  body: { reasonCode?: CancelReason; comment?: string },
  idempotencyKey: string,
): Promise<CleaningRequest> {
  return parseResponse(
    requestSchema,
    await api.post(`${BASE}/requests/${id(requestId)}/cancel`, body, { idempotencyKey }),
  );
}

/** Réactivation d'un devis expiré (R-AC-04) : sans corps. */
export async function requestReactivation(
  requestId: string,
  idempotencyKey: string,
): Promise<CleaningRequest> {
  return parseResponse(
    requestSchema,
    await api.post(`${BASE}/requests/${id(requestId)}/reactivation`, undefined, { idempotencyKey }),
  );
}

/* ——— Devis ——— */

export async function getQuote(quoteId: string): Promise<Quote> {
  return parseResponse(quoteSchema, await api.get(`${BASE}/quotes/${id(quoteId)}`));
}

export async function acceptQuote(
  quoteId: string,
  body: { acceptTerms: true; termsVersion: string; startDate?: string },
  idempotencyKey: string,
): Promise<AcceptResult> {
  return parseResponse(
    acceptResultSchema,
    await api.post(`${BASE}/quotes/${id(quoteId)}/accept`, body, { idempotencyKey }),
  );
}

export async function declineQuote(
  quoteId: string,
  body: { reasonCode?: DeclineReason; comment?: string },
  idempotencyKey: string,
): Promise<Quote> {
  return parseResponse(
    quoteSchema,
    await api.post(`${BASE}/quotes/${id(quoteId)}/decline`, body, { idempotencyKey }),
  );
}

/** Transmission aux administrateurs de l'organisation : sans corps ni clé, rejouable. */
export async function forwardQuote(quoteId: string): Promise<Quote> {
  return parseResponse(quoteSchema, await api.post(`${BASE}/quotes/${id(quoteId)}/forward`));
}
