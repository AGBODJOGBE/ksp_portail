import { expect, test } from '@playwright/test';
import { mockGateway } from './support/gateway';

/*
 * Lot 1b, contre une gateway simulée : retrait du portefeuille vers Mobile Money (route servie), facture v2
 * et paiement Mobile Money d'une facture, membres et invitations d'une entreprise (routes du contrat pas
 * encore servies : « Bientôt disponible », puis servies). Le build est celui de la production : le bloc
 * « Ce que le back doit fournir » n'y apparaît jamais.
 */

const xof = (amount: number) => ({ amount, currency: 'XOF' });
const USER_ID = '0192f1c4-7a2b-7c3d-8e4f-5a6b7c8d9e11';
const ORG_ID = '0192f1c4-7a2b-7c3d-8e4f-5a6b7c8d0a01';
const INVOICE_ID = '0192f1c4-7a2b-7c3d-8e4f-5a6b7c8d6101';
const CHECKOUT = 'https://checkout.prestataire.test/facture-101';
const error = (code: string, message: string, details: Record<string, unknown> = {}) => ({
  error: { code, message, details, correlationId: 'c' },
});
const NOT_SERVED = { status: 404, body: error('GATEWAY_ROUTE_NOT_FOUND', "Cette adresse n'existe pas.") };

const withdrawal = {
  id: '0192f1c4-7a2b-7c3d-8e4f-5a6b7c8d9001',
  holder: { type: 'user', id: USER_ID },
  amount: xof(12000),
  status: 'requested',
  beneficiaryOperator: 'moov',
  beneficiaryPhoneMasked: '+229 •• •• 45',
  requestedBy: USER_ID,
  requestedAt: '2026-11-25T09:00:00Z',
  processedBy: null,
  processedAt: null,
  approvedBy: null,
  approvedAt: null,
  rejectedAt: null,
  rejectionReason: null,
  paymentPayoutId: null,
  completedAt: null,
  failedAt: null,
};

test('retrait vers Mobile Money : saisie, récapitulatif, demande enregistrée et suivie', async ({ page }) => {
  let withdrawn = false;
  const keys: string[] = [];
  const gateway = await mockGateway(page, {
    signedIn: true,
    routes: ({ method, path, body, headers }) => {
      if (path === '/api/v1/wallet/me' && method === 'GET')
        return {
          status: 200,
          body: {
            prepaid: {
              holder: { type: 'user', id: USER_ID },
              balance: xof(withdrawn ? 18000 : 30000),
              lastEntryAt: '2026-11-25T09:00:00Z',
              ...(withdrawn ? { withdrawalsInProgress: xof(12000) } : {}),
            },
            topUpLimits: { min: xof(500), max: xof(1_000_000) },
          },
        };
      if (path === '/api/v1/wallet/me/statement')
        return { status: 200, body: { data: [], nextCursor: null } };
      if (path === '/api/v1/wallet/me/withdrawals' && method === 'GET')
        return { status: 200, body: { data: withdrawn ? [withdrawal] : [], nextCursor: null } };
      if (path === '/api/v1/wallet/me/withdrawals' && method === 'POST') {
        keys.push(headers['idempotency-key'] ?? '');
        expect(body).toEqual({
          amount: xof(12000),
          beneficiary: { phone: '+2290197000045', operator: 'moov', name: 'Koffi Adjovi' },
        });
        withdrawn = true;
        return {
          status: 201,
          body: {
            withdrawal,
            wallet: {
              holder: { type: 'user', id: USER_ID },
              balance: xof(18000),
              lastEntryAt: '2026-11-25T09:00:00Z',
              withdrawalsInProgress: xof(12000),
            },
            created: true,
          },
        };
      }
      return undefined;
    },
  });

  await page.goto('/mon-espace/portefeuille');
  const form = page.getByRole('region', { name: 'Retirer vers Mobile Money' });
  // Premier écran chargé à la demande : délai plus large au démarrage à froid du serveur.
  await expect(form).toBeVisible({ timeout: 20_000 });
  await expect(form.getByLabel(/Numéro Mobile Money/)).toHaveValue('+229 01 97 00 00 45');
  await expect(form.getByLabel(/Nom du titulaire/)).toHaveValue('Koffi Adjovi');
  await form.getByLabel(/Montant à retirer/).fill('12 000');
  await form.getByText('Moov', { exact: true }).click();
  await form.getByRole('button', { name: 'Vérifier ma demande' }).click();

  await expect(form.getByText('Vérifiez votre demande')).toBeFocused();
  await form.getByRole('button', { name: /Confirmer le retrait de 12\s000\sF\sCFA/ }).click();
  await expect(form.getByText(/Demande de retrait de 12\s000\sF\sCFA enregistrée/)).toBeVisible();
  await expect(form.getByText(/Nouveau solde : 18\s000\sF\sCFA/)).toBeVisible();
  await expect(page.getByText(/En cours de retrait : 12\s000\sF\sCFA, déjà déduit du solde/)).toBeVisible();
  const list = page.getByRole('region', { name: 'Mes retraits' });
  await expect(list.getByText('Vers Moov +229 •• •• 45')).toBeVisible();
  await expect(list.getByText('Demandé')).toBeVisible();

  expect(keys).toHaveLength(1);
  expect(keys[0]).toMatch(/^[A-Za-z0-9_-]{8,100}$/);
  expect(gateway.forbiddenHeaders).toEqual([]);
});

/** Facture de séance v2 (champs v1 vides, comme la gateway les renvoie). */
const invoice = {
  id: INVOICE_ID,
  number: 'FAC-2026-000101',
  status: 'pending_payment',
  customerId: USER_ID,
  organizationId: null,
  source: 'cleaning',
  contractId: '',
  periodIndex: 0,
  periodStart: '',
  periodEnd: '',
  lines: [
    {
      label: 'Séance 3/15 — Nettoyage de bureaux',
      quantity: 1,
      unitPrice: xof(25000),
      amount: xof(25000),
      kind: 'session',
      serviceDate: '2026-11-12',
      programNumber: 'PN-2026-000012',
      placeLabel: 'Bureau Haie Vive',
    },
  ],
  total: xof(25000),
  paid: xof(0),
  balance: xof(25000),
  issuedAt: '2026-11-12T18:00:00Z',
  dueAt: '2026-11-19T18:00:00Z',
  paidAt: null,
  payments: [],
  organization: null,
  kind: 'session',
  requestNumber: 'DN-2026-000045',
  programNumber: 'PN-2026-000012',
  sessionRank: '3/15',
  placeLabel: 'Bureau Haie Vive',
  serviceDate: '2026-11-12',
  creditNotes: [],
};

for (const served of [false, true]) {
  test(`facture v2 : détail lisible ; Mobile Money ${served ? 'servi : page du prestataire' : 'pas encore servi : « Bientôt disponible »'}`, async ({
    page,
  }) => {
    await page.route(`${CHECKOUT}**`, (route) =>
      route.fulfill({ status: 200, contentType: 'text/html', body: '<h1>Page du prestataire</h1>' }),
    );
    await mockGateway(page, {
      signedIn: true,
      routes: ({ method, path }) => {
        if (path === `/api/v1/billing/invoices/${INVOICE_ID}` && method === 'GET')
          return { status: 200, body: invoice };
        if (path === '/api/v1/wallet/me')
          return { status: 200, body: { prepaid: { balance: xof(5000), lastEntryAt: null } } };
        if (path === `/api/v1/billing/invoices/${INVOICE_ID}/pay-mobile-money`)
          return served
            ? {
                status: 200,
                body: {
                  paymentId: '0192f1c4-7a2b-7c3d-8e4f-5a6b7c8d5101',
                  amount: xof(25000),
                  checkoutUrl: CHECKOUT,
                  expiresAt: '2026-11-25T10:30:00Z',
                  created: true,
                },
              }
            : NOT_SERVED;
        return undefined;
      },
    });

    await page.goto(`/mon-espace/factures/${INVOICE_ID}`);
    await expect(page.getByRole('heading', { level: 1, name: 'Facture FAC-2026-000101' })).toBeVisible();
    await expect(
      page.getByText('Facture de séance · Séance 3/15 · Bureau Haie Vive · Prestation du 12 novembre 2026'),
    ).toBeVisible();
    await expect(page.getByText(/Mois \d+ du contrat|Période du/)).toHaveCount(0);
    await expect(page.getByRole('link', { name: 'Mes programmes de nettoyage' })).toBeVisible();

    const momo = page.getByRole('region', { name: 'Payer par Mobile Money' });
    await momo.getByRole('button', { name: /Payer 25\s000\sF\sCFA par Mobile Money/ }).click();
    if (served) {
      await expect(page).toHaveURL(CHECKOUT);
      await expect(page.getByRole('heading', { name: 'Page du prestataire' })).toBeVisible();
    } else {
      await expect(momo.getByText('Bientôt disponible')).toBeVisible();
      await expect(page.locator('[data-backend-needs]')).toHaveCount(0);
      await expect(page.getByRole('button', { name: 'Payer avec mon portefeuille' })).toBeVisible();
    }
  });
}

const membership = {
  organization: {
    id: ORG_ID,
    legalName: 'SARL Bénin Propre',
    address: 'Lot 1234, Haie Vive, Cotonou',
    ifu: '3201912345678',
    rccm: null,
    billingEmail: null,
    status: 'active',
    rejectionReason: null,
    suspensionReason: null,
    createdAt: '2026-10-27T10:00:00Z',
    reviewedAt: '2026-10-28T10:00:00Z',
  },
  role: 'org_admin',
  pendingBillingEmail: null,
};

const invitation = {
  id: '0192f1c4-7a2b-7c3d-8e4f-5a6b7c8d0c01',
  organizationId: ORG_ID,
  organizationName: 'SARL Bénin Propre',
  role: 'org_member',
  phoneMasked: '+229 •• •• 46',
  status: 'pending',
  invitedBy: USER_ID,
  invitedAt: '2026-11-24T10:00:00Z',
  expiresAt: '2026-12-01T10:00:00Z',
};

test('membres et invitations pas encore servis : « Bientôt disponible », sans détail technique', async ({
  page,
}) => {
  await mockGateway(page, {
    signedIn: true,
    routes: ({ method, path }) => {
      if (path === `/api/v1/identity/organizations/${ORG_ID}` && method === 'GET')
        return { status: 200, body: membership };
      if (path === '/api/v1/identity/organizations' && method === 'GET')
        return { status: 200, body: { data: [membership] } };
      return undefined; // Membres, invitations, préférences : 404 GATEWAY_ROUTE_NOT_FOUND.
    },
  });

  await page.goto(`/mon-espace/entreprise/${ORG_ID}`);
  await expect(page.getByRole('heading', { level: 1, name: 'SARL Bénin Propre' })).toBeVisible();
  const members = page.getByRole('region', { name: 'Membres' });
  await expect(members.getByText('Bientôt disponible')).toBeVisible();
  await expect(page.locator('[data-backend-needs]')).toHaveCount(0);

  await page.goto('/mon-espace/entreprise');
  await expect(
    page.getByRole('region', { name: 'Invitations reçues' }).getByText('Bientôt disponible'),
  ).toBeVisible();

  // Mon espace : la carte des invitations n'apparaît pas tant que la route n'est pas servie.
  await page.goto('/mon-espace');
  await expect(page.getByRole('heading', { name: 'À faire maintenant' })).toBeVisible();
  await expect(page.locator('#todo-invitations')).toHaveCount(0);
});

test('membres servis : liste et invitation ; invitation reçue acceptée depuis « À faire »', async ({
  page,
}) => {
  let invited = false;
  let accepted = false;
  const gateway = await mockGateway(page, {
    signedIn: true,
    routes: ({ method, path, body }) => {
      if (path === `/api/v1/identity/organizations/${ORG_ID}` && method === 'GET')
        return { status: 200, body: membership };
      if (path === '/api/v1/identity/organizations' && method === 'GET')
        return { status: 200, body: { data: accepted ? [{ ...membership, role: 'org_member' }] : [] } };
      if (path === `/api/v1/identity/organizations/${ORG_ID}/members`)
        return {
          status: 200,
          body: {
            data: [
              {
                userId: USER_ID,
                role: 'org_admin',
                firstName: 'Koffi',
                lastName: 'Adjovi',
                phoneMasked: '+229 •• •• 45',
                joinedAt: '2026-10-28T10:00:00Z',
              },
            ],
            pendingInvitations: invited ? [invitation] : [],
          },
        };
      if (path === `/api/v1/identity/organizations/${ORG_ID}/invitations` && method === 'POST') {
        expect(body).toEqual({ phone: '+2290197000046', role: 'org_viewer' });
        invited = true;
        return { status: 201, body: { ...invitation, role: 'org_viewer' } };
      }
      if (path === '/api/v1/identity/me/organization-invitations')
        return { status: 200, body: { data: accepted ? [] : [invitation] } };
      if (path === `/api/v1/identity/organization-invitations/${invitation.id}/respond`) {
        accepted = true;
        return {
          status: 200,
          body: {
            invitation: { ...invitation, status: 'accepted' },
            membership: { ...membership, role: 'org_member' },
          },
        };
      }
      return undefined;
    },
  });

  await page.goto(`/mon-espace/entreprise/${ORG_ID}`);
  const members = page.getByRole('region', { name: 'Membres' });
  await expect(members.getByText('Koffi Adjovi')).toBeVisible();
  await members.getByLabel(/Numéro de téléphone/).fill('01 97 00 00 46');
  await members.getByLabel('Rôle', { exact: true }).selectOption('org_viewer');
  await members.getByRole('button', { name: 'Envoyer l’invitation' }).click();
  await expect(members.getByText(/Invitation envoyée à \+229 01 97 00 00 46/)).toBeVisible();

  await page.goto('/mon-espace');
  const todo = page.getByRole('region', { name: /Invitations/ });
  await expect(todo.getByText('Rejoindre SARL Bénin Propre')).toBeVisible();
  await todo.getByRole('link', { name: 'Répondre' }).click();
  await expect(page).toHaveURL(/\/mon-espace\/entreprise#invitations-recues$/);
  const received = page.getByRole('region', { name: 'Invitations reçues' });
  await received.getByRole('button', { name: 'Accepter l’invitation de SARL Bénin Propre' }).click();
  await expect(received.getByText('Vous faites maintenant partie de SARL Bénin Propre.')).toBeVisible();
  await expect(page.getByRole('link', { name: 'SARL Bénin Propre' })).toBeVisible();
  expect(gateway.forbiddenHeaders).toEqual([]);
});
