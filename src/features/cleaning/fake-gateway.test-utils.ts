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

/** `GET /cleaning/zones` (exemple du contrat). */
export const ZONES = {
  data: [
    { code: 'abomey-calavi', commune: 'Abomey-Calavi' },
    { code: 'cotonou', commune: 'Cotonou' },
    { code: 'porto-novo', commune: 'Porto-Novo' },
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
    customerKind: 'individual',
    organizationId: null,
    customerName: null,
    organizationName: null,
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
        cancellationCause: null,
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

interface FieldFixture {
  code: string;
  label: string;
  type: string;
  required: boolean;
  helpText: string | null;
  unitLabel: string | null;
  min: number | null;
  max: number | null;
  choices: Array<{ code: string; label: string }>;
}

const field = (
  overrides: Pick<FieldFixture, 'code' | 'label' | 'type'> & Partial<FieldFixture>,
): FieldFixture => ({
  required: true,
  helpText: null,
  unitLabel: null,
  min: null,
  max: null,
  choices: [],
  ...overrides,
});

/** `GET /cleaning/catalog` : deux lieux, trois prestations avec leur formulaire (sans prix). */
export const CATALOG = {
  placeTypes: [
    {
      code: 'apartment',
      label: 'Appartement',
      description: 'Appartement en immeuble.',
      icon: 'apartment',
      displayOrder: 30,
      serviceCodes: ['window_cleaning'],
    },
    {
      code: 'house',
      label: 'Maison',
      description: 'Maison individuelle, avec ou sans cour.',
      icon: 'house',
      displayOrder: 10,
      serviceCodes: ['house_cleaning', 'window_cleaning', 'unknown_service'],
    },
  ],
  services: [
    {
      code: 'house_cleaning',
      name: 'Nettoyage de maison',
      description: 'Ménage complet de la maison.',
      unit: 'room',
      options: [],
      priced: true,
      minimumPrice: null,
      form: {
        fields: [
          field({
            code: 'surface',
            label: 'Superficie',
            type: 'number',
            unitLabel: 'm²',
            min: 1,
            max: 100000,
          }),
          field({
            code: 'condition',
            label: 'État de la maison',
            type: 'choice',
            choices: [
              { code: 'normal', label: 'Normal' },
              { code: 'dirty', label: 'Sale' },
            ],
          }),
          field({ code: 'pets', label: 'Présence d’animaux', type: 'boolean', required: false }),
        ],
        options: [
          {
            code: 'windows',
            label: 'Vitres',
            description: null,
            fields: [
              field({ code: 'window_count', label: 'Nombre de fenêtres', type: 'number', min: 1, max: 200 }),
            ],
          },
        ],
        frequencies: [
          { code: 'once', label: 'Une fois' },
          { code: 'monthly', label: 'Chaque mois' },
        ],
      },
    },
    {
      code: 'window_cleaning',
      name: 'Nettoyage de vitres',
      description: 'Fenêtres et baies vitrées.',
      unit: 'square_meter',
      options: [],
      priced: false,
      minimumPrice: null,
      form: {
        fields: [
          field({ code: 'window_count', label: 'Nombre de fenêtres', type: 'number', min: 1, max: 1000 }),
        ],
        options: [],
        frequencies: [],
      },
    },
  ],
};

/** `POST /cleaning/estimates` : une prestation chiffrée, une sans prix publié. */
export function estimateResponse(body: { items: Array<{ serviceCode: string }>; commune?: string }) {
  const items = body.items.map((item) =>
    item.serviceCode === 'house_cleaning'
      ? {
          serviceCode: 'house_cleaning',
          serviceName: 'Nettoyage de maison',
          priced: true,
          reason: null,
          notice: 'Estimation non contractuelle.',
          estimate: { low: xof(45000), high: xof(57500) },
          computedPrice: xof(50000),
          recommendedTeamSize: 2,
          missingPrices: [],
          calculation: {},
        }
      : {
          serviceCode: item.serviceCode,
          serviceName: 'Nettoyage de vitres',
          priced: false,
          reason: 'price_not_set',
          notice: 'Prix non publié.',
          estimate: null,
          computedPrice: null,
          recommendedTeamSize: 1,
          missingPrices: [],
          calculation: {},
        },
  );
  const priced = items.every((item) => item.priced);
  return {
    placeType: 'house',
    commune: body.commune ?? null,
    communeApplied: !!body.commune,
    covered: !!body.commune,
    status: priced ? 'priced' : items.some((item) => item.priced) ? 'partially_priced' : 'unpriced',
    total: priced ? 50000 : null,
    currency: 'XOF',
    notice: priced
      ? 'Estimation non contractuelle.'
      : 'Au moins une prestation n’a pas encore de prix publié.',
    items,
  };
}

export const GROUP_ID = '0192f1c4-7a2b-7c3d-8e4f-5a6b7c8d6001';

/** `CleaningQuoteRequestGroup` renvoyé par l'envoi et la lecture d'un groupe. */
export function requestGroup(serviceCodes: string[] = ['house_cleaning']) {
  return {
    groupId: GROUP_ID,
    placeType: 'house',
    commune: 'Cotonou',
    zoneCode: 'cotonou',
    createdAt: '2026-11-05T09:00:00Z',
    items: serviceCodes.map((serviceCode, index) =>
      quoteRequest({ id: `0192f1c4-7a2b-7c3d-8e4f-5a6b7c8d700${index}`, serviceCode, commune: 'Cotonou' }),
    ),
    quotesTotal: null,
    remainingDue: null,
  };
}
