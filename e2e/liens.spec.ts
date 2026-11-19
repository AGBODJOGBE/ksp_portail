import { expect, test } from '@playwright/test';
import { mockGateway } from './support/gateway';

/*
 * Pages publiques ouvertes par un lien personnel, sans compte : paiement (ADR-040) et signature (ADR-044),
 * contre une gateway simulée. Aucune session : la page ne doit jamais renvoyer vers la connexion.
 */

const PAY_TOKEN = 'Ab3_dE5-gH7iJ9kL1mN3pQ5rS7tU9vW1xY3zA5bC7dE';
const SIGN_TOKEN = 'k3Jx9_Qm-2LpV7rT0aZ8cW4yN6bH1sDfGe5uIo3Rt0A';
const CHECKOUT = 'https://checkout.prestataire.test/page-de-paiement';
const PDF = 'https://files.ksp.test/ksp-files/generated_document/pac.pdf?X-Amz-Expires=300';
const error = (code: string, message: string) => ({
  error: { code, message, details: {}, correlationId: 'c' },
});

const link = (status: string, extra: Record<string, unknown> = {}) => ({
  status,
  beneficiaryName: 'Pharmacie du Port',
  description: 'Échéance 2 sur 6',
  reference: 'REC-2026-000137',
  amount: { amount: 45000, currency: 'XOF' },
  dueDate: '2026-11-30',
  expiresAt: '2099-12-10T10:00:00Z',
  paidAt: null,
  payment: null,
  ...extra,
});

test('lien de paiement : résumé, paiement chez le prestataire, retour et paiement confirmé', async ({
  page,
}) => {
  let paid = false;
  const pays: Array<Record<string, string>> = [];
  await mockGateway(page, {
    routes: ({ method, path, headers }) => {
      if (path === `/api/v1/payment/links/${PAY_TOKEN}` && method === 'GET')
        return {
          status: 200,
          body: paid
            ? link('paid', {
                paidAt: '2026-11-18T09:12:00Z',
                payment: {
                  id: 'p-1',
                  status: 'succeeded',
                  checkoutUrl: null,
                  expiresAt: '2026-11-18T09:40:00Z',
                  failureReason: null,
                },
              })
            : link('active'),
        };
      if (path === `/api/v1/payment/links/${PAY_TOKEN}/pay` && method === 'POST') {
        pays.push(headers);
        return {
          status: 200,
          body: {
            id: 'p-1',
            status: 'pending',
            checkoutUrl: CHECKOUT,
            expiresAt: '2099-11-18T09:40:00Z',
            failureReason: null,
          },
        };
      }
      return undefined;
    },
  });
  // Page du prestataire : le payeur valide, puis revient sur la page du lien.
  let referer: string | undefined = 'non visité';
  await page.route(`${CHECKOUT}**`, (route) => {
    referer = route.request().headers().referer;
    paid = true;
    return route.fulfill({ contentType: 'text/html', body: '<h1>Prestataire de paiement</h1>' });
  });

  const response = await page.goto(`/payer/${PAY_TOKEN}`);
  // Jamais en cache, jamais indexée, le jeton ne part vers aucun autre site.
  expect(response?.headers()['cache-control']).toContain('no-store');
  expect(response?.headers()['referrer-policy']).toBe('no-referrer');
  expect(response?.headers()['x-robots-tag']).toContain('noindex');
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', /noindex/);

  await expect(page.getByRole('heading', { level: 1, name: 'Pharmacie du Port' })).toBeVisible();
  await expect(page.getByText('REC-2026-000137', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: /^Payer 45/ }).click();
  await expect(page.getByRole('heading', { name: 'Prestataire de paiement' })).toBeVisible();
  expect(referer).toBeUndefined();
  expect(pays).toHaveLength(1);
  expect(pays[0]?.['idempotency-key']).toMatch(/^[A-Za-z0-9_-]{8,100}$/);
  expect(pays[0]?.authorization).toBeUndefined();

  await page.goto(`/payer/${PAY_TOKEN}?id=123&status=approved`);
  await expect(page.getByText('Paiement reçu, merci')).toBeVisible();
  await expect(page.getByRole('button', { name: /^Payer/ })).toHaveCount(0);
  expect(page.url()).not.toContain('/connexion');
  // Aucune donnée du lien gardée dans le navigateur.
  expect(await page.evaluate(() => sessionStorage.length + localStorage.length)).toBe(0);
});

test('lien de paiement inconnu : introuvable, sans connexion', async ({ page }) => {
  await mockGateway(page, {
    routes: ({ path }) =>
      path.startsWith('/api/v1/payment/links/')
        ? { status: 404, body: error('PAYMENT_LINK_NOT_FOUND', 'Introuvable.') }
        : undefined,
  });
  await page.goto(`/payer/${PAY_TOKEN}`);
  await expect(page.getByRole('heading', { level: 1, name: 'Lien de paiement introuvable' })).toBeVisible();
  expect(page.url()).not.toContain('/connexion');
});

const signing = (status: string, extra: Record<string, unknown> = {}) => ({
  documentTitle: 'Protocole d’accord et échéancier de paiement',
  documentNumber: 'PAC-2026-000007',
  status,
  signer: { displayName: 'Koffi Mensah', phoneMasked: '+229********45' },
  expiresAt: '2099-11-16T10:00:00Z',
  signedAt: null,
  codeExpiresAt: null,
  download:
    status === 'pending' || status === 'signed'
      ? { url: PDF, expiresAt: '2099-11-09T10:05:00Z', version: status === 'signed' ? 'signed' : 'original' }
      : null,
  ...extra,
});

test('lien de signature : lecture du PDF, code, accord, signature', async ({ page, context }) => {
  let state = signing('pending');
  const signs: unknown[] = [];
  await mockGateway(page, {
    routes: ({ method, path, body }) => {
      const base = `/api/v1/document/sign/${SIGN_TOKEN}`;
      if (path === base && method === 'GET') return { status: 200, body: state };
      if (path === `${base}/otp` && method === 'POST')
        return {
          status: 200,
          body: { channel: 'whatsapp', expiresAt: '2099-11-09T10:10:00Z', resendAfterSeconds: 60 },
        };
      if (path === `${base}/sign` && method === 'POST') {
        signs.push(body);
        if (body?.code !== '482913')
          return {
            status: 400,
            body: {
              error: {
                code: 'DOCUMENT_CODE_INVALID',
                message: 'Code incorrect.',
                details: { attemptsLeft: 4 },
              },
            },
          };
        state = signing('signed', { signedAt: '2026-11-09T10:07:00Z' });
        return { status: 200, body: state };
      }
      return undefined;
    },
  });
  await context.route(`${PDF.split('?')[0]}**`, (route) =>
    route.fulfill({ contentType: 'text/plain', body: 'PDF du document' }),
  );

  await page.goto(`/signer/${SIGN_TOKEN}`);
  await expect(
    page.getByRole('heading', { level: 1, name: 'Protocole d’accord et échéancier de paiement' }),
  ).toBeVisible();
  await expect(page.getByText('+229********45', { exact: true })).toBeVisible();

  const [tab] = await Promise.all([
    context.waitForEvent('page'),
    page.getByRole('button', { name: 'Lire le document' }).click(),
  ]);
  await tab.waitForURL(/files\.ksp\.test/);
  await tab.close();

  await page.getByRole('button', { name: 'Recevoir mon code' }).click();
  await page.getByLabel('Code reçu').fill('111111');
  await page.getByRole('checkbox', { name: /J’ai lu le document/ }).check();
  await page.getByRole('button', { name: 'Signer le document' }).click();
  await expect(page.getByText('Ce code est incorrect. Il vous reste 4 essais.')).toBeVisible();
  await page.getByLabel('Code reçu').fill('482913');
  await page.getByRole('button', { name: 'Signer le document' }).click();
  await expect(page.getByText('Document signé', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Lire le document signé' })).toBeVisible();
  expect(signs.at(-1)).toEqual({ code: '482913', consent: true });
  expect(page.url()).not.toContain('/connexion');
});

test('lien de signature expiré : message, rien à signer', async ({ page }) => {
  await mockGateway(page, {
    routes: ({ path }) =>
      path === `/api/v1/document/sign/${SIGN_TOKEN}` ? { status: 200, body: signing('expired') } : undefined,
  });
  await page.goto(`/signer/${SIGN_TOKEN}`);
  await expect(page.getByText('Cette demande de signature a expiré')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Recevoir mon code' })).toHaveCount(0);
});
