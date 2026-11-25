/* Réponses de la gateway du Recouvrement pour les tests (contrat `ksp-api.v1.yaml`, ADR-060 à 062). */

export const CASE_ID = '0192f1c4-7a2b-7c3d-8e4f-5a6b7c8d7101';
export const OTHER_ID = '0192f1c4-7a2b-7c3d-8e4f-5a6b7c8d7102';
export const DOCUMENT_ID = '0192f1c4-7a2b-7c3d-8e4f-5a6b7c8d7201';
export const SIGNATURE_ID = '0192f1c4-7a2b-7c3d-8e4f-5a6b7c8d7202';
export const FILE_ID = '0192f1c4-7a2b-7c3d-8e4f-5a6b7c8d7301';
export const ORG_ID = '0192f1c4-7a2b-7c3d-8e4f-5a6b7c8d0a01';
export const USER_ID = '0192f1c4-7a2b-7c3d-8e4f-5a6b7c8d9e11';

export const xof = (amount: number) => ({ amount, currency: 'XOF' as const });

export const scale = (overrides: Record<string, unknown> = {}) => ({
  acceptsPaymentPlan: true,
  maxDurationMonths: 6,
  minFirstPaymentBps: 1000,
  firstPaymentWithinDays: 7,
  minInstallment: xof(10000),
  maxDiscountBps: 500,
  ...overrides,
});

const creditorActor = { type: 'creditor', userId: USER_ID, displayName: 'Koffi Adjovi' };

/** `RecoveryCase` complet, brouillon par défaut. */
export function recoveryCase(overrides: Record<string, unknown> = {}) {
  return {
    id: CASE_ID,
    number: 'RC-000123',
    kind: 'b2b',
    nature: 'unpaid_invoice',
    status: 'draft',
    stage: null,
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
        ifu: '3201900000001',
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
      remindersCount: 3,
      lastReminderDate: null,
      channels: ['phone'],
      debtAcknowledged: false,
      acknowledgmentFileId: null,
      promisesReceived: null,
      preserveRelationship: true,
    },
    planScale: scale(),
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
    score: 72,
    assignedAgent: null,
    partnerAssignment: null,
    mandate: null,
    fee: null,
    pricing: null,
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
        addedBy: creditorActor,
        addedAt: '2026-11-20T09:00:00Z',
        visibleToDebtor: false,
      },
    ],
    disputes: [],
    notices: [],
    feeQuotes: [],
    provisions: [],
    stageHistory: [],
    nextDeadline: { kind: 'fee_payment', dueAt: '2026-11-27T09:00:00Z' },
    reviewNote: null,
    rejectionReason: null,
    closure: null,
    source: 'form',
    createdAt: '2026-11-20T09:00:00Z',
    submittedAt: null,
    acceptedAt: null,
    updatedAt: '2026-11-20T09:00:00Z',
    ...overrides,
  };
}

export const frozen = {
  fee: {
    amount: xof(15000),
    status: 'unpaid',
    paidAt: null,
    refundedAmount: xof(0),
    walletTransactionId: null,
  },
  pricing: {
    feeRuleId: '0192f1c4-7a2b-7c3d-8e4f-5a6b7c8d7001',
    feeRuleVersion: 1,
    commissionRuleId: '0192f1c4-7a2b-7c3d-8e4f-5a6b7c8d7002',
    commissionRuleVersion: 2,
    commissionSummary: '10 % à l’amiable, 15 % après mise en demeure, 20 % au judiciaire',
  },
};

/** Brouillon au mandat préparé, en attente de la signature. */
export const withMandate = (overrides: Record<string, unknown> = {}) =>
  recoveryCase({
    ...frozen,
    mandate: {
      documentId: DOCUMENT_ID,
      signatureRequestId: SIGNATURE_ID,
      status: 'pending_signature',
      signedAt: null,
    },
    ...overrides,
  });

/** Dossier au mandat signé, frais à payer. */
export const awaitingFee = (overrides: Record<string, unknown> = {}) =>
  withMandate({
    status: 'awaiting_fee',
    mandate: {
      documentId: DOCUMENT_ID,
      signatureRequestId: SIGNATURE_ID,
      status: 'signed',
      signedAt: '2026-11-20T10:00:00Z',
    },
    ...overrides,
  });

export function summary(overrides: Record<string, unknown> = {}) {
  return {
    id: CASE_ID,
    number: 'RC-000123',
    kind: 'b2b',
    status: 'draft',
    stage: null,
    creditor: { type: 'user', id: USER_ID, displayName: 'Koffi Adjovi' },
    debtorName: 'SARL Exemple Distribution',
    due: xof(850000),
    paid: xof(0),
    score: 72,
    assignedAgent: null,
    nextDeadline: { kind: 'fee_payment', dueAt: '2026-11-27T09:00:00Z' },
    lastActionAt: null,
    createdAt: '2026-11-20T09:00:00Z',
    ...overrides,
  };
}

export const page = (cases: unknown[], total = cases.length) => ({ cases, nextCursor: null, total });

export function dashboard(overrides: Record<string, unknown> = {}) {
  return {
    entrusted: xof(2500000),
    recovered: xof(600000),
    outstanding: xof(1900000),
    recoveryRateBps: 2400,
    casesByStage: [
      { stage: 'amicable', count: 2 },
      { stage: 'formal_notice', count: 1 },
      { stage: 'bailiff', count: 0 },
    ],
    pendingDecisions: 0,
    upcomingInstallments: [
      {
        caseId: OTHER_ID,
        caseNumber: 'RC-000124',
        debtorName: 'Ets Bénin Négoce',
        dueDate: '2026-12-05',
        amount: xof(50000),
      },
    ],
    ...overrides,
  };
}

export const preferences = () => ({
  b2bScale: scale(),
  b2cScale: scale({ maxDurationMonths: 3, minInstallment: xof(5000) }),
  notifyUserIds: ['0192f1c4-7a2b-7c3d-8e4f-5a6b7c8d0b01'],
});

export const estimate = () => ({
  caseFee: xof(15000),
  commissionSummary: '10 % à l’amiable, 15 % après mise en demeure, 20 % au judiciaire',
  stageRates: [
    { stageGroup: 'amicable', rateBps: 1000 },
    { stageGroup: 'formal_notice', rateBps: 1500 },
    { stageGroup: 'litigation', rateBps: 2000 },
  ],
  minimumAmountDue: xof(25000),
  pricing: frozen.pricing,
});

/** `Document` du mandat (service document). */
export function mandateDocument(
  overrides: Record<string, unknown> = {},
  signature: Record<string, unknown> = {},
) {
  return {
    id: DOCUMENT_ID,
    template: 'recovery_mandate',
    templateVersion: 1,
    title: 'Mandat de recouvrement',
    number: 'MAN-2026-000042',
    status: 'pending_signature',
    subject: { type: 'recovery_case', id: CASE_ID },
    sha256: 'a'.repeat(64),
    sizeBytes: 1200,
    signedSha256: null,
    createdAt: '2026-11-20T09:30:00Z',
    signedAt: null,
    cancelledAt: null,
    signature: {
      id: SIGNATURE_ID,
      status: 'pending',
      signer: { displayName: 'Koffi Adjovi', phoneMasked: '+229********45', hasAccount: true },
      canSign: true,
      createdAt: '2026-11-20T09:30:00Z',
      expiresAt: '2026-11-27T09:30:00Z',
      signedAt: null,
      codeExpiresAt: '2099-01-01T00:00:00Z',
      ...signature,
    },
    ...overrides,
  };
}

export const wallet = (balance: number) => ({
  prepaid: { balance: xof(balance), lastEntryAt: null },
  topUpLimits: { min: xof(500), max: xof(2000000) },
});

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
      id: USER_ID,
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

type FakeReply = { status: number; body?: unknown };
export interface FakeCall {
  method: string;
  path: string;
  query: URLSearchParams;
  body: unknown;
  headers: Record<string, string>;
}

/**
 * « MÉTHODE /chemin » (ou « MÉTHODE /chemin?status=… ») → réponses dans l'ordre (la dernière est
 * répétée). L'envoi au stockage (`PUT` présigné) répond 200.
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
      if (url.hostname === 'stockage.test') return new Response(null, { status: 200 });
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

/** Réponses du service file pour un dépôt (`POST /file/uploads` puis `complete`). */
export function fileRoutes(id = FILE_ID, name = 'facture.pdf') {
  const file = {
    id,
    purpose: 'recovery_evidence',
    fileName: name,
    contentType: 'application/pdf',
    sizeBytes: 1000,
    status: 'pending',
    createdAt: '2026-11-20T09:00:00Z',
    completedAt: null,
  };
  return {
    'POST /api/v1/file/uploads': {
      status: 200,
      body: {
        file,
        upload: {
          url: 'https://stockage.test/depot',
          method: 'PUT',
          headers: { 'Content-Type': 'application/pdf' },
          expiresAt: '2099-01-01T00:00:00Z',
        },
      },
    },
    [`POST /api/v1/file/files/${id}/complete`]: {
      status: 200,
      body: { ...file, status: 'available', completedAt: '2026-11-20T09:00:01Z' },
    },
  };
}

/* ——— Décisions, argent et import (PR 3) ——— */

export const DECISION_ID = '0192f1c4-7a2b-7c3d-8e4f-5a6b7c8d7a01';
export const IMPORT_ID = '0192f1c4-7a2b-7c3d-8e4f-5a6b7c8d7b01';

/** Dossier en cours de recouvrement, à l'étape de la relance amiable. */
export const activeCase = (overrides: Record<string, unknown> = {}) =>
  awaitingFee({
    status: 'active',
    stage: 'amicable',
    acceptedAt: '2026-11-21T09:00:00Z',
    fee: { ...frozen.fee, status: 'paid', paidAt: '2026-11-20T11:00:00Z' },
    nextDeadline: null,
    ...overrides,
  });

export const planPayload = {
  id: '0192f1c4-7a2b-7c3d-8e4f-5a6b7c8d7a11',
  status: 'pending_creditor',
  terms: { firstAmount: xof(50000), firstDueDate: '2026-12-01', rhythm: 'monthly', installmentsCount: 9 },
  total: xof(850000),
  installments: [
    {
      id: null,
      rank: 1,
      dueDate: '2026-12-01',
      amount: xof(50000),
      paidAmount: xof(0),
      status: 'upcoming',
      paidAt: null,
    },
    {
      id: null,
      rank: 2,
      dueDate: '2027-01-01',
      amount: xof(100000),
      paidAmount: xof(0),
      status: 'upcoming',
      paidAt: null,
    },
  ],
  withinScale: false,
  violations: ['duration'],
  proposedBy: 'debtor',
  renegotiation: false,
  documentId: null,
  signedAt: null,
  missedCount: 0,
  createdAt: '2026-11-24T09:00:00Z',
};

export const quotePayload = {
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
  documentId: '0192f1c4-7a2b-7c3d-8e4f-5a6b7c8d7a23',
  validUntil: '2026-12-10T22:59:00Z',
};

export const disputePayload = {
  id: '0192f1c4-7a2b-7c3d-8e4f-5a6b7c8d7a31',
  reason: 'already_paid',
  text: 'J’ai payé en espèces au livreur le 2 septembre.',
  fileIds: ['0192f1c4-7a2b-7c3d-8e4f-5a6b7c8d7a32'],
  status: 'open',
  openedAt: '2026-11-22T09:00:00Z',
  creditorAnswerDueAt: '2026-12-02T09:00:00Z',
  creditorAnswer: null,
  creditorFileIds: [],
  resolutionNote: null,
  resolvedAt: null,
};

/** `RecoveryDecision` : échéancier hors barème en attente par défaut. */
export function decision(overrides: Record<string, unknown> = {}) {
  return {
    id: DECISION_ID,
    caseId: CASE_ID,
    caseNumber: 'RC-000123',
    kind: 'plan_off_scale',
    status: 'pending',
    createdAt: '2026-11-24T09:00:00Z',
    expiresAt: '2026-11-27T09:00:00Z',
    paymentPlan: planPayload,
    settlement: null,
    feeQuote: null,
    dispute: null,
    answeredAt: null,
    ...overrides,
  };
}

export const decisionPage = (decisions: unknown[]) => ({ decisions, nextCursor: null });
