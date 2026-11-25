import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { expect, test, type Page } from '@playwright/test';
import { type ExtraRequest, mockGateway } from './support/gateway';

/*
 * Recouvrement du créancier, PR 3, contre une gateway simulée : décision (devis d'huissier accepté, provision
 * payée par le portefeuille), arrêt d'un dossier (route en 501), paiement reçu directement, reversements et
 * relevés, import d'un tableur (modèle, vérification dans le navigateur, envoi, correction, confirmation).
 * Le build est celui de la production : le bloc « Ce que le back doit fournir » n'y apparaît jamais.
 */

const GATEWAY = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000';
const STORAGE = `${GATEWAY}/stockage/depot`;
const xof = (amount: number) => ({ amount, currency: 'XOF' });
const USER_ID = '0192f1c4-7a2b-7c3d-8e4f-5a6b7c8d9e11';
const CASE_ID = '0192f1c4-7a2b-7c3d-8e4f-5a6b7c8d7101';
const DRAFT_ID = '0192f1c4-7a2b-7c3d-8e4f-5a6b7c8d7102';
const DECISION_ID = '0192f1c4-7a2b-7c3d-8e4f-5a6b7c8d7a01';
const IMPORT_ID = '0192f1c4-7a2b-7c3d-8e4f-5a6b7c8d7b01';
const FILE_ID = '0192f1c4-7a2b-7c3d-8e4f-5a6b7c8d7b11';
const INVOICE_ID = '0192f1c4-7a2b-7c3d-8e4f-5a6b7c8d7c03';

/** Dossier en cours, à la relance amiable ; `due` : reste dû. */
function activeCase(due = 850000, extra: Record<string, unknown> = {}) {
  return {
    id: CASE_ID,
    number: 'RC-000123',
    kind: 'b2b',
    nature: 'unpaid_invoice',
    status: 'active',
    stage: 'amicable',
    creditor: { type: 'user', id: USER_ID, displayName: 'Koffi Adjovi' },
    debtors: [
      {
        id: '0192f1c4-7a2b-7c3d-8e4f-5a6b7c8d7401',
        kind: 'company',
        role: 'main',
        displayName: 'SARL Exemple Distribution',
        firstNames: null,
        lastName: null,
        legalName: 'SARL Exemple Distribution',
        ifu: null,
        rccm: null,
        representativeName: null,
        phones: ['+2290197000045'],
        emails: [],
        address: null,
        communeKey: null,
      },
    ],
    claims: [
      {
        id: '0192f1c4-7a2b-7c3d-8e4f-5a6b7c8d7501',
        reference: 'FA-2026-0142',
        amount: xof(850000),
        dueDate: '2026-08-31',
        description: null,
      },
    ],
    priorEffort: {
      remindersCount: 0,
      lastReminderDate: null,
      channels: [],
      debtAcknowledged: false,
      acknowledgmentFileId: null,
      promisesReceived: null,
      preserveRelationship: false,
    },
    planScale: {
      acceptsPaymentPlan: true,
      maxDurationMonths: 6,
      minFirstPaymentBps: 1000,
      firstPaymentWithinDays: 7,
      minInstallment: xof(10000),
      maxDiscountBps: 500,
    },
    amounts: {
      principal: xof(850000),
      interests: xof(0),
      costs: xof(0),
      paid: xof(850000 - due),
      waived: xof(0),
      due: xof(due),
      overpaid: xof(0),
    },
    prescriptionDate: null,
    score: 64,
    assignedAgent: null,
    partnerAssignment: null,
    mandate: {
      documentId: CASE_ID,
      signatureRequestId: null,
      status: 'signed',
      signedAt: '2026-11-10T10:00:00Z',
    },
    fee: {
      amount: xof(15000),
      status: 'paid',
      paidAt: '2026-11-10T10:05:00Z',
      refundedAmount: xof(0),
      walletTransactionId: null,
    },
    pricing: null,
    currentPlan: null,
    promises: [],
    collections: [],
    documents: [],
    disputes: [],
    notices: [],
    feeQuotes: [],
    provisions: [],
    stageHistory: [],
    nextDeadline: null,
    reviewNote: null,
    rejectionReason: null,
    closure: null,
    source: 'form',
    createdAt: '2026-11-10T09:00:00Z',
    submittedAt: '2026-11-10T10:05:00Z',
    acceptedAt: '2026-11-12T09:00:00Z',
    updatedAt: '2026-11-20T09:00:00Z',
    ...extra,
  };
}

const quote = {
  id: '0192f1c4-7a2b-7c3d-8e4f-5a6b7c8d7a21',
  stage: 'bailiff',
  partner: {
    id: '0192f1c4-7a2b-7c3d-8e4f-5a6b7c8d7a22',
    kind: 'bailiff',
    name: 'Me Dossou',
    office: 'Cotonou',
  },
  lines: [
    { label: 'Commandement de payer', amount: xof(45000) },
    { label: 'Frais de déplacement', amount: xof(15000) },
  ],
  total: xof(60000),
  provision: xof(30000),
  documentId: null,
  validUntil: '2026-12-10T22:59:00Z',
};

function bailiffDecision(status = 'pending') {
  return {
    id: DECISION_ID,
    caseId: CASE_ID,
    caseNumber: 'RC-000123',
    kind: 'bailiff_escalation',
    status,
    createdAt: '2026-11-24T09:00:00Z',
    expiresAt: '2026-12-09T09:00:00Z',
    paymentPlan: null,
    settlement: null,
    feeQuote: quote,
    dispute: null,
    answeredAt: status === 'pending' ? null : '2026-11-25T10:00:00Z',
  };
}

const error = (code: string, message: string, details: Record<string, unknown> = {}) => ({
  error: { code, message, details, correlationId: '0192f1c4-7a2b-7c3d-8e4f-5a6b7c8d9e12' },
});

/** Stockage des fichiers (PUT présigné) : sur l'origine de la gateway, que la CSP autorise. */
async function mockStorage(page: Page) {
  await page.route(STORAGE, (route) =>
    route.fulfill({
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': route.request().headers().origin ?? '*',
        'Access-Control-Allow-Methods': 'PUT',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    }),
  );
}

test('décision : devis d’huissier accepté, provision payée par le portefeuille, confirmation gardée', async ({
  page,
}) => {
  let answered = false;
  const keys: string[] = [];
  await mockGateway(page, {
    signedIn: true,
    routes: ({ method, path, url, headers, body }: ExtraRequest) => {
      if (method === 'GET' && path === '/api/v1/recovery/decisions') {
        const status = url.searchParams.get('status');
        const list = answered ? [bailiffDecision('approved')] : [bailiffDecision()];
        return {
          status: 200,
          body: { decisions: status === 'pending' && answered ? [] : list, nextCursor: null },
        };
      }
      if (method === 'GET' && path === '/api/v1/wallet/me')
        return {
          status: 200,
          body: {
            prepaid: { balance: xof(answered ? 70000 : 100000), lastEntryAt: null },
            topUpLimits: { min: xof(500), max: xof(1_000_000) },
          },
        };
      if (method === 'POST' && path === `/api/v1/recovery/decisions/${DECISION_ID}`) {
        expect(body).toEqual({ answer: 'approve' });
        keys.push(headers['idempotency-key'] ?? '');
        answered = true;
        return { status: 200, body: { decision: bailiffDecision('approved'), case: activeCase() } };
      }
      return undefined;
    },
  });

  await page.goto('/mon-espace/recouvrement/decisions');
  const waiting = page.getByRole('region', { name: 'En attente de votre réponse' });
  await expect(waiting).toContainText('le dossier est clos, comme abandonné par vous');
  await waiting.getByRole('link', { name: 'Passage à l’huissier' }).click();

  await expect(page.getByRole('heading', { level: 1, name: 'Passage à l’huissier' })).toBeVisible();
  await expect(page.getByText('Commandement de payer')).toBeVisible();
  await page.getByRole('button', { name: 'Accepter le devis et verser la provision' }).click();
  await page.getByRole('button', { name: /Confirmer le paiement de 30/ }).click();
  await expect(page.getByText(/Votre accord est enregistré/)).toBeVisible();
  // La confirmation reste affichée une fois la décision mise à jour.
  await expect(page.getByRole('heading', { name: 'Acceptée' })).toBeVisible();
  await expect(page.getByText(/Votre accord est enregistré/)).toBeVisible();
  expect(keys).toHaveLength(1);
  expect(keys[0]).toMatch(/^[A-Za-z0-9_-]{8,100}$/);
  await expect(page.locator('[data-backend-needs]')).toHaveCount(0);
});

test('fiche d’un dossier : paiement reçu directement, puis arrêt (route pas encore servie)', async ({
  page,
}) => {
  let due = 850000;
  const sent: unknown[] = [];
  await mockGateway(page, {
    signedIn: true,
    routes: ({ method, path, body }: ExtraRequest) => {
      if (method === 'GET' && path === `/api/v1/recovery/cases/${CASE_ID}`)
        return { status: 200, body: activeCase(due) };
      if (method === 'POST' && path === `/api/v1/recovery/cases/${CASE_ID}/direct-payments`) {
        sent.push(body);
        due = 750000;
        return {
          status: 200,
          body: {
            case: activeCase(due),
            collection: {
              id: '0192f1c4-7a2b-7c3d-8e4f-5a6b7c8d7d01',
              source: 'direct_to_creditor',
              gross: xof(100000),
              allocatedCosts: xof(0),
              allocatedInterests: xof(0),
              allocatedPrincipal: xof(100000),
              overpaid: xof(0),
              commission: xof(10000),
              netToCreditor: xof(100000),
              stage: 'amicable',
              receivedAt: '2026-11-24T10:00:00Z',
              walletTransactionId: null,
              receiptDocumentId: null,
            },
          },
        };
      }
      if (method === 'POST' && path === `/api/v1/recovery/cases/${CASE_ID}/stop`)
        return {
          status: 501,
          body: error('RECOVERY_NOT_IMPLEMENTED', 'La méthode StopCase n’est pas encore disponible.'),
        };
      return undefined;
    },
  });

  await page.goto(`/mon-espace/recouvrement/dossiers/${CASE_ID}`);
  const payment = page.getByRole('region', { name: 'Déclarer un paiement reçu' });
  await expect(payment).toContainText('facturée chaque mois');
  await payment.getByRole('button', { name: 'Déclarer un paiement reçu…' }).click();
  await payment.getByLabel('Montant reçu (FCFA)').fill('100 000');
  await payment.getByLabel('Date de réception').fill('2026-11-24');
  await payment.getByLabel('Note (facultatif)').fill('Virement Ecobank');
  await payment.getByRole('button', { name: 'Déclarer le paiement' }).click();
  await expect(page.getByText(/Paiement de 100\s000\sF\sCFA enregistré\. Reste dû : 750\s000/)).toBeVisible();
  expect(sent).toEqual([{ amount: xof(100000), receivedOn: '2026-11-24', note: 'Virement Ecobank' }]);

  const stop = page.getByRole('region', { name: 'Arrêter le dossier' });
  await expect(stop).toContainText('dans les 30 jours qui suivent l’arrêt');
  await expect(stop).toContainText('ils ne sont jamais remboursés');
  await stop.getByRole('button', { name: 'Arrêter le dossier…' }).click();
  await stop.getByLabel('Motif de l’arrêt').fill('Accord trouvé avec le débiteur');
  await stop.getByText(/J’ai compris/).click();
  await stop.getByRole('button', { name: 'Confirmer l’arrêt' }).click();
  await expect(page.getByText('L’arrêt en ligne arrive bientôt')).toBeVisible();
  await expect(page.getByText('Bientôt disponible')).toBeVisible();
  await expect(page.locator('[data-backend-needs]')).toHaveCount(0);
});

test('reversements et relevés : reversements, relevés en attente, factures de commission et leur détail', async ({
  page,
}) => {
  const commission = {
    id: INVOICE_ID,
    number: 'FCR-2026-000007',
    status: 'pending_payment',
    creditor: { type: 'user', id: USER_ID },
    period: '2026-11',
    periodStart: '2026-10-31T23:00:00Z',
    periodEnd: '2026-11-30T23:00:00Z',
    lines: [
      {
        caseId: CASE_ID,
        caseNumber: 'RC-000123',
        collectionId: '0192f1c4-7a2b-7c3d-8e4f-5a6b7c8d5101',
        receivedAt: '2026-11-04T10:00:00Z',
        receivedOn: '2026-11-04',
        source: 'direct_to_creditor',
        gross: xof(60000),
        commission: xof(9000),
        settlement: 'invoiced',
      },
    ],
    totalCollected: xof(60000),
    commissionDeducted: xof(0),
    commissionInvoiced: xof(9000),
    commissionTotal: xof(9000),
    balance: xof(9000),
    amountsExcludingTax: true,
    issuedAt: '2026-11-30T23:00:00Z',
    paidAt: null,
    walletTransactionId: null,
    debit: {
      attempts: 1,
      lastAttemptAt: '2026-11-30T23:00:00Z',
      nextAttemptAt: '2026-12-01T23:00:00Z',
      lastFailure: 'insufficient_funds',
      missing: xof(5000),
    },
    organization: null,
  };
  await mockGateway(page, {
    signedIn: true,
    routes: ({ method, path }: ExtraRequest) => {
      if (method !== 'GET') return undefined;
      if (path === '/api/v1/recovery/remittances')
        return {
          status: 200,
          body: {
            remittances: [
              {
                collectionId: '0192f1c4-7a2b-7c3d-8e4f-5a6b7c8d5102',
                caseId: CASE_ID,
                caseNumber: 'RC-000123',
                source: 'payment_link',
                gross: xof(100000),
                commission: xof(10000),
                net: xof(90000),
                creditedAt: '2026-11-20T10:00:00Z',
                walletTransactionId: '0192f1c4-7a2b-7c3d-8e4f-5a6b7c8d7e01',
              },
            ],
            nextCursor: null,
          },
        };
      if (path === '/api/v1/recovery/statements')
        return { status: 501, body: error('RECOVERY_NOT_IMPLEMENTED', 'pas encore') };
      if (path === '/api/v1/billing/commission-invoices')
        return { status: 200, body: { data: [commission], nextCursor: null } };
      if (path === `/api/v1/billing/commission-invoices/${INVOICE_ID}`)
        return { status: 200, body: commission };
      return undefined;
    },
  });

  await page.goto('/mon-espace/factures');
  await page.getByRole('link', { name: 'Factures de commission' }).click();
  await expect(page).toHaveURL(/\/mon-espace\/recouvrement\/releves\?onglet=factures$/);
  await expect(page.getByRole('tab', { name: 'Factures de commission' })).toHaveAttribute(
    'aria-selected',
    'true',
  );
  await expect(page.getByText(/il manque 5\s000/)).toBeVisible();

  await page.getByRole('tab', { name: 'Reversements' }).click();
  await expect(page.getByText('Crédité à votre portefeuille')).toBeVisible();
  await expect(page.getByRole('link', { name: 'Retirer depuis mon portefeuille' })).toHaveAttribute(
    'href',
    '/mon-espace/portefeuille',
  );
  await page.getByRole('tab', { name: 'Relevés mensuels' }).click();
  await expect(page.getByText('Vos relevés mensuels arrivent bientôt')).toBeVisible();

  await page.getByRole('tab', { name: 'Factures de commission' }).click();
  await page.getByRole('link', { name: 'Commission de novembre 2026' }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Commission de novembre 2026' })).toBeVisible();
  await expect(page.getByText('Reçu directement par vous · Débitée de votre portefeuille')).toBeVisible();
  await expect(page.getByText(/aucune TVA/)).toBeVisible();
  await expect(page.locator('[data-backend-needs]')).toHaveCount(0);
});

test('import : modèle, vérification dans le navigateur, envoi, correction d’une ligne, brouillons créés', async ({
  page,
}) => {
  let state: 'checked' | 'corrected' | 'confirmed' = 'checked';
  const calls: Array<{ key: string; body: unknown; idempotency?: string }> = [];
  const values = (row: number, phone: string) => ({
    debtorKind: 'company',
    debtorName: row === 3 ? 'Ets Le Phare' : 'SARL Bénin Distribution',
    debtorFirstNames: '',
    debtorIfu: '',
    debtorPhone: phone,
    debtorEmail: '',
    debtorAddress: '',
    invoiceReference: `FA-${row}`,
    amount: '50000',
    dueDate: '31/08/2026',
    description: '',
    nature: 'unpaid_invoice',
  });
  const report = () => ({
    id: IMPORT_ID,
    status: state === 'confirmed' ? 'confirmed' : 'checked',
    kind: 'b2b',
    linesTotal: 3,
    linesValid: state === 'checked' ? 2 : 3,
    linesInvalid: state === 'checked' ? 1 : 0,
    casesPlanned: state === 'checked' ? 1 : 2,
    lines: [
      { row: 1, status: 'valid', values: values(1, '0197000045'), errors: [] },
      { row: 2, status: 'valid', values: values(2, '0197000045'), errors: [] },
      state === 'checked'
        ? {
            row: 3,
            status: 'invalid',
            values: values(3, '0197000046'),
            errors: [{ field: 'amount', code: 'amount_below_minimum' }],
          }
        : { row: 3, status: 'valid', values: { ...values(3, '0197000046'), amount: '30000' }, errors: [] },
    ],
    caseIds: state === 'confirmed' ? [CASE_ID, DRAFT_ID] : [],
    createdAt: '2026-11-25T09:00:00Z',
  });
  const storedFile = (status: string) => ({
    id: FILE_ID,
    purpose: 'recovery_evidence',
    purposeDetail: 'recovery_import',
    fileName: 'factures.csv',
    contentType: 'text/csv',
    sizeBytes: 200,
    status,
    createdAt: '2026-11-25T09:00:00Z',
    completedAt: status === 'available' ? '2026-11-25T09:00:01Z' : null,
  });
  const summary = (id: string, number: string, debtorName: string) => ({
    id,
    number,
    kind: 'b2b',
    status: 'draft',
    stage: null,
    creditor: { type: 'user', id: USER_ID, displayName: 'Koffi Adjovi' },
    debtorName,
    due: xof(100000),
    paid: xof(0),
    score: null,
    assignedAgent: null,
    nextDeadline: null,
    lastActionAt: null,
    createdAt: '2026-11-25T09:00:00Z',
  });
  await mockGateway(page, {
    signedIn: true,
    routes: ({ method, path, body, headers }: ExtraRequest) => {
      const key = `${method} ${path}`;
      if (method !== 'GET') calls.push({ key, body, idempotency: headers['idempotency-key'] });
      switch (key) {
        case 'POST /api/v1/file/uploads':
          return {
            status: 200,
            body: {
              file: storedFile('pending'),
              upload: {
                url: STORAGE,
                method: 'PUT',
                headers: { 'Content-Type': 'text/csv' },
                expiresAt: '2099-01-01T00:00:00Z',
              },
            },
          };
        case `POST /api/v1/file/files/${FILE_ID}/complete`:
          return { status: 200, body: storedFile('available') };
        case 'POST /api/v1/recovery/imports':
          return { status: 200, body: report() };
        case `GET /api/v1/recovery/imports/${IMPORT_ID}`:
          return { status: 200, body: report() };
        case `PUT /api/v1/recovery/imports/${IMPORT_ID}/lines/3`:
          state = 'corrected';
          return { status: 200, body: report() };
        case `POST /api/v1/recovery/imports/${IMPORT_ID}/confirm`:
          state = 'confirmed';
          return { status: 200, body: report() };
        case 'GET /api/v1/recovery/cases':
          return {
            status: 200,
            body: {
              cases: [
                summary(CASE_ID, 'RC-000130', 'SARL Bénin Distribution'),
                summary(DRAFT_ID, 'RC-000131', 'Ets Le Phare'),
              ],
              nextCursor: null,
              total: 2,
            },
          };
        default:
          return undefined;
      }
    },
  });
  await mockStorage(page);

  await page.goto('/mon-espace/recouvrement/import');
  // 1. Modèle.
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('link', { name: 'Télécharger le modèle (CSV)' }).click(),
  ]);
  expect(download.suggestedFilename()).toBe('modele-import-recouvrement.csv');
  const template = readFileSync((await download.path())!, 'utf8');
  expect(template.startsWith('﻿debtorKind;debtorName;')).toBe(true);

  // 2. Vérification d'un fichier avec des erreurs (le vrai fichier exemple), puis d'un fichier propre.
  await page.getByText('Des entreprises').click();
  const input = page.getByLabel(/Tableur \(CSV ou XLSX/);
  await input.setInputFiles(join(process.cwd(), 'src/features/recovery/test-files/import-exemple.csv'));
  await expect(
    page.getByText('3 lignes à corriger sur 6. Corrigez le fichier puis choisissez-le de nouveau.'),
  ).toBeVisible();
  await expect(page.getByRole('button', { name: 'Envoyer le tableur' })).toBeDisabled();
  const header = template.slice(1).split('\r\n')[0];
  await input.setInputFiles({
    name: 'factures.csv',
    mimeType: 'application/vnd.ms-excel',
    buffer: Buffer.from(
      `${header}\ncompany;SARL Bénin Distribution;;;0197000045;;;FA-1;50000;31/08/2026;;\ncompany;SARL Bénin Distribution;;;0197000045;;;FA-2;50000;31/08/2026;;\ncompany;Ets Le Phare;;;0197000046;;;FA-3;50000;31/08/2026;;\n`,
    ),
  });
  await expect(page.getByText(/3 factures vérifiées dans votre navigateur : aucune erreur/)).toBeVisible();

  // 3. Envoi : dépôt par file, contrôle par KSP, résultat.
  await page.getByRole('button', { name: 'Envoyer le tableur' }).click();
  await expect(page).toHaveURL(new RegExp(`/mon-espace/recouvrement/import/${IMPORT_ID}$`));
  const invalid = page.getByRole('region', { name: 'Lignes à corriger' });
  await expect(invalid).toContainText(
    'Total des factures de ce débiteur sous le montant minimum d’un dossier.',
  );
  await expect(page.getByRole('button', { name: 'Créer les brouillons' })).toBeDisabled();

  await invalid.getByRole('button', { name: 'Corriger' }).click();
  await invalid.getByLabel('Montant (FCFA)').fill('30000');
  await invalid.getByRole('button', { name: 'Enregistrer la ligne' }).click();
  await expect(page.getByText('Ligne 3 enregistrée : KSP l’a contrôlée de nouveau.')).toBeVisible();

  await page.getByRole('button', { name: 'Créer les brouillons' }).click();
  await expect(page.getByRole('heading', { name: 'Brouillons créés' })).toBeVisible();
  await expect(page.getByText('Brouillon RC-000131')).toBeVisible();
  await expect(page.getByText(/frais d’étude : ils ne sont jamais remboursés/)).toBeVisible();

  const upload = calls.find((call) => call.key === 'POST /api/v1/file/uploads');
  expect(upload?.body).toMatchObject({ purpose: 'recovery_import', contentType: 'text/csv' });
  const created = calls.find((call) => call.key === 'POST /api/v1/recovery/imports');
  expect(created?.body).toEqual({ kind: 'b2b', fileId: FILE_ID });
  expect(created?.idempotency).toMatch(/^[A-Za-z0-9_-]{8,100}$/);
  expect(calls.find((call) => call.key.endsWith('/lines/3'))?.body).toMatchObject({
    values: { amount: '30000', debtorName: 'Ets Le Phare' },
  });
  expect(calls.find((call) => call.key.endsWith('/confirm'))?.idempotency).toMatch(/^[A-Za-z0-9_-]{8,100}$/);
});
