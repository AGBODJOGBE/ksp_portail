/**
 * Réponses du Nettoyage v2 au format du contrat `ksp-api.v1.yaml` (exemples du contrat et données de
 * démonstration), pour les tests unitaires.
 */

export const VILLA_ID = '0192f1c4-de70-7000-8000-000000000b11';
export const OTHER_ID = '0192f1c4-de70-7000-8000-000000000b99';
export const FLOOR_ID = '0192f1c4-de70-7000-8000-000000000e01';
export const WINDOWS_ID = '0192f1c4-de70-7000-8000-000000000e02';
export const PACK_ID = '0192f1c4-de70-7000-8000-000000000e03';
export const PLACE_ID = '0192f1c4-de70-7000-8000-000000000a01';
export const REQUEST_ID = '0192f1c4-de70-7000-8000-000000000c01';
export const QUOTE_ID = '0192f1c4-de70-7000-8000-000000000c11';
export const PROGRAM_ID = '0192f1c4-de70-7000-8000-000000000c21';

const money = (amount: number) => ({ amount, currency: 'XOF' as const });

export const CATALOG = {
  data: [
    {
      id: 'cat-maison',
      code: 'house',
      name: 'Maison',
      icon: 'house',
      placeTypes: [
        {
          id: VILLA_ID,
          code: 'villa',
          name: 'Villa',
          icon: 'villa',
          photoUrl: null,
          description: 'Maison individuelle avec cour.',
          freeDescription: false,
        },
        {
          id: OTHER_ID,
          code: 'other',
          name: 'Autre lieu',
          icon: null,
          photoUrl: null,
          description: null,
          freeDescription: true,
        },
      ],
    },
  ],
};

const parameter = (overrides: Record<string, unknown>) => ({
  id: `p-${String(overrides['code'])}`,
  unit: null,
  min: null,
  max: null,
  choices: [],
  required: false,
  help: null,
  active: true,
  ...overrides,
});

export const VILLA_DETAIL = {
  placeType: CATALOG.data[0]!.placeTypes[0],
  categoryId: 'cat-maison',
  parameters: [
    parameter({
      code: 'surface',
      label: 'Superficie',
      kind: 'number',
      unit: 'm²',
      min: 1,
      max: 5000,
      required: true,
    }),
    parameter({ code: 'yard', label: 'Cour', kind: 'boolean' }),
    parameter({
      code: 'dirt_level',
      label: 'Niveau de saleté',
      kind: 'choice',
      required: true,
      choices: [
        { code: 'normal', label: 'Normal', active: true },
        { code: 'heavy', label: 'Important', active: true },
      ],
    }),
  ],
  offers: [
    {
      offerId: 'o-floor',
      cleaningType: {
        id: FLOOR_ID,
        code: 'floor',
        name: 'Sol',
        description: null,
        icon: null,
        isPack: false,
        packItemIds: [],
      },
      extraParameters: [],
    },
    {
      offerId: 'o-windows',
      cleaningType: {
        id: WINDOWS_ID,
        code: 'windows',
        name: 'Vitres',
        description: null,
        icon: null,
        isPack: false,
        packItemIds: [],
      },
      extraParameters: [
        parameter({
          code: 'windows_count',
          label: 'Fenêtres',
          kind: 'number',
          min: 1,
          max: 200,
          required: true,
        }),
      ],
    },
    {
      offerId: 'o-pack',
      cleaningType: {
        id: PACK_ID,
        code: 'pack',
        name: 'Pack complet',
        description: null,
        icon: null,
        isPack: true,
        packItemIds: [FLOOR_ID, WINDOWS_ID],
      },
      extraParameters: [],
    },
  ],
  visitFee: money(5000),
};

export const OTHER_DETAIL = {
  ...VILLA_DETAIL,
  placeType: CATALOG.data[0]!.placeTypes[1],
  parameters: [],
  offers: [],
};

export const ZONES = { data: [{ communeKey: 'cotonou', name: 'Cotonou' }] };

export function pricing(overrides: Record<string, unknown> = {}) {
  return {
    communeKey: 'cotonou',
    communeCoefficientBps: 10000,
    offers: [
      {
        offerId: 'o-floor',
        cleaningTypeId: FLOOR_ID,
        cleaningTypeCode: 'floor',
        name: 'Sol',
        tariffVersion: 1,
        status: 'priced',
        minimumApplied: false,
        price: money(26640),
        lines: [
          {
            kind: 'bracket',
            label: 'Sol, tranche 51 à 150 m²',
            parameterCode: 'surface',
            quantity: 120,
            unitAmount: money(180),
            coefficientBps: null,
            amount: money(21600),
          },
        ],
        onQuoteReason: null,
        tariffStatus: 'published',
      },
    ],
    complete: true,
    packDiscount: money(0),
    sessionPrice: money(32040),
    range: { low: money(28500), high: money(37000) },
    sessionsCount: 12,
    programTotal: money(384480),
    frequencyDiscount: money(3560),
    visitFee: money(5000),
    calculatedAt: '2026-11-19T10:00:00Z',
    pricedSubtotal: money(32040),
    status: 'priced',
    programRange: { low: money(342000), high: money(444000) },
    teamSize: 2,
    durationMinutes: 180,
    ...overrides,
  };
}

export function simulation(overrides: Record<string, unknown> = {}) {
  return {
    pricing: pricing(),
    schedule: null,
    disclaimer: 'Estimation non contractuelle, confirmée après la visite des lieux.',
    covered: true,
    communeApplied: true,
    notices: [],
    usesDrafts: false,
    ...overrides,
  };
}

export const ON_QUOTE = simulation({
  pricing: pricing({
    status: 'on_quote',
    complete: false,
    sessionPrice: null,
    range: null,
    programTotal: null,
    programRange: null,
    pricedSubtotal: null,
    offers: [
      {
        ...pricing().offers[0],
        status: 'on_quote',
        price: null,
        onQuoteReason: 'above_last_bracket',
      },
    ],
  }),
  notices: ['no_commune', 'on_quote'],
});

export function place(overrides: Record<string, unknown> = {}) {
  return {
    id: PLACE_ID,
    name: 'Maison de Calavi',
    placeTypeId: VILLA_ID,
    placeTypeName: 'Villa',
    communeKey: 'abomey-calavi',
    communeName: 'Abomey-Calavi',
    served: true,
    location: {
      latitude: 6.45,
      longitude: 2.35,
      landmark: 'Portail bleu après la pharmacie',
      address: null,
      readableAddress: 'Abomey-Calavi, Bénin',
      accuracyMeters: 12,
    },
    declaredValues: { surface: 120, yard: true },
    archived: false,
    createdAt: '2026-11-20T09:00:00Z',
    updatedAt: '2026-11-20T09:00:00Z',
    locationCorrectedAt: null,
    locationErasedAt: null,
    ...overrides,
  };
}

const schedule = {
  kind: 'weekly',
  startTime: '08:00',
  weekdays: ['mon'],
  everyWeeks: 1,
  startDate: '2027-01-04',
  durationWeeks: 12,
  excludeHolidays: true,
};

export function quote(overrides: Record<string, unknown> = {}) {
  return {
    id: QUOTE_ID,
    requestId: REQUEST_ID,
    requestNumber: 'DN-000124',
    programId: null,
    kind: 'initial',
    version: 1,
    status: 'sent',
    place: {
      placeId: PLACE_ID,
      name: 'Maison de Calavi',
      placeTypeId: VILLA_ID,
      placeTypeName: 'Villa',
      communeKey: 'abomey-calavi',
      communeName: 'Abomey-Calavi',
      location: null,
    },
    lines: [
      {
        offerId: 'o-floor',
        cleaningTypeId: FLOOR_ID,
        name: 'Sol',
        quantity: 130,
        unit: 'm²',
        unitPrice: money(180),
        amount: money(23400),
        kind: 'offer',
      },
    ],
    adjustments: [],
    sessionPrice: money(23400),
    sessionsCount: 12,
    sessionStarts: ['2027-01-04T07:00:00Z', '2027-01-11T07:00:00Z'],
    total: money(280800),
    visitFeeDeduction: money(5000),
    teamSize: 2,
    durationMinutes: 180,
    schedule,
    paymentTerms: 'per_session',
    comparison: {
      confirmed: false,
      rows: [
        {
          parameterCode: 'surface',
          label: 'Superficie',
          unit: 'm²',
          declared: 120,
          observed: 132,
          retained: 130,
          priceEffect: money(1800),
          reason: 'Mesure faite sur place',
          declaredDisplay: '120 m²',
          observedDisplay: '132 m²',
          retainedDisplay: '130 m²',
        },
      ],
      addedCleaningTypes: [],
      removedCleaningTypes: [],
      declaredSessionPrice: money(21600),
      retainedSessionPrice: money(23400),
    },
    validUntil: '2027-12-10T23:00:00Z',
    termsVersion: 'cg-2026-11',
    pdfDocumentId: null,
    sentAt: '2026-11-25T09:00:00Z',
    respondedAt: null,
    createdAt: '2026-11-25T08:00:00Z',
    retainedRevision: 1,
    ...overrides,
  };
}

export function visitFee(overrides: Record<string, unknown> = {}) {
  return {
    id: 'fee-1',
    amount: money(6000),
    status: 'paid',
    payBefore: null,
    paidAt: '2026-11-24T10:00:00Z',
    invoiceId: 'inv-1',
    rank: 1,
    refundedAt: null,
    ...overrides,
  };
}

export function request(overrides: Record<string, unknown> = {}) {
  const fee = visitFee();
  return {
    id: REQUEST_ID,
    number: 'DN-000124',
    status: 'visit_to_schedule',
    customerKind: 'individual',
    customerId: 'u-1',
    organizationId: null,
    place: quote().place,
    cleaningTypes: [{ id: FLOOR_ID, code: 'floor', name: 'Sol' }],
    declaredValues: { surface: 120 },
    freeDescription: null,
    comment: null,
    photos: [],
    schedule,
    visitSlots: [{ start: '2026-11-27T07:00:00Z', end: '2026-11-27T11:00:00Z' }],
    declaredPricing: pricing(),
    visitFee: fee,
    visits: [],
    retained: null,
    comparison: null,
    currentQuote: null,
    quoteHistory: [],
    programId: null,
    reactivation: null,
    createdAt: '2026-11-24T10:00:00Z',
    updatedAt: '2026-11-24T10:00:00Z',
    declaredRows: [
      {
        code: 'surface',
        label: 'Superficie',
        kind: 'number',
        unit: 'm²',
        value: 120,
        display: '120 m²',
        choiceLabel: null,
      },
    ],
    visitFees: [fee],
    customerName: null,
    organizationName: null,
    warnings: [],
    ...overrides,
  };
}

export const PROGRAM = {
  id: PROGRAM_ID,
  number: 'PN-000057',
  status: 'confirmed',
  requestId: REQUEST_ID,
  quoteId: QUOTE_ID,
  customerKind: 'individual',
  customerId: 'u-1',
  organizationId: null,
  payerKind: 'individual',
  place: quote().place,
  cleaningTypes: [],
  schedule,
  sessionsCount: 12,
  sessionsCompleted: 0,
  sessionPrice: money(23400),
  total: money(280800),
  firstSessionAt: '2027-01-04T07:00:00Z',
  lastSessionAt: '2027-03-22T07:00:00Z',
  suspensionCauses: [],
  renewal: null,
  createdAt: '2026-11-26T09:00:00Z',
  pendingCancellation: null,
  customerName: null,
  organizationName: null,
};

export const SESSION_ID = '0192f1c4-de70-7000-8000-000000000d01';
export const CLAIM_ID = '0192f1c4-de70-7000-8000-000000000f01';

export function program(overrides: Record<string, unknown> = {}) {
  return { ...PROGRAM, ...overrides };
}

export function agent(overrides: Record<string, unknown> = {}) {
  return {
    agentId: '0192f1c4-de70-7000-8000-00000000aa01',
    firstName: 'Afi',
    lastName: 'Houngbo',
    photoUrl: null,
    isLead: true,
    confirmation: 'confirmed',
    ...overrides,
  };
}

/** Séance 3/12 du lundi 18 janvier 2027, 08:00–12:00 à Porto-Novo, à venir. */
export function session(overrides: Record<string, unknown> = {}) {
  return {
    id: SESSION_ID,
    programId: PROGRAM_ID,
    programNumber: 'PN-000057',
    rank: 3,
    sessionsCount: 12,
    status: 'assigned',
    scheduledStart: '2027-01-18T07:00:00Z',
    scheduledEnd: '2027-01-18T11:00:00Z',
    paymentStatus: 'not_due',
    price: money(23400),
    amountDue: null,
    visitFeeDeduction: null,
    dueBy: null,
    agents: [agent()],
    arrival: null,
    startedAt: null,
    completedAt: null,
    checklist: [],
    photos: [],
    incidents: [],
    signed: false,
    rating: null,
    reschedules: [],
    cancellation: null,
    isRedo: false,
    invoiceId: null,
    claimIds: [],
    customerName: null,
    organizationName: null,
    ...overrides,
  };
}

/** Séance réalisée, à payer. */
export function completedSession(overrides: Record<string, unknown> = {}) {
  return session({
    status: 'completed',
    scheduledStart: '2026-11-23T07:00:00Z',
    scheduledEnd: '2026-11-23T11:00:00Z',
    arrival: {
      arrivedAt: '2026-11-23T06:55:00Z',
      distanceMeters: 12,
      alert: false,
      placeAccuracyMeters: 10,
      arrivalAccuracyMeters: 8,
      uncertain: false,
    },
    startedAt: '2026-11-23T07:02:00Z',
    completedAt: '2026-11-23T10:50:00Z',
    paymentStatus: 'due',
    amountDue: money(18400),
    visitFeeDeduction: money(5000),
    dueBy: '2026-11-24T10:50:00Z',
    checklist: [
      {
        code: 'floor',
        label: 'Sols lavés',
        cleaningTypeCode: 'floor',
        checked: true,
        checkedAt: '2026-11-23T09:30:00Z',
      },
    ],
    photos: [
      {
        fileId: '0192f1c4-de70-7000-8000-00000000bb01',
        kind: 'before',
        takenAt: '2026-11-23T07:00:00Z',
        url: 'https://files.ksp.bj/avant.jpg',
        urlExpiresAt: '2026-11-23T07:05:00Z',
      },
      {
        fileId: '0192f1c4-de70-7000-8000-00000000bb02',
        kind: 'after',
        takenAt: '2026-11-23T10:45:00Z',
        url: 'https://files.ksp.bj/apres.jpg',
        urlExpiresAt: '2026-11-23T10:50:00Z',
      },
    ],
    ...overrides,
  });
}

export function claim(overrides: Record<string, unknown> = {}) {
  return {
    id: CLAIM_ID,
    sessionId: SESSION_ID,
    programId: PROGRAM_ID,
    customerId: 'u-1',
    organizationId: null,
    category: 'incomplete_work',
    text: 'Les vitres de la cuisine n’ont pas été faites.',
    photos: [],
    status: 'open',
    messages: [
      {
        id: '0192f1c4-de70-7000-8000-00000000cc01',
        author: 'staff',
        authorId: 's-1',
        text: 'Merci, nous regardons avec l’équipe.',
        at: '2026-11-23T14:00:00Z',
      },
    ],
    decision: null,
    openedAt: '2026-11-23T12:00:00Z',
    firstResponseAt: '2026-11-23T14:00:00Z',
    closedAt: null,
    customerName: null,
    organizationName: null,
    ...overrides,
  };
}

export const list = <T>(data: T[], nextCursor: string | null = null) => ({
  data,
  nextCursor,
  total: data.length,
});

/* ——— Gateway simulée (fetch remplacé) ——— */

export type FakeReply = { status: number; body?: unknown };
export interface FakeCall {
  method: string;
  path: string;
  body: unknown;
  headers: Record<string, string>;
  /** Paramètres de la requête (`?status=…`). */
  query: URLSearchParams;
}

export function errorBody(code: string, message: string, details: Record<string, unknown> = {}) {
  return { error: { code, message, details, correlationId: '0192f1c4-7a2b-7c3d-8e4f-5a6b7c8d9e12' } };
}

/** Session au format `SessionResponse`, profil complet. */
export function sessionBody() {
  return {
    status: 'authenticated',
    accessToken: 'jeton-acces',
    accessTokenExpiresAt: '2099-01-01T00:15:00Z',
    refreshTokenExpiresAt: '2099-01-31T00:00:00Z',
    sessionId: '0192f1c4-7a2b-7c3d-8e4f-5a6b7c8d9e10',
    user: {
      id: '0192f1c4-7a2b-7c3d-8e4f-5a6b7c8d9e11',
      status: 'active',
      firstName: 'Koffi',
      lastName: 'Adjovi',
      phone: '+2290197000045',
      email: null,
      emailVerified: false,
      preferredLanguage: 'fr',
      createdAt: '2026-10-21T09:00:00Z',
    },
    profileIncomplete: false,
    activeContext: { type: 'individual', organizationId: null, organizationName: null },
  };
}

/**
 * « MÉTHODE /chemin » (ou « MÉTHODE /chemin?status=… ») → réponses dans l'ordre (la dernière est
 * répétée).
 */
export function stubGateway(routes: Record<string, FakeReply | FakeReply[]>) {
  const calls: FakeCall[] = [];
  const queues = new Map(Object.entries(routes).map(([key, value]) => [key, [value].flat()]));
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: string | URL, init: RequestInit = {}) => {
      const url = new URL(String(input));
      const method = init.method ?? 'GET';
      calls.push({
        method,
        path: url.pathname,
        query: url.searchParams,
        body: typeof init.body === 'string' ? (JSON.parse(init.body) as unknown) : undefined,
        headers: { ...(init.headers as Record<string, string>) },
      });
      // Une route filtrée par état (`GET /chemin?status=…`) répond avant la route sans filtre.
      const status = url.searchParams.get('status');
      const queue =
        (status ? queues.get(`${method} ${url.pathname}?status=${status}`) : undefined) ??
        queues.get(`${method} ${url.pathname}`);
      if (!queue?.length) throw new TypeError(`Route non simulée : ${method} ${url.pathname}`);
      const reply = (queue.length > 1 ? queue.shift() : queue[0])!;
      return new Response(reply.body === undefined ? null : JSON.stringify(reply.body), {
        status: reply.status,
        headers: { 'Content-Type': 'application/json', 'X-Correlation-Id': 'c-test' },
      });
    }),
  );
  return { calls };
}
