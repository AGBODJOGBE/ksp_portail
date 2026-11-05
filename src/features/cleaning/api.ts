import { api, parseResponse } from '@/lib/api';
import {
  type AcceptResponse,
  acceptResponseSchema,
  type Mission,
  type MissionList,
  missionListSchema,
  missionSchema,
  type PaymentPlan,
  type Estimate,
  estimateSchema,
  type LocationResolution,
  locationResolutionSchema,
  type PlaceCatalog,
  placeCatalogSchema,
  type QuoteRequest,
  type QuoteRequestList,
  quoteRequestListSchema,
  quoteRequestSchema,
  type RequestGroup,
  requestGroupSchema,
  type ServedZone,
  servedZoneListSchema,
  type ServiceOffer,
  serviceListSchema,
  type TimeSlot,
} from './schemas';
import { ZONES_PATH } from './zones';

/**
 * Appels du navigateur à la gateway pour le Nettoyage. Les catalogues, les zones et l'estimation sont
 * publics (sans jeton) ; la position, la demande de devis et « Mes prestations de nettoyage » demandent
 * une session (option A, F-005).
 */

export const CLEANING_API = '/api/v1/cleaning';
const REQUESTS = `${CLEANING_API}/quote-requests`;
const MISSIONS = `${CLEANING_API}/missions`;
const GROUPS = `${CLEANING_API}/quote-request-groups`;

/** Taille d'une page des listes (le contrat accepte 1 à 100, 20 par défaut). */
export const PAGE_SIZE = 10;

/** Réponses à un formulaire (ADR-033) : nombre entier, code d'une valeur ou oui/non, par code de champ. */
export type AnswerSet = Record<string, number | string | boolean>;

/** `CleaningPlaceItem` / `CleaningQuoteGroupItem` : une prestation choisie pour le lieu. */
export interface PlaceItemInput {
  serviceCode: string;
  answers: AnswerSet;
  options: Array<{ code: string; answers: AnswerSet }>;
  frequency?: string;
}

/** `EstimateCleaningRequest` : commune facultative (sans elle, estimation indicative). */
export interface EstimateInput {
  placeType: string;
  commune?: string;
  items: PlaceItemInput[];
}

/** `CleaningGeoLocationInput`. */
export interface GeoLocationInput {
  latitude: number;
  longitude: number;
  accuracyMeters?: number;
}

/**
 * `RequestCleaningQuoteGroupRequest` : le type de client (particulier ou entreprise) vient du contexte
 * actif ; `commune` ne sert qu'en repli, si la position n'est rattachée à aucune commune.
 */
export interface QuoteGroupInput {
  placeType: string;
  location: GeoLocationInput;
  landmark: string;
  commune?: string;
  items: PlaceItemInput[];
  preferredSlots: TimeSlot[];
  comment?: string;
}

/** `AcceptCleaningQuoteRequest` : `paymentPlan` obligatoire pour un particulier, absent pour une entreprise. */
export interface AcceptInput {
  slotStart: string;
  paymentPlan?: PaymentPlan;
}

/**
 * Lecture publique gardée pour la durée de la page : plusieurs écrans s'en servent (nommer la
 * prestation, proposer les communes). Un échec n'est pas gardé : « Réessayer » relance la lecture.
 */
function cachedRead<T>(read: () => Promise<T>) {
  let cache: Promise<T> | null = null;
  return {
    get(): Promise<T> {
      cache ??= read();
      cache.catch(() => {
        cache = null;
      });
      return cache;
    },
    reset() {
      cache = null;
    },
  };
}

const services = cachedRead(
  async () =>
    parseResponse(serviceListSchema, await api.get(`${CLEANING_API}/services`, { auth: false })).data,
);

const placeCatalog = cachedRead(async () =>
  parseResponse(placeCatalogSchema, await api.get(`${CLEANING_API}/catalog`, { auth: false })),
);

const zones = cachedRead(
  async () => parseResponse(servedZoneListSchema, await api.get(ZONES_PATH, { auth: false })).data,
);

export function listServices(): Promise<ServiceOffer[]> {
  return services.get();
}

/** Types de lieu et formulaires de leurs prestations (`GET /cleaning/catalog`). */
export function getPlaceCatalog(): Promise<PlaceCatalog> {
  return placeCatalog.get();
}

/** Zones desservies, quand la page ne les a pas reçues du serveur. */
export function listZones(): Promise<ServedZone[]> {
  return zones.get();
}

/** Réservé aux tests : oublie le catalogue et les zones lus. */
export function resetServicesCache(): void {
  services.reset();
  placeCatalog.reset();
  zones.reset();
}

/** Estimation de plusieurs prestations d'un lieu ; `signal` annule une estimation dépassée. */
export async function estimatePlace(input: EstimateInput, signal?: AbortSignal): Promise<Estimate> {
  return parseResponse(
    estimateSchema,
    await api.post(`${CLEANING_API}/estimates`, input, { auth: false, signal }),
  );
}

/** Commune d'une position GPS : coordonnées dans le corps, jamais dans l'adresse (journaux d'accès). */
export async function resolveLocation(location: {
  latitude: number;
  longitude: number;
}): Promise<LocationResolution> {
  return parseResponse(
    locationResolutionSchema,
    await api.post(`${CLEANING_API}/locations/resolve`, {
      latitude: location.latitude,
      longitude: location.longitude,
    }),
  );
}

export async function requestQuoteGroup(
  input: QuoteGroupInput,
  idempotencyKey: string,
): Promise<RequestGroup> {
  return parseResponse(requestGroupSchema, await api.post(GROUPS, input, { idempotencyKey }));
}

export async function getRequestGroup(id: string): Promise<RequestGroup> {
  return parseResponse(requestGroupSchema, await api.get(`${GROUPS}/${encodeURIComponent(id)}`));
}

const page = (cursor?: string) => ({ query: { limit: PAGE_SIZE, cursor } });

export async function listRequests(cursor?: string): Promise<QuoteRequestList> {
  return parseResponse(quoteRequestListSchema, await api.get(REQUESTS, page(cursor)));
}

export async function getRequest(id: string): Promise<QuoteRequest> {
  return parseResponse(quoteRequestSchema, await api.get(`${REQUESTS}/${encodeURIComponent(id)}`));
}

export async function acceptQuote(
  id: string,
  input: AcceptInput,
  idempotencyKey: string,
): Promise<AcceptResponse> {
  return parseResponse(
    acceptResponseSchema,
    await api.post(`${REQUESTS}/${encodeURIComponent(id)}/accept`, input, { idempotencyKey }),
  );
}

/** Motif facultatif : un motif vide n'est pas envoyé. */
const reasonBody = (reason: string) => (reason.trim() ? { reason: reason.trim() } : {});

export async function declineQuote(id: string, reason: string): Promise<QuoteRequest> {
  return parseResponse(
    quoteRequestSchema,
    await api.post(`${REQUESTS}/${encodeURIComponent(id)}/decline`, reasonBody(reason)),
  );
}

export async function cancelRequest(id: string, reason: string): Promise<QuoteRequest> {
  return parseResponse(
    quoteRequestSchema,
    await api.post(`${REQUESTS}/${encodeURIComponent(id)}/cancel`, reasonBody(reason)),
  );
}

export async function listMissions(cursor?: string): Promise<MissionList> {
  return parseResponse(missionListSchema, await api.get(MISSIONS, page(cursor)));
}

export async function getMission(id: string): Promise<Mission> {
  return parseResponse(missionSchema, await api.get(`${MISSIONS}/${encodeURIComponent(id)}`));
}

export async function cancelMission(id: string, reason: string): Promise<Mission> {
  return parseResponse(
    missionSchema,
    await api.post(`${MISSIONS}/${encodeURIComponent(id)}/cancel`, reasonBody(reason)),
  );
}
