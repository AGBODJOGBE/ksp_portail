import type { ExtraRequest } from './gateway';

/**
 * Service Nettoyage simulé (routes `/api/v1/cleaning/*` du contrat `ksp-api.v1.yaml`) : catalogue,
 * zones desservies, simulation, demandes de devis, acceptation et missions. `sendQuote()` joue le superviseur qui envoie
 * le devis après la visite des lieux.
 */

const xof = (amount: number) => ({ amount, currency: 'XOF' });
const error = (code: string, message: string) => ({
  error: { code, message, details: {}, correlationId: '0192f1c4-7a2b-7c3d-8e4f-5a6b7c8d9e12' },
});

const REQUEST_ID = '0192f1c4-7a2b-7c3d-8e4f-5a6b7c8d1001';
const MISSION_ID = '0192f1c4-7a2b-7c3d-8e4f-5a6b7c8d1000';

const SERVICES = {
  data: [
    {
      code: 'home_cleaning',
      name: 'Nettoyage à domicile',
      description: 'Maison ou appartement.',
      unit: 'room',
      options: [{ code: 'windows', label: 'Vitres', price: xof(4000) }],
      priced: true,
      minimumPrice: xof(15000),
    },
  ],
};

const ZONES = {
  data: [
    { code: 'abomey-calavi', commune: 'Abomey-Calavi' },
    { code: 'cotonou', commune: 'Cotonou' },
    { code: 'porto-novo', commune: 'Porto-Novo' },
  ],
};

const SIMULATION = {
  serviceCode: 'home_cleaning',
  priced: true,
  estimate: { low: xof(33500), high: xof(43000) },
  computedPrice: xof(37400),
  breakdown: [
    { label: 'Nettoyage à domicile', quantity: 6, unitPrice: xof(5000), amount: xof(30000) },
    { label: 'Vitres', quantity: 1, unitPrice: xof(4000), amount: xof(4000) },
  ],
  minimumApplied: false,
  communeCoefficientBp: 11000,
  recommendedTeamSize: 2,
  notice: 'Estimation non contractuelle : le prix définitif figure dans le devis établi par KSP.',
  covered: true,
};

/** Créneau à 08:00 (heure du Bénin) dans `days` jours. */
function slotIn(days: number) {
  const date = new Date(Date.now() + days * 86_400_000).toISOString().slice(0, 10);
  return { start: `${date}T07:00:00Z`, end: `${date}T11:00:00Z` };
}

export interface FakeCleaning {
  routes: (request: ExtraRequest) => { status: number; body: unknown } | undefined;
  /** Le superviseur envoie le devis (après la visite). */
  sendQuote: () => void;
  idempotencyKeys: string[];
}

export function fakeCleaning(): FakeCleaning {
  let request: Record<string, unknown> | null = null;
  let mission: Record<string, unknown> | null = null;
  const idempotencyKeys: string[] = [];
  const unauthorized = { status: 401, body: error('GATEWAY_TOKEN_MISSING', 'Vous devez être connecté.') };

  const quote = () => ({
    id: '0192f1c4-7a2b-7c3d-8e4f-5a6b7c8d3001',
    lines: SIMULATION.breakdown,
    subtotal: xof(34000),
    interventionCount: 1,
    total: xof(34000),
    proposedSlots: [slotIn(5), slotIn(6)],
    validUntil: new Date(Date.now() + 4 * 86_400_000).toISOString(),
    depositPercent: 30,
    depositAmount: xof(10200),
    recurrence: null,
    teamSize: 2,
    durationMinutes: 180,
    sentAt: new Date().toISOString(),
  });

  function routes({ method, path, body, headers, authorized }: ExtraRequest) {
    if (!path.startsWith('/api/v1/cleaning/')) return undefined;
    const key = `${method} ${path}`;
    if (key === 'GET /api/v1/cleaning/services') return { status: 200, body: SERVICES };
    if (key === 'GET /api/v1/cleaning/zones') return { status: 200, body: ZONES };
    if (key === 'POST /api/v1/cleaning/simulations') return { status: 200, body: SIMULATION };
    if (!authorized) return unauthorized;

    switch (key) {
      case 'POST /api/v1/cleaning/quote-requests':
        idempotencyKeys.push(headers['idempotency-key'] ?? '');
        request ??= {
          id: REQUEST_ID,
          status: 'received',
          customerId: '0192f1c4-7a2b-7c3d-8e4f-5a6b7c8d9e11',
          customerKind: 'individual',
          organizationId: null,
          ...body,
          options: body?.options ?? [],
          comment: body?.comment ?? null,
          recurrence: null,
          requestedTeamSize: null,
          daysPerWeek: null,
          recommendedTeamSize: 2,
          estimate: SIMULATION.estimate,
          visit: null,
          quote: null,
          missionId: null,
          closingReason: null,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        return { status: 200, body: request };
      case 'GET /api/v1/cleaning/quote-requests':
        return { status: 200, body: { data: request ? [request] : [], nextCursor: null } };
      case `GET /api/v1/cleaning/quote-requests/${REQUEST_ID}`:
        return request
          ? { status: 200, body: request }
          : { status: 404, body: error('CLEANING_REQUEST_NOT_FOUND', 'Demande introuvable.') };
      case `POST /api/v1/cleaning/quote-requests/${REQUEST_ID}/accept`: {
        idempotencyKeys.push(headers['idempotency-key'] ?? '');
        const slots = (request?.quote as { proposedSlots: Array<{ start: string; end: string }> })
          .proposedSlots;
        const chosen = slots.find((slot) => slot.start === body?.slotStart) ?? slots[0];
        mission = {
          id: MISSION_ID,
          requestId: REQUEST_ID,
          quoteId: '0192f1c4-7a2b-7c3d-8e4f-5a6b7c8d3001',
          customerId: '0192f1c4-7a2b-7c3d-8e4f-5a6b7c8d9e11',
          customerKind: request?.customerKind ?? 'individual',
          organizationId: request?.organizationId ?? null,
          customerName: null,
          organizationName: null,
          status: 'scheduled',
          serviceCode: 'home_cleaning',
          commune: request?.commune,
          address: request?.address,
          chosenSlot: chosen,
          recurrence: null,
          plannedInterventions: 1,
          completedInterventions: 0,
          interventions: [],
          payment: {
            plan: body?.paymentPlan,
            status: 'due',
            total: xof(34000),
            depositPercent: 30,
            depositAmount: xof(10200),
            paid: xof(0),
            payments: [],
          },
          cancellationReason: null,
          daysPerWeek: null,
          suspension: null,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        request = { ...request, status: 'accepted', missionId: MISSION_ID };
        return { status: 200, body: { request, mission } };
      }
      case 'GET /api/v1/cleaning/missions':
        return { status: 200, body: { data: mission ? [mission] : [], nextCursor: null } };
      case `GET /api/v1/cleaning/missions/${MISSION_ID}`:
        return mission
          ? { status: 200, body: mission }
          : { status: 404, body: error('CLEANING_MISSION_NOT_FOUND', 'Mission introuvable.') };
      default:
        return { status: 404, body: error('GATEWAY_ROUTE_NOT_FOUND', "Cette adresse n'existe pas.") };
    }
  }

  return {
    routes,
    idempotencyKeys,
    sendQuote: () => {
      if (!request) return;
      // La visite des lieux est obligatoire avant le devis.
      const visit = {
        id: '0192f1c4-7a2b-7c3d-8e4f-5a6b7c8d2001',
        status: 'completed',
        scheduledAt: new Date(Date.now() - 86_400_000).toISOString(),
        agentId: '0192f1c4-7a2b-7c3d-8e4f-5a6b7c8d0002',
        report: 'Six pièces, accès facile.',
        completedAt: new Date(Date.now() - 82_800_000).toISOString(),
      };
      request = { ...request, status: 'quote_sent', visit, quote: quote() };
    },
  };
}
