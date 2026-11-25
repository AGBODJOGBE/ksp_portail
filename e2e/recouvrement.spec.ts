import { expect, test } from '@playwright/test';
import { type ExtraRequest, mockGateway } from './support/gateway';

/*
 * Recouvrement du créancier contre une gateway simulée : de la saisie du dossier à la signature du mandat
 * et au paiement des frais par le portefeuille ; fiche d'un dossier en cours ; pages en attente du backend.
 * Le build est celui de la production : le bloc « Ce que le back doit fournir » n'y apparaît jamais.
 */

const GATEWAY = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000';
const STORAGE = `${GATEWAY}/stockage/depot`;
const xof = (amount: number) => ({ amount, currency: 'XOF' });
const USER_ID = '0192f1c4-7a2b-7c3d-8e4f-5a6b7c8d9e11';
const CASE_ID = '0192f1c4-7a2b-7c3d-8e4f-5a6b7c8d7101';
const DOCUMENT_ID = '0192f1c4-7a2b-7c3d-8e4f-5a6b7c8d7201';
const SIGNATURE_ID = '0192f1c4-7a2b-7c3d-8e4f-5a6b7c8d7202';
const FILE_ID = '0192f1c4-7a2b-7c3d-8e4f-5a6b7c8d7301';
const actor = { type: 'creditor', userId: USER_ID, displayName: 'Koffi Adjovi' };
const scale = {
  acceptsPaymentPlan: true,
  maxDurationMonths: 6,
  minFirstPaymentBps: 1000,
  firstPaymentWithinDays: 7,
  minInstallment: xof(10000),
  maxDiscountBps: 500,
};
const pricing = {
  feeRuleId: '0192f1c4-7a2b-7c3d-8e4f-5a6b7c8d7001',
  feeRuleVersion: 1,
  commissionRuleId: '0192f1c4-7a2b-7c3d-8e4f-5a6b7c8d7002',
  commissionRuleVersion: 1,
  commissionSummary: '10 % des sommes recouvrées',
};

type Status = 'draft' | 'awaiting_fee' | 'under_review' | 'active';

function recoveryCase(
  status: Status,
  mandate: 'none' | 'pending' | 'signed',
  extra: Record<string, unknown> = {},
) {
  return {
    id: CASE_ID,
    number: 'RC-000123',
    kind: 'b2b',
    nature: 'unpaid_invoice',
    status,
    stage: status === 'active' ? 'amicable' : null,
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
    planScale: scale,
    amounts: {
      principal: xof(850000),
      interests: xof(0),
      costs: xof(0),
      paid: xof(0),
      waived: xof(0),
      due: xof(850000),
      overpaid: xof(0),
    },
    prescriptionDate: null,
    score: 64,
    assignedAgent: null,
    partnerAssignment: null,
    mandate:
      mandate === 'none'
        ? null
        : {
            documentId: DOCUMENT_ID,
            signatureRequestId: SIGNATURE_ID,
            status: mandate === 'signed' ? 'signed' : 'pending_signature',
            signedAt: mandate === 'signed' ? '2026-11-25T10:00:00Z' : null,
          },
    fee:
      mandate === 'none'
        ? null
        : {
            amount: xof(15000),
            status: status === 'draft' || status === 'awaiting_fee' ? 'unpaid' : 'paid',
            paidAt: status === 'draft' || status === 'awaiting_fee' ? null : '2026-11-25T10:05:00Z',
            refundedAmount: xof(0),
            walletTransactionId: null,
          },
    pricing: mandate === 'none' ? null : pricing,
    currentPlan: null,
    promises: [],
    collections: [],
    documents: [
      {
        id: '0192f1c4-7a2b-7c3d-8e4f-5a6b7c8d7601',
        kind: 'evidence',
        fileId: FILE_ID,
        documentId: null,
        label: 'Justificatif 1',
        addedBy: actor,
        addedAt: '2026-11-25T09:00:00Z',
        visibleToDebtor: false,
      },
    ],
    disputes: [],
    notices: [],
    feeQuotes: [],
    provisions: [],
    stageHistory:
      status === 'active'
        ? [
            {
              fromStage: null,
              toStage: 'notice',
              at: '2026-11-15T09:00:00Z',
              by: { type: 'staff', userId: null, displayName: 'KSP' },
              reason: null,
              skipReason: null,
            },
            {
              fromStage: 'notice',
              toStage: 'amicable',
              at: '2026-11-23T09:00:00Z',
              by: { type: 'system', userId: null, displayName: null },
              reason: null,
              skipReason: null,
            },
          ]
        : [],
    nextDeadline:
      status === 'under_review'
        ? { kind: 'review', dueAt: '2026-11-27T22:59:00Z' }
        : status === 'active'
          ? null
          : { kind: 'fee_payment', dueAt: '2026-12-02T09:00:00Z' },
    reviewNote: null,
    rejectionReason: null,
    closure: null,
    source: 'form',
    createdAt: '2026-11-25T09:00:00Z',
    submittedAt: status === 'under_review' || status === 'active' ? '2026-11-25T10:05:00Z' : null,
    acceptedAt: status === 'active' ? '2026-11-15T09:00:00Z' : null,
    updatedAt: '2026-11-25T09:00:00Z',
    ...extra,
  };
}

function mandateDocument(signed: boolean) {
  return {
    id: DOCUMENT_ID,
    template: 'recovery_mandate',
    templateVersion: 1,
    title: 'Mandat de recouvrement',
    number: 'MAN-2026-000042',
    status: signed ? 'signed' : 'pending_signature',
    subject: { type: 'recovery_case', id: CASE_ID },
    sha256: 'a'.repeat(64),
    sizeBytes: 1200,
    signedSha256: signed ? 'b'.repeat(64) : null,
    createdAt: '2026-11-25T09:30:00Z',
    signedAt: signed ? '2026-11-25T10:00:00Z' : null,
    cancelledAt: null,
    signature: {
      id: SIGNATURE_ID,
      status: signed ? 'signed' : 'pending',
      signer: { displayName: 'Koffi Adjovi', phoneMasked: '+229********45', hasAccount: true },
      canSign: !signed,
      createdAt: '2026-11-25T09:30:00Z',
      expiresAt: '2026-12-02T09:30:00Z',
      signedAt: signed ? '2026-11-25T10:00:00Z' : null,
      codeExpiresAt: signed ? null : '2099-01-01T00:00:00Z',
    },
  };
}

const storedFile = (status: string) => ({
  id: FILE_ID,
  purpose: 'recovery_evidence',
  fileName: 'facture.pdf',
  contentType: 'application/pdf',
  sizeBytes: 4,
  status,
  createdAt: '2026-11-25T09:00:00Z',
  completedAt: status === 'available' ? '2026-11-25T09:00:01Z' : null,
});

test('nouveau dossier : saisie, pièce, brouillon, mandat signé par code, frais payés par le portefeuille', async ({
  page,
}) => {
  let state: { status: Status; mandate: 'none' | 'pending' | 'signed' } = {
    status: 'draft',
    mandate: 'none',
  };
  const keys: Record<string, string> = {};
  const gateway = await mockGateway(page, {
    signedIn: true,
    routes: ({ method, path, body, headers }: ExtraRequest) => {
      const key = `${method} ${path}`;
      switch (key) {
        case 'GET /api/v1/recovery/preferences':
          return { status: 200, body: { b2bScale: scale, b2cScale: scale, notifyUserIds: [] } };
        case 'POST /api/v1/recovery/estimates':
          return {
            status: 200,
            body: {
              caseFee: xof(15000),
              commissionSummary: pricing.commissionSummary,
              stageRates: [],
              minimumAmountDue: xof(25000),
              pricing,
            },
          };
        case 'POST /api/v1/file/uploads':
          return {
            status: 200,
            body: {
              file: storedFile('pending'),
              upload: {
                url: STORAGE,
                method: 'PUT',
                headers: { 'Content-Type': 'application/pdf' },
                expiresAt: '2099-01-01T00:00:00Z',
              },
            },
          };
        case `POST /api/v1/file/files/${FILE_ID}/complete`:
          return { status: 200, body: storedFile('available') };
        case 'POST /api/v1/recovery/cases':
          keys.create = headers['idempotency-key'] ?? '';
          expect(body).toMatchObject({
            kind: 'b2b',
            nature: 'unpaid_invoice',
            debtors: [{ kind: 'company', role: 'main', legalName: 'SARL Exemple Distribution' }],
            evidenceFileIds: [FILE_ID],
          });
          return { status: 200, body: { case: recoveryCase('draft', 'none'), possibleDuplicates: [] } };
        case `POST /api/v1/recovery/cases/${CASE_ID}/mandate`:
          state = { status: 'draft', mandate: 'pending' };
          return {
            status: 200,
            body: {
              case: recoveryCase('draft', 'pending'),
              documentId: DOCUMENT_ID,
              signatureRequestId: SIGNATURE_ID,
            },
          };
        case `GET /api/v1/document/documents/${DOCUMENT_ID}`:
          return { status: 200, body: mandateDocument(state.mandate === 'signed') };
        case `POST /api/v1/document/signatures/${SIGNATURE_ID}/sign`:
          expect(body).toEqual({ code: '482913', consent: true });
          // Recovery reçoit la signature de façon asynchrone : le dossier passe « frais à payer ».
          state = { status: 'awaiting_fee', mandate: 'signed' };
          return { status: 200, body: mandateDocument(true) };
        case `GET /api/v1/recovery/cases/${CASE_ID}`:
          return { status: 200, body: recoveryCase(state.status, state.mandate) };
        case 'GET /api/v1/wallet/me':
          return {
            status: 200,
            body: {
              prepaid: { balance: xof(state.status === 'under_review' ? 5000 : 20000), lastEntryAt: null },
              topUpLimits: { min: xof(500), max: xof(1_000_000) },
            },
          };
        case `POST /api/v1/recovery/cases/${CASE_ID}/fee/pay`:
          keys.fee = headers['idempotency-key'] ?? '';
          state = { status: 'under_review', mandate: 'signed' };
          return { status: 200, body: recoveryCase('under_review', 'signed') };
        default:
          return undefined;
      }
    },
  });

  // Stockage des fichiers (PUT présigné) : sur l'origine de la gateway, que la CSP autorise.
  await page.route(`${STORAGE}`, (route) =>
    route.fulfill({
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': route.request().headers().origin ?? '*',
        'Access-Control-Allow-Methods': 'PUT',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    }),
  );

  await page.goto('/mon-espace/recouvrement/nouveau');
  await page.getByText('Une entreprise').click();
  await page.getByLabel('Nature de la créance').selectOption('unpaid_invoice');
  await page.getByRole('button', { name: /Continuer/ }).click();

  await page.getByLabel('Raison sociale').fill('SARL Exemple Distribution');
  await page.getByLabel('Téléphone').fill('97 00 00 45');
  await expect(page.getByText('Numéro utilisé : +229 01 97 00 00 45.')).toBeVisible();
  await page.getByRole('button', { name: /Continuer/ }).click();

  await page.getByLabel('Référence').fill('FA-2026-0142');
  await page.getByLabel('Montant (FCFA)').fill('850000');
  await page.getByLabel('Date d’exigibilité').fill('2026-08-31');
  await expect(page.getByRole('region', { name: 'Estimation des frais' })).toContainText(/15\s000/);
  await page.getByRole('button', { name: /Continuer/ }).click();

  await page.getByLabel('Ajouter des pièces').setInputFiles({
    name: 'facture.pdf',
    mimeType: 'application/pdf',
    buffer: Buffer.from('%PDF'),
  });
  await expect(page.getByText('facture.pdf')).toBeVisible();
  await page.getByRole('button', { name: /Continuer/ }).click();

  await expect(page.getByLabel('Durée maximale (mois)')).toHaveValue('6');
  await page.getByRole('button', { name: /Continuer/ }).click();
  await page.getByRole('button', { name: 'Enregistrer le brouillon' }).click();

  await page.getByRole('button', { name: 'Préparer le mandat' }).click();
  await expect(page.getByText('Conditions figées dans le mandat')).toBeVisible();
  await page.getByLabel(/Code reçu/).fill('482913');
  await page.getByText('J’ai lu le document et j’en accepte le contenu.').click();
  await page.getByRole('button', { name: 'Signer le document' }).click();

  await page.getByRole('button', { name: 'Payer les frais avec mon portefeuille' }).click();
  await page.getByRole('button', { name: /Confirmer le paiement de 15/ }).click();
  await expect(page.getByRole('heading', { name: 'Dossier envoyé à KSP' })).toBeVisible();
  await expect(page.getByText(/sous 2 jours ouvrés/)).toBeVisible();

  expect(keys.create).toMatch(/^[A-Za-z0-9_-]{8,100}$/);
  expect(keys.fee).toMatch(/^[A-Za-z0-9_-]{8,100}$/);
  expect(gateway.forbiddenHeaders).toEqual([]);
});

test('fiche d’un dossier en cours : frise des étapes, journal, actions à venir, aucun score', async ({
  page,
}) => {
  await mockGateway(page, {
    signedIn: true,
    routes: ({ method, path }) => {
      if (method === 'GET' && path === `/api/v1/recovery/cases/${CASE_ID}`)
        return { status: 200, body: recoveryCase('active', 'signed') };
      if (method === 'GET' && path === `/api/v1/recovery/cases/${CASE_ID}/journal`)
        return {
          status: 200,
          body: {
            entries: [
              {
                id: '0192f1c4-7a2b-7c3d-8e4f-5a6b7c8d7701',
                kind: 'message_sent',
                channel: 'whatsapp',
                direction: 'outbound',
                outcome: null,
                deliveryStatus: 'delivered',
                summary: 'Relance envoyée par WhatsApp',
                amount: null,
                author: { type: 'staff', userId: null, displayName: 'Chargée KSP' },
                internal: false,
                documentId: null,
                fileId: null,
                occurredAt: '2026-11-24T10:00:00Z',
              },
            ],
            nextCursor: null,
          },
        };
      return undefined;
    },
  });
  await page.goto(`/mon-espace/recouvrement/dossiers/${CASE_ID}`);
  await expect(page.getByRole('heading', { level: 1, name: 'SARL Exemple Distribution' })).toBeVisible();
  await expect(page.locator('[aria-current="step"]')).toContainText('Relance amiable');
  await expect(page.getByText('Bientôt disponible')).toBeVisible();
  await expect(page.locator('[data-backend-needs]')).toHaveCount(0);
  await expect(page.getByText(/score/i)).toHaveCount(0);
  await page.getByRole('tab', { name: 'Journal' }).click();
  await expect(page.getByText('Relance envoyée par WhatsApp')).toBeVisible();
});

test('pages en attente du backend et vitrine : « Bientôt disponible », dépôt depuis la page publique', async ({
  page,
}) => {
  await mockGateway(page, { signedIn: true });
  await page.goto('/mon-espace/recouvrement/decisions');
  await expect(page.getByRole('heading', { level: 1, name: 'Décisions' })).toBeVisible();
  await expect(page.getByText('Bientôt disponible')).toBeVisible();
  await expect(page.locator('[data-backend-needs]')).toHaveCount(0);

  await page.goto('/recouvrement');
  await expect(page.getByText('Bientôt').first()).toBeVisible();
  await expect(page.getByRole('link', { name: 'Déposer un dossier' }).first()).toHaveAttribute(
    'href',
    '/mon-espace/recouvrement/nouveau',
  );
});
