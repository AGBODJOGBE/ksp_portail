import { expect, test } from '@playwright/test';
import { type ExtraRequest, mockGateway } from './support/gateway';

/**
 * Nettoyage v2, après l'acceptation du devis, contre une gateway simulée : programme (calendrier du mois,
 * séances), séance (payer, reporter), réclamation (dépôt depuis la séance, puis réponse).
 */

const PROGRAM_ID = '0192f1c4-de70-7000-8000-000000000c21';
const SESSION_ID = '0192f1c4-de70-7000-8000-000000000d01';
const NEXT_ID = '0192f1c4-de70-7000-8000-000000000d02';
const CLAIM_ID = '0192f1c4-de70-7000-8000-000000000f01';
const money = (amount: number) => ({ amount, currency: 'XOF' });
const error = (code: string, message: string) => ({
  error: { code, message, details: {}, correlationId: '0192f1c4-7a2b-7c3d-8e4f-5a6b7c8d9e12' },
});

/** Dates relatives au jour du test : une séance réalisée hier, la suivante dans dix jours. */
const DAY = 86_400_000;
const at = (days: number, hour: number) => {
  const date = new Date(Date.now() + days * DAY);
  date.setUTCHours(hour, 0, 0, 0);
  return date.toISOString();
};

const PROGRAM = {
  id: PROGRAM_ID,
  number: 'PN-000057',
  status: 'in_progress',
  requestId: '0192f1c4-de70-7000-8000-000000000c01',
  quoteId: '0192f1c4-de70-7000-8000-000000000c11',
  customerKind: 'individual',
  customerId: 'u-1',
  organizationId: null,
  payerKind: 'individual',
  place: {
    placeId: 'pl-1',
    name: 'Maison de Calavi',
    placeTypeId: 'pt-1',
    placeTypeName: 'Villa',
    communeKey: 'abomey-calavi',
    communeName: 'Abomey-Calavi',
    location: null,
  },
  cleaningTypes: [{ id: 't-1', code: 'floor', name: 'Sol' }],
  schedule: {
    kind: 'weekly',
    startTime: '08:00',
    weekdays: ['mon'],
    everyWeeks: 1,
    startDate: '2026-11-02',
    durationWeeks: 12,
  },
  sessionsCount: 12,
  sessionsCompleted: 3,
  sessionPrice: money(23400),
  total: money(280800),
  firstSessionAt: at(-21, 7),
  lastSessionAt: at(60, 7),
  suspensionCauses: [],
  renewal: null,
  createdAt: '2026-10-20T09:00:00Z',
  pendingCancellation: null,
  customerName: null,
  organizationName: null,
};

function session(overrides: Record<string, unknown> = {}) {
  return {
    id: SESSION_ID,
    programId: PROGRAM_ID,
    programNumber: 'PN-000057',
    rank: 4,
    sessionsCount: 12,
    status: 'completed',
    scheduledStart: at(-1, 7),
    scheduledEnd: at(-1, 11),
    paymentStatus: 'due',
    price: money(23400),
    amountDue: money(23400),
    visitFeeDeduction: null,
    dueBy: at(0, 23),
    agents: [
      {
        agentId: 'a-1',
        firstName: 'Afi',
        lastName: 'Houngbo',
        photoUrl: null,
        isLead: true,
        confirmation: 'confirmed',
      },
    ],
    arrival: null,
    startedAt: at(-1, 7),
    completedAt: at(-1, 11),
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

const NEXT = () =>
  session({
    id: NEXT_ID,
    rank: 5,
    status: 'assigned',
    scheduledStart: at(10, 7),
    scheduledEnd: at(10, 11),
    paymentStatus: 'not_due',
    amountDue: null,
    dueBy: null,
    startedAt: null,
    completedAt: null,
  });

function claim(messages: Array<Record<string, unknown>>) {
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
    messages,
    decision: null,
    openedAt: new Date().toISOString(),
    firstResponseAt: null,
    closedAt: null,
    customerName: null,
    organizationName: null,
  };
}

function routes(state: { current: Record<string, unknown>; next: Record<string, unknown>; claim: unknown }) {
  return ({ method, path, body, authorized }: ExtraRequest) => {
    if (!path.startsWith('/api/v1/cleaning/')) return undefined;
    if (!authorized)
      return { status: 401, body: error('GATEWAY_TOKEN_MISSING', 'Vous devez être connecté.') };
    const key = `${method} ${path}`;
    const list = (data: unknown[]) => ({ status: 200, body: { data, nextCursor: null, total: data.length } });
    if (key === `GET /api/v1/cleaning/programs/${PROGRAM_ID}`) return { status: 200, body: PROGRAM };
    if (key === `GET /api/v1/cleaning/programs/${PROGRAM_ID}/sessions`)
      return list([state.current, state.next]);
    if (key === 'GET /api/v1/cleaning/programs') return list([PROGRAM]);
    if (key === 'GET /api/v1/cleaning/requests' || key === 'GET /api/v1/cleaning/claims') return list([]);
    if (key === `GET /api/v1/cleaning/sessions/${SESSION_ID}`) return { status: 200, body: state.current };
    if (key === `GET /api/v1/cleaning/sessions/${NEXT_ID}`) return { status: 200, body: state.next };
    if (key === `POST /api/v1/cleaning/sessions/${SESSION_ID}/pay`) {
      state.current = { ...state.current, paymentStatus: 'paid', invoiceId: 'inv-1' };
      return {
        status: 200,
        body: {
          status: 'paid',
          amount: money(23400),
          walletTransactionId: 'w-1',
          paymentId: null,
          checkoutUrl: null,
          invoiceId: 'inv-1',
        },
      };
    }
    if (key === `POST /api/v1/cleaning/sessions/${NEXT_ID}/reschedule`) {
      const newStart = String(body?.['newStart']);
      state.next = {
        ...state.next,
        scheduledStart: newStart,
        scheduledEnd: new Date(new Date(newStart).getTime() + 4 * 3_600_000).toISOString(),
        reschedules: [
          {
            previousStart: state.next['scheduledStart'],
            newStart,
            by: 'customer',
            at: new Date().toISOString(),
            reason: null,
            actorId: null,
          },
        ],
      };
      return { status: 200, body: state.next };
    }
    if (key === `POST /api/v1/cleaning/sessions/${SESSION_ID}/claims`) {
      state.claim = claim([]);
      state.current = { ...state.current, claimIds: [CLAIM_ID] };
      return { status: 200, body: state.claim };
    }
    if (key === `GET /api/v1/cleaning/claims/${CLAIM_ID}`) return { status: 200, body: state.claim };
    if (key === `POST /api/v1/cleaning/claims/${CLAIM_ID}/messages`) {
      state.claim = claim([
        {
          id: 'm-1',
          author: 'customer',
          authorId: 'u-1',
          text: String(body?.['text']),
          at: new Date().toISOString(),
        },
      ]);
      return { status: 200, body: state.claim };
    }
    return { status: 404, body: error('GATEWAY_ROUTE_NOT_FOUND', "Cette adresse n'existe pas.") };
  };
}

const newState = () => ({ current: session(), next: NEXT(), claim: null as unknown });

test('programme : avancement, calendrier du mois, séances ; la séance à payer est réglée par le portefeuille', async ({
  page,
}) => {
  const gateway = await mockGateway(page, { signedIn: true, routes: routes(newState()) });
  await page.goto(`/mon-espace/nettoyage/programmes/${PROGRAM_ID}`);
  await expect(page.getByRole('heading', { level: 1, name: 'Maison de Calavi' })).toBeVisible();
  await expect(page.getByText('3 / 12 séances réalisées')).toBeVisible();
  await expect(page.getByRole('region', { name: 'Calendrier des séances' })).toBeVisible();
  await page.getByRole('link', { name: /^Séance 4\/12/ }).click();

  await expect(page).toHaveURL(new RegExp(`/programmes/${PROGRAM_ID}/seances/${SESSION_ID}$`));
  const pay = page.getByRole('region', { name: 'Séance à payer' });
  await expect(pay).toContainText(/23\s400\sF\sCFA/);
  await pay.getByRole('button', { name: /Payer avec mon portefeuille/ }).click();
  await expect(page.getByText('Séance payée.')).toBeVisible();
  await expect(page.getByRole('link', { name: 'Voir la facture' })).toHaveAttribute(
    'href',
    '/mon-espace/factures/inv-1',
  );
  const paid = gateway.calls.find((call) => call.path === `/api/v1/cleaning/sessions/${SESSION_ID}/pay`);
  expect(paid?.body).toEqual({ method: 'wallet' });
  expect(gateway.forbiddenHeaders).toEqual([]);
});

test('séance à venir : report à une nouvelle date et heure du Bénin', async ({ page }) => {
  const gateway = await mockGateway(page, { signedIn: true, routes: routes(newState()) });
  await page.goto(`/mon-espace/nettoyage/programmes/${PROGRAM_ID}/seances/${NEXT_ID}`);
  await page.getByRole('button', { name: 'Reporter la séance' }).click();
  const target = at(12, 9).slice(0, 10);
  await page.getByLabel('Nouvelle date').fill(target);
  await page.getByLabel('Heure de début').fill('10:30');
  await page.getByRole('button', { name: 'Confirmer le report' }).click();
  await expect(page.getByText('Séance reportée.')).toBeVisible();
  const sent = gateway.calls.find((call) => call.path === `/api/v1/cleaning/sessions/${NEXT_ID}/reschedule`);
  expect(sent?.body).toEqual({ newStart: `${target}T09:30:00.000Z` });
  await expect(page.getByRole('region', { name: 'Reports' })).toContainText('à votre demande');
});

test('réclamation : déposée depuis la séance, puis suivie et complétée', async ({ page }) => {
  const state = newState();
  state.current = session({ paymentStatus: 'paid' });
  await mockGateway(page, { signedIn: true, routes: routes(state) });
  await page.goto(`/mon-espace/nettoyage/seances/${SESSION_ID}`);
  // Retour de paiement : redirection vers l'adresse imbriquée.
  await expect(page).toHaveURL(new RegExp(`/programmes/${PROGRAM_ID}/seances/${SESSION_ID}$`));
  const report = page.getByRole('region', { name: 'Signaler un problème' });
  await report.getByRole('button', { name: 'Signaler un problème' }).click();
  await report.getByText('Travail incomplet').click();
  await report.getByLabel(/Ce qui s’est passé/).fill('Les vitres de la cuisine n’ont pas été faites.');
  await report.getByRole('button', { name: 'Envoyer ma réclamation' }).click();
  await report.getByRole('link', { name: 'Suivre ma réclamation' }).click();

  await expect(page).toHaveURL(new RegExp(`/mon-espace/nettoyage/reclamations/${CLAIM_ID}$`));
  await expect(page.getByRole('heading', { level: 1, name: 'Travail incomplet' })).toBeVisible();
  await page.getByLabel('Votre message').fill('Je reste disponible jeudi.');
  await page.getByRole('button', { name: 'Envoyer' }).click();
  await expect(page.getByRole('region', { name: 'Échanges' })).toContainText('Je reste disponible jeudi.');
});
