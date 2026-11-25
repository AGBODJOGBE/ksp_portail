import { scale, xof } from './fixtures.test-utils';

/* Réponses de la gateway pour l'espace du débiteur (contrat, `RecoveryDebtor*`), partagées par les tests. */

export const LINK_TOKEN = 'Ab3_dE5-gH7iJ9kL1mN3pQ5rS7tU9vW1xY3zA5bC7dE';
export const SESSION_TOKEN = 'k3Jd9fQ2mZ7xB1vR8tY4wP6sN0cH5gL2aE9uI3oK7qT';
export const RECEIPT_ID = '0192f1c4-7a2b-7c3d-8e4f-5a6b7c8d7501';
export const EVIDENCE_FILE_ID = '0192f1c4-7a2b-7c3d-8e4f-5a6b7c8d7502';
export const PLAN_ID = '0192f1c4-7a2b-7c3d-8e4f-5a6b7c8d7503';
export const OFFER_ID = '0192f1c4-7a2b-7c3d-8e4f-5a6b7c8d7504';
export const UPLOAD_ID = '0192f1c4-7a2b-7c3d-8e4f-5a6b7c8d7505';
export const DISPUTE_ID = '0192f1c4-7a2b-7c3d-8e4f-5a6b7c8d7506';
export const PAYMENT_URL = 'https://ksp.bj/payer/Zz9_yY8-xX7wW6vV5uU4tT3sS2rR1qQ0pP9oO8nN7mM';

export const access = (overrides: Record<string, unknown> = {}) => ({
  creditorName: 'Pharmacie du Port',
  phoneMasked: '+229 •• •• 45',
  linkExpiresAt: '2099-12-20T10:00:00Z',
  ...overrides,
});

export const codeSent = (overrides: Record<string, unknown> = {}) => ({
  channel: 'whatsapp',
  codeExpiresAt: '2099-11-25T09:10:00Z',
  retryAfterSeconds: 60,
  ...overrides,
});

export const debtorSession = (overrides: Record<string, unknown> = {}) => ({
  sessionToken: SESSION_TOKEN,
  sessionExpiresAt: '2099-11-25T09:30:00Z',
  ...overrides,
});

export const offer = (overrides: Record<string, unknown> = {}) => ({
  id: OFFER_ID,
  payNow: xof(120000),
  waived: xof(15000),
  discountBps: 1111,
  validUntil: '2099-12-05T22:59:00Z',
  status: 'proposed',
  ...overrides,
});

export const plan = (overrides: Record<string, unknown> = {}) => ({
  id: PLAN_ID,
  status: 'proposed',
  terms: { firstAmount: xof(35000), firstDueDate: '2099-12-01', rhythm: 'monthly', installmentsCount: 2 },
  total: xof(135000),
  installments: [
    {
      id: null,
      rank: 1,
      dueDate: '2099-12-01',
      amount: xof(35000),
      paidAmount: xof(0),
      status: 'upcoming',
      paidAt: null,
    },
    {
      id: null,
      rank: 2,
      dueDate: '2100-01-01',
      amount: xof(50000),
      paidAmount: xof(0),
      status: 'upcoming',
      paidAt: null,
    },
    {
      id: null,
      rank: 3,
      dueDate: '2100-02-01',
      amount: xof(50000),
      paidAmount: xof(0),
      status: 'upcoming',
      paidAt: null,
    },
  ],
  withinScale: true,
  violations: [],
  proposedBy: 'debtor',
  renegotiation: false,
  documentId: '0192f1c4-7a2b-7c3d-8e4f-5a6b7c8d7507',
  signedAt: null,
  missedCount: 0,
  createdAt: '2026-11-25T09:05:00Z',
  ...overrides,
});

export const dispute = (overrides: Record<string, unknown> = {}) => ({
  id: DISPUTE_ID,
  reason: 'already_paid',
  text: 'Facture déjà réglée par virement le 12 octobre.',
  fileIds: [],
  status: 'open',
  openedAt: '2026-11-25T09:10:00Z',
  creditorAnswerDueAt: '2026-12-05T09:10:00Z',
  creditorAnswer: null,
  creditorFileIds: [],
  resolutionNote: null,
  resolvedAt: null,
  ...overrides,
});

export const debtorCaseBody = (overrides: Record<string, unknown> = {}) => ({
  caseNumber: 'RC-000123',
  creditorName: 'Pharmacie du Port',
  nature: 'unpaid_invoice',
  references: ['FA-2026-014', 'FA-2026-015'],
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
    { amount: xof(20000), paidAt: '2026-11-10T09:00:00Z', channel: 'online', receiptDocumentId: RECEIPT_ID },
  ],
  documents: [
    { documentId: null, fileId: EVIDENCE_FILE_ID, label: 'Facture FA-2026-014', kind: 'evidence' },
    { documentId: RECEIPT_ID, fileId: null, label: 'Reçu du 10 novembre', kind: 'receipt' },
  ],
  plan: null,
  settlementOffer: null,
  planScale: scale(),
  status: 'active',
  disputes: [],
  pendingPaymentUrl: null,
  settlementCertificateDocumentId: null,
  ...overrides,
});
