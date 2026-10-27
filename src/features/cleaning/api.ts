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
  type ServiceOffer,
  serviceListSchema,
  type Simulation,
  simulationSchema,
  type TimeSlot,
} from './schemas';

/**
 * Appels du navigateur à la gateway pour le Nettoyage. Le simulateur est public (sans jeton) ; la
 * demande de devis et « Mes prestations de nettoyage » demandent une session (option A, F-005).
 */

const BASE = '/api/v1/cleaning';
const REQUESTS = `${BASE}/quote-requests`;
const MISSIONS = `${BASE}/missions`;

/** Taille d'une page des listes (le contrat accepte 1 à 100, 20 par défaut). */
export const PAGE_SIZE = 10;

export interface SimulationInput {
  serviceCode: string;
  premisesType: string;
  quantity: number;
  options: string[];
  commune: string;
  frequency?: 'once' | 'weekly' | 'monthly';
}

export interface QuoteRequestInput extends Omit<SimulationInput, 'frequency'> {
  address: string;
  preferredSlots: TimeSlot[];
  comment?: string;
  recurrence?: Recurrence;
  /** Entreprise : jours d'intervention par semaine (1 à 7), si connus. */
  daysPerWeek?: number;
}

/** Catalogue lu une fois par chargement de page : plusieurs écrans s'en servent pour nommer la prestation. */
let servicesCache: Promise<ServiceOffer[]> | null = null;

export function listServices(): Promise<ServiceOffer[]> {
  servicesCache ??= api
    .get(`${BASE}/services`, { auth: false })
    .then((body) => parseResponse(serviceListSchema, body).data);
  // Un échec n'est pas gardé : « Réessayer » relance la lecture.
  servicesCache.catch(() => {
    servicesCache = null;
  });
  return servicesCache;
}

/** Réservé aux tests : oublie le catalogue lu. */
export function resetServicesCache(): void {
  servicesCache = null;
}

export async function simulate(input: SimulationInput, signal?: AbortSignal): Promise<Simulation> {
  return parseResponse(
    simulationSchema,
    await api.post(`${BASE}/simulations`, input, { auth: false, signal }),
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
  input: { slotStart: string; paymentPlan: PaymentPlan },
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
