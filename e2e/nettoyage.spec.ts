import { expect, test } from '@playwright/test';
import { type ExtraRequest, mockGateway } from './support/gateway';

/**
 * Nettoyage v2 contre une gateway simulée (routes `/api/v1/cleaning/*` du contrat) : simulateur public,
 * demande de devis jusqu'à l'envoi (connexion, lieu créé avec la position du téléphone, créneaux),
 * page de la demande avec frais de visite à régler, devis accepté.
 */

const VILLA = '0192f1c4-de70-7000-8000-000000000b11';
const FLOOR = '0192f1c4-de70-7000-8000-000000000e01';
const PLACE = '0192f1c4-de70-7000-8000-000000000a01';
const REQUEST = '0192f1c4-de70-7000-8000-000000000c01';
const QUOTE = '0192f1c4-de70-7000-8000-000000000c11';
const PROGRAM = '0192f1c4-de70-7000-8000-000000000c21';
const money = (amount: number) => ({ amount, currency: 'XOF' });
const error = (code: string, message: string, details = {}) => ({
  error: { code, message, details, correlationId: '0192f1c4-7a2b-7c3d-8e4f-5a6b7c8d9e12' },
});

const CATALOG = {
  data: [
    {
      id: 'c1',
      code: 'house',
      name: 'Maison',
      icon: 'house',
      placeTypes: [
        {
          id: VILLA,
          code: 'villa',
          name: 'Villa',
          icon: 'villa',
          photoUrl: null,
          description: 'Maison individuelle avec cour.',
          freeDescription: false,
        },
      ],
    },
  ],
};
const param = (code: string, label: string, extra: Record<string, unknown>) => ({
  id: `p-${code}`,
  code,
  label,
  unit: null,
  min: null,
  max: null,
  choices: [],
  required: false,
  help: null,
  active: true,
  ...extra,
});
const DETAIL = {
  placeType: CATALOG.data[0]!.placeTypes[0],
  categoryId: 'c1',
  parameters: [
    param('surface', 'Superficie', { kind: 'number', unit: 'm²', min: 1, max: 5000, required: true }),
    param('yard', 'Cour', { kind: 'boolean' }),
  ],
  offers: [
    {
      offerId: 'o1',
      cleaningType: {
        id: FLOOR,
        code: 'floor',
        name: 'Sol',
        description: null,
        icon: null,
        isPack: false,
        packItemIds: [],
      },
      extraParameters: [],
    },
  ],
  visitFee: money(5000),
};
const PRICING = {
  communeKey: null,
  communeCoefficientBps: 10000,
  offers: [
    {
      offerId: 'o1',
      cleaningTypeId: FLOOR,
      cleaningTypeCode: 'floor',
      name: 'Sol',
      tariffVersion: 1,
      status: 'priced',
      minimumApplied: false,
      price: money(21600),
      lines: [],
      onQuoteReason: null,
      tariffStatus: 'published',
    },
  ],
  complete: true,
  packDiscount: money(0),
  sessionPrice: money(21600),
  range: { low: money(19000), high: money(25000) },
  sessionsCount: null,
  programTotal: null,
  frequencyDiscount: null,
  visitFee: money(5000),
  calculatedAt: '2026-11-24T10:00:00Z',
  pricedSubtotal: money(21600),
  status: 'priced',
  programRange: null,
  teamSize: 2,
  durationMinutes: 180,
};
const SIMULATION = {
  pricing: PRICING,
  schedule: null,
  disclaimer: 'Estimation non contractuelle, confirmée après la visite des lieux.',
  covered: false,
  communeApplied: false,
  notices: ['no_commune'],
  usesDrafts: false,
};
const PLACE_BODY = {
  id: PLACE,
  name: 'Maison de Calavi',
  placeTypeId: VILLA,
  placeTypeName: 'Villa',
  communeKey: 'abomey-calavi',
  communeName: 'Abomey-Calavi',
  served: true,
  location: {
    latitude: 6.45,
    longitude: 2.35,
    landmark: 'Portail bleu',
    address: null,
    readableAddress: 'Abomey-Calavi',
    accuracyMeters: 10,
  },
  declaredValues: { surface: 120 },
  archived: false,
  createdAt: '2026-11-24T10:00:00Z',
  updatedAt: '2026-11-24T10:00:00Z',
  locationCorrectedAt: null,
  locationErasedAt: null,
};
const SCHEDULE = { kind: 'one_off', startTime: '08:00', dates: ['2027-01-05'], excludeHolidays: true };
const QUOTE_BODY = {
  id: QUOTE,
  requestId: REQUEST,
  requestNumber: 'DN-000124',
  programId: null,
  kind: 'initial',
  version: 1,
  status: 'sent',
  place: {
    placeId: PLACE,
    name: 'Maison de Calavi',
    placeTypeId: VILLA,
    placeTypeName: 'Villa',
    communeKey: 'abomey-calavi',
    communeName: 'Abomey-Calavi',
    location: null,
  },
  lines: [
    {
      offerId: 'o1',
      cleaningTypeId: FLOOR,
      name: 'Sol',
      quantity: 120,
      unit: 'm²',
      unitPrice: money(180),
      amount: money(21600),
      kind: 'offer',
    },
  ],
  adjustments: [],
  sessionPrice: money(21600),
  sessionsCount: 1,
  sessionStarts: ['2027-01-05T07:00:00Z'],
  total: money(21600),
  visitFeeDeduction: money(5000),
  teamSize: 2,
  durationMinutes: 180,
  schedule: SCHEDULE,
  paymentTerms: 'per_session',
  comparison: { confirmed: true, rows: [], addedCleaningTypes: [], removedCleaningTypes: [] },
  validUntil: '2027-12-10T23:00:00Z',
  termsVersion: 'cg-2026-11',
  pdfDocumentId: null,
  sentAt: '2026-11-25T09:00:00Z',
  respondedAt: null,
  createdAt: '2026-11-25T08:00:00Z',
  retainedRevision: 1,
};

function requestBody(status: string, extra: Record<string, unknown> = {}) {
  const fee = {
    id: 'fee-1',
    amount: money(6000),
    status: status === 'awaiting_visit_fee' ? 'awaiting_payment' : 'paid',
    payBefore: '2026-12-01T10:00:00Z',
    paidAt: status === 'awaiting_visit_fee' ? null : '2026-11-24T10:00:00Z',
    invoiceId: null,
    rank: 1,
    refundedAt: null,
  };
  return {
    id: REQUEST,
    number: 'DN-000124',
    status,
    customerKind: 'individual',
    customerId: 'u1',
    organizationId: null,
    place: QUOTE_BODY.place,
    cleaningTypes: [{ id: FLOOR, code: 'floor', name: 'Sol' }],
    declaredValues: { surface: 120 },
    freeDescription: null,
    comment: null,
    photos: [],
    schedule: SCHEDULE,
    visitSlots: [{ start: '2026-12-10T07:00:00Z', end: '2026-12-10T11:00:00Z' }],
    declaredPricing: PRICING,
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
    ...extra,
  };
}

/** Routes du Nettoyage, avec un état (lieux créés, demande envoyée, devis accepté). */
function cleaningRoutes(state: {
  places: unknown[];
  request: Record<string, unknown> | null;
  sent: unknown[];
}) {
  return ({ method, path, body, authorized }: ExtraRequest) => {
    if (!path.startsWith('/api/v1/cleaning/')) return undefined;
    const key = `${method} ${path}`;
    if (key === 'GET /api/v1/cleaning/catalog/place-types') return { status: 200, body: CATALOG };
    if (key === `GET /api/v1/cleaning/catalog/place-types/${VILLA}`) return { status: 200, body: DETAIL };
    if (key === 'GET /api/v1/cleaning/catalog/zones') {
      return { status: 200, body: { data: [{ communeKey: 'abomey-calavi', name: 'Abomey-Calavi' }] } };
    }
    if (key === 'POST /api/v1/cleaning/simulations') return { status: 200, body: SIMULATION };
    if (key === 'POST /api/v1/cleaning/schedule-previews') {
      return {
        status: 200,
        body: {
          occurrences: [{ date: '2027-01-05', start: '2027-01-05T07:00:00Z' }],
          count: 1,
          firstStart: '2027-01-05T07:00:00Z',
          lastStart: '2027-01-05T07:00:00Z',
          notices: [],
        },
      };
    }
    if (!authorized)
      return { status: 401, body: error('GATEWAY_TOKEN_MISSING', 'Vous devez être connecté.') };
    state.sent.push({ method, path, body });
    if (key === 'GET /api/v1/cleaning/places') {
      return { status: 200, body: { data: state.places, nextCursor: null, total: state.places.length } };
    }
    if (key === 'POST /api/v1/cleaning/places/locate') {
      return {
        status: 200,
        body: {
          communeKey: 'abomey-calavi',
          communeName: 'Abomey-Calavi',
          served: true,
          readableAddress: 'Abomey-Calavi',
        },
      };
    }
    if (key === 'POST /api/v1/cleaning/places') {
      const created = {
        ...PLACE_BODY,
        name: String(body?.['name']),
        location: { ...PLACE_BODY.location, landmark: String(body?.['landmark']) },
      };
      state.places.push(created);
      return { status: 200, body: created };
    }
    if (key === 'POST /api/v1/cleaning/requests') {
      state.request = requestBody('awaiting_visit_fee');
      return { status: 200, body: state.request };
    }
    if (key === `GET /api/v1/cleaning/requests/${REQUEST}`) {
      return state.request
        ? { status: 200, body: state.request }
        : { status: 404, body: error('CLEANING_REQUEST_NOT_FOUND', 'Demande introuvable.') };
    }
    if (key === 'GET /api/v1/cleaning/requests') {
      return { status: 200, body: { data: [], nextCursor: null, total: 0 } };
    }
    if (key === `POST /api/v1/cleaning/quotes/${QUOTE}/accept`) {
      state.request = requestBody('accepted', {
        currentQuote: { ...QUOTE_BODY, status: 'accepted' },
        programId: PROGRAM,
      });
      return {
        status: 200,
        body: {
          quote: { ...QUOTE_BODY, status: 'accepted', programId: PROGRAM },
          program: {
            id: PROGRAM,
            number: 'PN-000057',
            status: 'confirmed',
            requestId: REQUEST,
            quoteId: QUOTE,
            sessionsCount: 1,
            sessionsCompleted: 0,
            firstSessionAt: '2027-01-05T07:00:00Z',
            lastSessionAt: '2027-01-05T07:00:00Z',
          },
        },
      };
    }
    return { status: 404, body: error('GATEWAY_ROUTE_NOT_FOUND', "Cette adresse n'existe pas.") };
  };
}

test.use({ geolocation: { latitude: 6.45, longitude: 2.35, accuracy: 10 }, permissions: ['geolocation'] });

test('simulateur : estimation en direct, puis « Demander un devis » garde la saisie', async ({ page }) => {
  const state = { places: [], request: null, sent: [] };
  await mockGateway(page, { routes: cleaningRoutes(state) });
  await page.goto('/nettoyage');
  const simulator = page.locator('#simulateur');
  await simulator.getByText('Villa', { exact: true }).click();
  await simulator.getByText('Sol', { exact: true }).click();
  await simulator.getByLabel(/Superficie/).fill('120');
  const result = simulator.getByRole('region', { name: 'Votre estimation' });
  await expect(result).toContainText(/19\s000\sF\sCFA/);
  await expect(result).toContainText('Commune non indiquée');
  await simulator
    .getByRole('button', { name: /Demander un devis/ })
    .first()
    .click();
  await expect(page).toHaveURL(/\/nettoyage\/demande$/);
  await expect(page.getByRole('heading', { level: 2, name: 'Rythme' })).toBeVisible();
});

test('demande de devis : connexion, lieu créé avec la position du téléphone, envoi, page de la demande', async ({
  page,
}) => {
  const state = {
    places: [] as unknown[],
    request: null as Record<string, unknown> | null,
    sent: [] as unknown[],
  };
  const gateway = await mockGateway(page, { signedIn: true, routes: cleaningRoutes(state) });
  await page.goto('/nettoyage/demande');
  const next = page.getByRole('button', { name: /Continuer/ });

  await page.getByText('Villa', { exact: true }).click();
  await page.getByText('Sol', { exact: true }).click();
  await next.click();
  await page.getByLabel(/Superficie/).fill('120');
  await next.click();
  await page.getByText('Une ou quelques séances').click();
  await page.getByLabel('Jour à ajouter').fill('2027-01-05');
  await page.getByRole('button', { name: 'Ajouter ce jour' }).click();
  await expect(page.getByText(/1 séance prévue/)).toBeVisible();
  await next.click();

  // Lieu : aucun lieu de ce type, le formulaire s'ouvre.
  await expect(page.getByRole('heading', { name: 'Nouveau lieu' })).toBeVisible();
  await page.getByLabel('Nom du lieu').fill('Maison de Calavi');
  await page.getByRole('button', { name: 'Utiliser ma position' }).click();
  await page.getByLabel('Point de repère').fill('Portail bleu');
  await page.getByRole('button', { name: 'Enregistrer le lieu' }).click();
  await expect(page.getByText('Lieu enregistré et choisi pour cette demande.')).toBeVisible();
  await next.click();

  await page.getByLabel('Jour').fill('2026-12-10');
  await next.click();
  await next.click();
  await expect(page.getByRole('heading', { level: 2, name: 'Récapitulatif' })).toBeVisible();
  await page.getByRole('button', { name: 'Envoyer ma demande' }).click();

  await expect(
    page.getByRole('heading', { name: /Demande envoyée : frais de visite à régler/ }),
  ).toBeVisible();
  await expect(page.getByRole('button', { name: 'Payer par Mobile Money' })).toBeVisible();
  const submit = gateway.calls.find(
    (call) => call.method === 'POST' && call.path === '/api/v1/cleaning/requests',
  );
  expect(submit?.body).toMatchObject({
    placeId: PLACE,
    cleaningTypeIds: [FLOOR],
    values: { surface: 120 },
    schedule: { kind: 'one_off', dates: ['2027-01-05'] },
    visitSlots: [{ start: '2026-12-10T07:00:00.000Z', end: '2026-12-10T11:00:00.000Z' }],
  });
  const created = gateway.calls.find(
    (call) => call.method === 'POST' && call.path === '/api/v1/cleaning/places',
  );
  expect(created?.body).toMatchObject({
    name: 'Maison de Calavi',
    placeTypeId: VILLA,
    latitude: 6.45,
    longitude: 2.35,
    landmark: 'Portail bleu',
  });
  expect(gateway.forbiddenHeaders).toEqual([]);

  await page.getByRole('link', { name: 'Voir ma demande' }).click();
  await expect(page).toHaveURL(new RegExp(`/mon-espace/nettoyage/demandes/${REQUEST}$`));
  await expect(page.getByRole('heading', { level: 1, name: 'Maison de Calavi' })).toBeVisible();
  await expect(page.getByRole('region', { name: 'Frais de visite à régler' })).toBeVisible();
});

test('page de la demande : devis accepté avec les conditions générales, lien vers le programme', async ({
  page,
}) => {
  const state = {
    places: [],
    request: requestBody('quote_sent', { currentQuote: QUOTE_BODY }) as Record<string, unknown> | null,
    sent: [] as unknown[],
  };
  await mockGateway(page, { signedIn: true, routes: cleaningRoutes(state) });
  await page.goto(`/mon-espace/nettoyage/demandes/${REQUEST}`);
  const quote = page.getByRole('region', { name: 'Votre devis', exact: true });
  await expect(quote).toContainText('Informations confirmées');
  await quote.getByRole('button', { name: 'Accepter le devis' }).click();
  await expect(quote.getByRole('link', { name: 'conditions générales du Nettoyage' })).toHaveAttribute(
    'href',
    '/conditions/nettoyage/cg-2026-11',
  );
  await quote.getByRole('checkbox').check();
  await quote.getByRole('button', { name: 'Confirmer l’acceptation' }).click();
  await expect(quote.getByRole('link', { name: 'Voir mon programme' })).toHaveAttribute(
    'href',
    `/mon-espace/nettoyage/programmes/${PROGRAM}`,
  );
});
