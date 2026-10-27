/**
 * Gateway simulée pour les tests du Nettoyage : `fetch` remplacé, réponses au format du contrat
 * `ksp-api.v1.yaml` (routes `/api/v1/cleaning/*`). Les requêtes reçues sont gardées (corps, en-têtes).
 */

export type FakeResponse = { status: number; body?: unknown };
type Handler = FakeResponse | ((body: unknown, url: URL) => FakeResponse);

export interface GatewayCall {
  method: string;
  path: string;
  query: Record<string, string>;
  body: unknown;
  headers: Record<string, string>;
}

const xof = (amount: number) => ({ amount, currency: 'XOF' as const });

export const SERVICES = {
  data: [
    {
      code: 'home_cleaning',
      name: 'Nettoyage à domicile',
      description: 'Maison ou appartement.',
      unit: 'room',
      options: [
        { code: 'windows', label: 'Vitres', price: xof(4000) },
        { code: 'furniture', label: 'Mobilier', price: null },
      ],
      priced: true,
      minimumPrice: xof(15000),
    },
    {
      code: 'pest_control',
      name: 'Désinsectisation',
      description: 'Traitement contre les insectes.',
      unit: 'square_meter',
      options: [],
      priced: false,
      minimumPrice: null,
    },
  ],
};

export const SIMULATION = {
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

export const UNPRICED = {
  ...SIMULATION,
  serviceCode: 'pest_control',
  priced: false,
  estimate: null,
  computedPrice: null,
  breakdown: [],
  notice: "Le prix de cette prestation n'est pas encore publié : demandez un devis, KSP vous répondra.",
};

export const REQUEST_ID = '0192f1c4-7a2b-7c3d-8e4f-5a6b7c8d1001';
export const MISSION_ID = '0192f1c4-7a2b-7c3d-8e4f-5a6b7c8d1000';

export const QUOTE = {
  id: '0192f1c4-7a2b-7c3d-8e4f-5a6b7c8d3001',
  lines: [
    { label: 'Nettoyage à domicile', quantity: 6, unitPrice: xof(5000), amount: xof(30000) },
    { label: 'Vitres', quantity: 1, unitPrice: xof(4000), amount: xof(4000) },
  ],
  subtotal: xof(34000),
  interventionCount: 1,
  total: xof(34000),
  proposedSlots: [
    { start: '2099-11-05T07:00:00Z', end: '2099-11-05T11:00:00Z' },
    { start: '2099-11-06T12:00:00Z', end: '2099-11-06T16:00:00Z' },
  ],
  validUntil: '2099-11-04T08:00:00Z',
  depositPercent: 30,
  depositAmount: xof(10200),
  recurrence: null,
  teamSize: 2,
  durationMinutes: 180,
  sentAt: '2026-10-23T08:00:00Z',
};

export function quoteRequest(overrides: Record<string, unknown> = {}) {
  return {
    id: REQUEST_ID,
    status: 'received',
    customerId: '0192f1c4-7a2b-7c3d-8e4f-5a6b7c8d9e11',
    customerKind: 'individual',
    organizationId: null,
    serviceCode: 'home_cleaning',
    premisesType: 'house',
    quantity: 6,
    options: ['windows'],
    commune: 'Abomey-Calavi',
    address: 'Lot 12, quartier Zogbadjè',
    preferredSlots: [{ start: '2099-11-05T07:00:00Z', end: '2099-11-05T11:00:00Z' }],
    comment: 'Portail bleu.',
    recurrence: null,
    requestedTeamSize: null,
    daysPerWeek: null,
    recommendedTeamSize: 2,
    estimate: { low: xof(32000), high: xof(41000) },
    visit: null,
    quote: null,
    missionId: null,
    closingReason: null,
    createdAt: '2026-10-22T10:00:00Z',
    updatedAt: '2026-10-23T08:00:00Z',
    ...overrides,
  };
}

export function mission(overrides: Record<string, unknown> = {}) {
  return {
    id: MISSION_ID,
    requestId: REQUEST_ID,
    quoteId: QUOTE.id,
    customerId: '0192f1c4-7a2b-7c3d-8e4f-5a6b7c8d9e11',
    status: 'scheduled',
    serviceCode: 'home_cleaning',
    commune: 'Abomey-Calavi',
    address: 'Lot 12, quartier Zogbadjè',
    chosenSlot: QUOTE.proposedSlots[0],
    recurrence: null,
    plannedInterventions: 1,
    completedInterventions: 0,
    interventions: [
      {
        id: '0192f1c4-7a2b-7c3d-8e4f-5a6b7c8d4001',
        status: 'planned',
        scheduledStart: '2099-11-05T07:00:00Z',
        durationMinutes: 180,
        agents: [{ agentId: '0192f1c4-7a2b-7c3d-8e4f-5a6b7c8d0002', displayName: 'Awa B.' }],
        checklist: [],
        incidentNote: null,
        beforePhotoFileIds: [],
        afterPhotoFileIds: [],
        startedAt: null,
        completedAt: null,
      },
    ],
    payment: {
      plan: { option: 'deposit', timing: 'before', method: 'cash' },
      status: 'deposit_received',
      total: xof(34000),
      depositPercent: 30,
      depositAmount: xof(10200),
      paid: xof(10200),
      payments: [
        {
          id: '0192f1c4-7a2b-7c3d-8e4f-5a6b7c8d5001',
          amount: xof(10200),
          method: 'cash',
          reference: 'Reçu 0042',
          recordedBy: '0192f1c4-7a2b-7c3d-8e4f-5a6b7c8d0001',
          recordedAt: '2026-10-24T09:00:00Z',
        },
      ],
    },
    cancellationReason: null,
    daysPerWeek: null,
    suspension: null,
    createdAt: '2026-10-23T09:00:00Z',
    updatedAt: '2026-10-24T09:00:00Z',
    ...overrides,
  };
}

export function errorBody(code: string, message: string, details: Record<string, unknown> = {}) {
  return { error: { code, message, details, correlationId: '0192f1c4-7a2b-7c3d-8e4f-5a6b7c8d9e12' } };
}

/**
 * Remplace `fetch`. `routes` associe « MÉTHODE /chemin » à une réponse, ou à une liste de réponses
 * données dans l'ordre (la dernière est répétée).
 */
export function stubGateway(routes: Record<string, Handler | Handler[]>) {
  const calls: GatewayCall[] = [];
  const queues = new Map(Object.entries(routes).map(([key, value]) => [key, [value].flat()]));

  const fetchMock = vi.fn(async (input: string | URL | Request, init: RequestInit = {}) => {
    const url = new URL(String(input));
    const method = init.method ?? 'GET';
    const body = typeof init.body === 'string' ? (JSON.parse(init.body) as unknown) : undefined;
    calls.push({
      method,
      path: url.pathname,
      query: Object.fromEntries(url.searchParams),
      body,
      headers: { ...(init.headers as Record<string, string>) },
    });
    const queue = queues.get(`${method} ${url.pathname}`);
    if (!queue?.length) throw new TypeError(`Route non simulée : ${method} ${url.pathname}`);
    const handler = (queue.length > 1 ? queue.shift() : queue[0]) as Handler;
    const response = typeof handler === 'function' ? handler(body, url) : handler;
    return new Response(response.body === undefined ? null : JSON.stringify(response.body), {
      status: response.status,
      headers: { 'Content-Type': 'application/json', 'X-Correlation-Id': 'c-test' },
    });
  });

  vi.stubGlobal('fetch', fetchMock);
  return { calls, fetchMock };
}
