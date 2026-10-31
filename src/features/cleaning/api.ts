import { api, parseResponse } from '@/lib/api';
import {
  type AcceptResponse,
  acceptResponseSchema,
  type Mission,
  type MissionList,
  missionListSchema,
  missionSchema,
  type PaymentPlan,
  type QuoteRequest,
  type QuoteRequestList,
  quoteRequestListSchema,
  quoteRequestSchema,
  type Recurrence,
  type ServedZone,
  servedZoneListSchema,
  type ServiceOffer,
  serviceListSchema,
  type Simulation,
  simulationSchema,
  type TimeSlot,
} from './schemas';
import { ZONES_PATH } from './zones';

/**
 * Appels du navigateur à la gateway pour le Nettoyage. Le catalogue, les zones et le simulateur sont
 * publics (sans jeton) ; la demande de devis et « Mes prestations de nettoyage » demandent une session
 * (option A, F-005).
 */

export const CLEANING_API = '/api/v1/cleaning';
const REQUESTS = `${CLEANING_API}/quote-requests`;
const MISSIONS = `${CLEANING_API}/missions`;

/** Taille d'une page des listes (le contrat accepte 1 à 100, 20 par défaut). */
export const PAGE_SIZE = 10;

/** `SimulateCleaningRequest`. */
export interface SimulationInput {
  serviceCode: string;
  premisesType: string;
  quantity: number;
  options: string[];
  commune: string;
  frequency?: 'once' | 'weekly' | 'monthly';
}

/** `RequestCleaningQuoteRequest` : le type de client (particulier ou entreprise) vient du contexte actif. */
export interface QuoteRequestInput extends Omit<SimulationInput, 'frequency'> {
  address: string;
  preferredSlots: TimeSlot[];
  comment?: string;
  recurrence?: Recurrence;
  /** Nombre d'agents souhaité (1 à 50), si le client l'indique. */
  requestedTeamSize?: number;
  /** Entreprise : jours d'intervention par semaine (1 à 7), si connus. */
  daysPerWeek?: number;
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

const zones = cachedRead(
  async () => parseResponse(servedZoneListSchema, await api.get(ZONES_PATH, { auth: false })).data,
);

export function listServices(): Promise<ServiceOffer[]> {
  return services.get();
}

/** Zones desservies, quand la page ne les a pas reçues du serveur. */
export function listZones(): Promise<ServedZone[]> {
  return zones.get();
}

/** Réservé aux tests : oublie le catalogue et les zones lus. */
export function resetServicesCache(): void {
  services.reset();
  zones.reset();
}

export async function simulate(input: SimulationInput, signal?: AbortSignal): Promise<Simulation> {
  return parseResponse(
    simulationSchema,
    await api.post(`${CLEANING_API}/simulations`, input, { auth: false, signal }),
  );
}

export async function requestQuote(input: QuoteRequestInput, idempotencyKey: string): Promise<QuoteRequest> {
  return parseResponse(quoteRequestSchema, await api.post(REQUESTS, input, { idempotencyKey }));
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
