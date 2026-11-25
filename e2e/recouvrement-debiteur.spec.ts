import { expect, type Page, test } from '@playwright/test';
import { type ExtraRequest, mockGateway } from './support/gateway';

/*
 * Espace du débiteur sans compte (ADR-061, `/recouvrement/<jeton>`) contre une gateway simulée : accès par
 * le lien, code, situation servie ou pas encore servie, paiement dans un nouvel onglet, contestation avec
 * une pièce. Aucun compte : la page ne renvoie jamais vers la connexion et n'envoie aucun jeton de compte.
 */

const GATEWAY = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000';
const STORAGE = `${GATEWAY}/stockage/piece-debiteur`;
const TOKEN = 'Ab3_dE5-gH7iJ9kL1mN3pQ5rS7tU9vW1xY3zA5bC7dE';
const SESSION = 'k3Jd9fQ2mZ7xB1vR8tY4wP6sN0cH5gL2aE9uI3oK7qT';
const PAYMENT_PAGE = 'https://paiement.ksp.test/payer/Zz9_yY8-xX7wW6vV5uU4tT3sS2rR1qQ0pP9oO8nN7mM';
const UPLOAD_ID = '0192f1c4-7a2b-7c3d-8e4f-5a6b7c8d7505';
const D = '/api/v1/recovery/debtor';
const xof = (amount: number) => ({ amount, currency: 'XOF' });
const error = (code: string, message: string) => ({
  error: { code, message, details: {}, correlationId: 'c' },
});

const debtorCase = (extra: Record<string, unknown> = {}) => ({
  caseNumber: 'RC-000123',
  creditorName: 'Pharmacie du Port',
  nature: 'unpaid_invoice',
  references: ['FA-2026-014'],
  amounts: {
    principal: xof(150000),
    interests: xof(5000),
    costs: xof(0),
    paid: xof(20000),
    waived: xof(0),
    due: xof(135000),
    overpaid: xof(0),
  },
  payments: [
    { amount: xof(20000), paidAt: '2026-11-10T09:00:00Z', channel: 'online', receiptDocumentId: null },
  ],
  documents: [],
  plan: null,
  settlementOffer: null,
  planScale: {
    acceptsPaymentPlan: true,
    maxDurationMonths: 6,
    minFirstPaymentBps: 1000,
    firstPaymentWithinDays: 7,
    minInstallment: xof(10000),
    maxDiscountBps: 500,
  },
  status: 'active',
  disputes: [],
  pendingPaymentUrl: null,
  settlementCertificateDocumentId: null,
  ...extra,
});

interface Seen {
  sessionHeaders: Array<string | undefined>;
  authorization: string[];
  payments: Array<{ body: unknown; key: string | undefined }>;
  disputes: unknown[];
}

/** Routes du débiteur ; `caseReply` : réponse de la situation. */
async function debtorGateway(page: Page, caseReply: { status: number; body: unknown }) {
  const seen: Seen = { sessionHeaders: [], authorization: [], payments: [], disputes: [] };
  const gateway = await mockGateway(page, {
    routes: ({ method, path, body, headers }: ExtraRequest) => {
      if (!path.startsWith(D)) return undefined;
      if (headers.authorization) seen.authorization.push(path);
      const key = `${method} ${path}`;
      if (key === `GET ${D}/access/${TOKEN}`)
        return {
          status: 200,
          body: {
            creditorName: 'Pharmacie du Port',
            phoneMasked: '+229 •• •• 45',
            linkExpiresAt: '2099-12-20T10:00:00Z',
          },
        };
      if (key === `POST ${D}/access/${TOKEN}/code`)
        return {
          status: 200,
          body: { channel: 'whatsapp', codeExpiresAt: '2099-11-25T09:10:00Z', retryAfterSeconds: 60 },
        };
      if (key === `POST ${D}/access/${TOKEN}/verify`)
        return body?.code === '482913'
          ? { status: 200, body: { sessionToken: SESSION, sessionExpiresAt: '2099-11-25T09:30:00Z' } }
          : {
              status: 400,
              body: {
                error: {
                  code: 'RECOVERY_DEBTOR_CODE_INVALID',
                  message: 'Le code est incorrect.',
                  details: { attemptsLeft: 4 },
                  correlationId: 'c',
                },
              },
            };
      // Routes de la session : l'en-tête est exigé, comme recovery.
      seen.sessionHeaders.push(headers['x-debtor-session']);
      if (headers['x-debtor-session'] !== SESSION)
        return { status: 401, body: error('RECOVERY_DEBTOR_SESSION_INVALID', 'Votre session a expiré.') };
      switch (key) {
        case `GET ${D}/case`:
          return caseReply;
        case `POST ${D}/payments`:
          seen.payments.push({ body, key: headers['idempotency-key'] });
          return {
            status: 200,
            body: { paymentUrl: PAYMENT_PAGE, amount: xof(135000), expiresAt: '2099-11-28T09:00:00Z' },
          };
        case `POST ${D}/uploads`:
          return {
            status: 200,
            body: {
              fileId: UPLOAD_ID,
              uploadUrl: STORAGE,
              uploadExpiresAt: '2099-11-25T09:20:00Z',
              uploadHeaders: { 'Content-Type': 'application/pdf' },
            },
          };
        case `POST ${D}/uploads/${UPLOAD_ID}/complete`:
          return { status: 200, body: { fileId: UPLOAD_ID, status: 'available' } };
        case `POST ${D}/disputes`:
          seen.disputes.push(body);
          return {
            status: 200,
            body: {
              id: '0192f1c4-7a2b-7c3d-8e4f-5a6b7c8d7506',
              reason: 'already_paid',
              text: String(body?.text ?? ''),
              fileIds: [UPLOAD_ID],
              status: 'open',
              openedAt: '2026-11-25T09:10:00Z',
              creditorAnswerDueAt: '2026-12-05T09:10:00Z',
              creditorAnswer: null,
              creditorFileIds: [],
              resolutionNote: null,
              resolvedAt: null,
            },
          };
        default:
          return { status: 404, body: error('GATEWAY_ROUTE_NOT_FOUND', "Cette adresse n'existe pas.") };
      }
    },
  });
  return { gateway, seen };
}

async function openWithCode(page: Page) {
  const response = await page.goto(`/recouvrement/${TOKEN}`);
  await expect(page.getByText('Pharmacie du Port').first()).toBeVisible();
  await page.getByRole('button', { name: 'Recevoir mon code' }).click();
  // Numéro masqué affiché avec des espaces insécables (il ne se coupe pas en fin de ligne).
  await expect(page.getByText(/Code envoyé par WhatsApp au \+229\s••\s••\s45/)).toBeVisible();
  await page.getByLabel(/Code à 6 chiffres/).fill('111111');
  await page.getByRole('button', { name: 'Ouvrir mon espace' }).click();
  await expect(page.getByText('Ce code est incorrect. Il vous reste 4 essais.')).toBeVisible();
  await page.getByLabel(/Code à 6 chiffres/).fill('482913');
  await page.getByRole('button', { name: 'Ouvrir mon espace' }).click();
  return response;
}

test('débiteur : lien, code, situation, paiement dans un nouvel onglet, sans compte ni stockage', async ({
  page,
}) => {
  const { gateway, seen } = await debtorGateway(page, { status: 200, body: debtorCase() });
  // Page de paiement (lien de paiement, ADR-040) : le jeton du débiteur ne doit pas y partir.
  let referer: string | undefined = 'non visitée';
  await page.context().route(`${PAYMENT_PAGE}**`, (route) => {
    referer = route.request().headers().referer;
    return route.fulfill({ contentType: 'text/html; charset=utf-8', body: '<h1>Paiement sécurisé</h1>' });
  });

  const response = await openWithCode(page);
  // Jamais en cache, jamais indexée, le jeton ne part vers aucun autre site.
  expect(response?.headers()['cache-control']).toContain('no-store');
  expect(response?.headers()['referrer-policy']).toBe('no-referrer');
  expect(response?.headers()['x-robots-tag']).toContain('noindex');
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', /noindex/);

  await expect(page.getByRole('heading', { level: 1, name: 'Votre situation' })).toBeVisible();
  await expect(page.getByText(/135\s000/).first()).toBeVisible();
  await expect(page.getByText('Session ouverte jusqu’à 10:30').first()).toBeVisible();

  await page.getByRole('button', { name: 'Payer', exact: true }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Payer' })).toBeVisible();
  const popup = page.waitForEvent('popup');
  await page.getByRole('button', { name: /^Payer 135/ }).click();
  const tab = await popup;
  await expect(tab.getByRole('heading', { name: 'Paiement sécurisé' })).toBeVisible();
  expect(tab.url()).toBe(PAYMENT_PAGE);
  expect(referer).toBeUndefined();
  await expect(page.getByText('Page de paiement ouverte')).toBeVisible();
  // La session reste ouverte dans le premier onglet.
  await page.getByRole('button', { name: 'Actualiser ma situation' }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Votre situation' })).toBeVisible();

  expect(seen.payments).toHaveLength(1);
  expect(seen.payments[0]?.body).toEqual({ amount: xof(135000) });
  expect(seen.payments[0]?.key).toMatch(/^[A-Za-z0-9_-]{8,100}$/);
  expect(seen.sessionHeaders.every((value) => value === SESSION)).toBe(true);
  expect(seen.authorization).toEqual([]);
  expect(gateway.forbiddenHeaders).toEqual([]);
  expect(page.url()).not.toContain('/connexion');
  expect(await page.evaluate(() => sessionStorage.length + localStorage.length)).toBe(0);

  // Rechargement : la session n'a été gardée nulle part, un nouveau code est demandé.
  await page.reload();
  await expect(page.getByRole('button', { name: 'Recevoir mon code' })).toBeVisible();
});

test('débiteur : situation pas encore servie (501), « Bientôt disponible » sans détail technique', async ({
  page,
}) => {
  await debtorGateway(page, {
    status: 501,
    body: error('RECOVERY_NOT_IMPLEMENTED', 'Pas encore disponible.'),
  });
  await openWithCode(page);
  await expect(page.getByText('Bientôt disponible')).toBeVisible();
  // Build de production : jamais le bloc « Ce que le back doit fournir ».
  await expect(page.getByText('Ce que le back doit fournir')).toHaveCount(0);
  await page.getByRole('button', { name: 'Terminer', exact: true }).click();
  await expect(page.getByText('Session fermée')).toBeVisible();
});

test('débiteur : contestation avec une pièce envoyée au stockage', async ({ page }) => {
  const { seen } = await debtorGateway(page, { status: 200, body: debtorCase() });
  let put: Record<string, string> | null = null;
  // Stockage (PUT présigné) : sur l'origine de la gateway, que la CSP autorise.
  await page.route(STORAGE, (route) => {
    if (route.request().method() === 'PUT') put = route.request().headers();
    return route.fulfill({
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': route.request().headers().origin ?? '*',
        'Access-Control-Allow-Methods': 'PUT',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    });
  });

  await openWithCode(page);
  await page.getByRole('button', { name: /Contester cette dette/ }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Contester cette dette' })).toBeVisible();
  await page.getByText('J’ai déjà payé').click();
  await page.getByLabel(/Expliquez votre situation/).fill('Facture déjà réglée par virement le 12 octobre.');
  await page.getByLabel('Ajouter des pièces').setInputFiles({
    name: 'recu-virement.pdf',
    mimeType: 'application/pdf',
    buffer: Buffer.from('%PDF-1.4'),
  });
  await expect(page.getByText('recu-virement.pdf')).toBeVisible();
  await page.getByRole('button', { name: 'Envoyer ma contestation' }).click();
  await expect(page.getByText('Contestation enregistrée')).toBeVisible();

  expect(put).not.toBeNull();
  expect(put!['x-debtor-session']).toBeUndefined();
  expect(put!.authorization).toBeUndefined();
  expect(seen.disputes).toEqual([
    { reason: 'already_paid', text: 'Facture déjà réglée par virement le 12 octobre.', fileIds: [UPLOAD_ID] },
  ]);
});

test('débiteur : lien invalide (404), message neutre et vitrine intacte', async ({ page }) => {
  await mockGateway(page, {
    routes: ({ path }) =>
      path.startsWith(`${D}/access/`)
        ? { status: 404, body: error('RECOVERY_DEBTOR_LINK_INVALID', 'Ce lien est introuvable.') }
        : undefined,
  });
  await page.goto(`/recouvrement/${TOKEN}`);
  await expect(page.getByRole('heading', { level: 1, name: 'Ce lien n’est plus valable' })).toBeVisible();
  expect(page.url()).not.toContain('/connexion');

  // La vitrine `/recouvrement` reste la page statique du métier, indexable.
  const vitrine = await page.goto('/recouvrement');
  expect(vitrine?.headers()['x-robots-tag']).toBeUndefined();
  await expect(page.getByRole('heading', { level: 1 })).not.toHaveText('Votre dossier de recouvrement');
});
