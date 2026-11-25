import { render, screen, within } from '@testing-library/react';
import { session } from '@/lib/api';
import { periodLabel } from '@/features/billing/commission-texts';
import { CommissionInvoiceDetail } from './commission-invoice-detail';
import { CommissionInvoiceList, FeeReceiptList } from './commission-invoices';

const INVOICE_ID = '0192f1c4-7a2b-7c3d-8e4f-5a6b7c8d7301';
const CASE_ID = '0192f1c4-7a2b-7c3d-8e4f-5a6b7c8d5000';
const xof = (amount: number) => ({ amount, currency: 'XOF' as const });

/** Facture du contrat (exemple de `GET /billing/commission-invoices`), débit en échec. */
function invoice(overrides: Record<string, unknown> = {}) {
  return {
    id: INVOICE_ID,
    number: 'FCR-2026-000007',
    status: 'pending_payment',
    creditor: { type: 'organization', id: '0192f1c4-7a2b-7c3d-8e4f-5a6b7c8d0000' },
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
      {
        caseId: '0192f1c4-7a2b-7c3d-8e4f-5a6b7c8d5001',
        caseNumber: 'RC-000124',
        collectionId: '0192f1c4-7a2b-7c3d-8e4f-5a6b7c8d5102',
        receivedAt: '2026-11-20T10:00:00Z',
        receivedOn: '2026-11-20',
        source: 'payment_link',
        gross: xof(100000),
        commission: xof(10000),
        settlement: 'deducted',
      },
    ],
    totalCollected: xof(160000),
    commissionDeducted: xof(10000),
    commissionInvoiced: xof(9000),
    commissionTotal: xof(19000),
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
    organization: {
      legalName: 'SARL Bénin Propre',
      address: 'Lot 12, Haie Vive, Cotonou',
      ifu: '3201912345678',
      rccm: 'RB/COT/19 B 1234',
    },
    ...overrides,
  };
}

const receipt = {
  id: '0192f1c4-7a2b-7c3d-8e4f-5a6b7c8d7401',
  number: 'RFD-2026-000012',
  kind: 'case_fee',
  payer: { type: 'organization', id: '0192f1c4-7a2b-7c3d-8e4f-5a6b7c8d0000' },
  caseId: CASE_ID,
  caseNumber: 'RC-000123',
  label: 'Frais de dossier RC-000123',
  amount: xof(25000),
  paidAt: '2026-11-03T09:00:00Z',
  issuedAt: '2026-11-03T09:00:02Z',
  walletTransactionId: '0192f1c4-7a2b-7c3d-8e4f-5a6b7c8d7501',
};

type Reply = { status: number; body: unknown };
function stub(routes: Record<string, Reply>) {
  const calls: URL[] = [];
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: string | URL) => {
      const url = new URL(String(input));
      calls.push(url);
      const reply = routes[url.pathname];
      if (!reply) throw new TypeError(`Route non simulée : ${url.pathname}`);
      return new Response(JSON.stringify(reply.body), {
        status: reply.status,
        headers: { 'Content-Type': 'application/json', 'X-Correlation-Id': 'c-test' },
      });
    }),
  );
  return calls;
}

beforeEach(() =>
  session.set({
    status: 'authenticated',
    accessToken: 'jeton',
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
  } as Parameters<typeof session.set>[0]),
);
afterEach(() => {
  session.clear();
  vi.unstubAllGlobals();
});

describe('factures de commission', () => {
  it('liste : mois, commission HT, reste à débiter, débit en échec et recharge', async () => {
    const calls = stub({
      '/api/v1/billing/commission-invoices': { status: 200, body: { data: [invoice()], nextCursor: null } },
    });
    render(<CommissionInvoiceList />);
    const link = await screen.findByRole('link', { name: 'Commission de novembre 2026' });
    expect(link).toHaveAttribute('href', `/mon-espace/factures/commissions/${INVOICE_ID}`);
    const item = link.closest('li')!;
    expect(item).toHaveTextContent('À régler');
    expect(item).toHaveTextContent('Facture FCR-2026-000007');
    expect(item).toHaveTextContent(/Commission \(HT\)19\s000/);
    expect(item).toHaveTextContent(/il manque 5\s000/);
    expect(within(item).getByRole('link', { name: 'Recharger mon portefeuille' })).toHaveAttribute(
      'href',
      '/mon-espace/portefeuille',
    );
    expect(calls[0]!.searchParams.get('limit')).toBe('10');
  });

  it('détail : en-tête figé, encaissements retenus ou débités, récapitulatif hors taxe', async () => {
    stub({ [`/api/v1/billing/commission-invoices/${INVOICE_ID}`]: { status: 200, body: invoice() } });
    render(<CommissionInvoiceDetail id={INVOICE_ID} />);
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Commission de novembre 2026' }),
    ).toBeInTheDocument();
    expect(screen.getByText('Du 1 novembre 2026 au 30 novembre 2026')).toBeInTheDocument();
    const lines = screen.getByRole('region', { name: 'Encaissements du mois' });
    expect(lines).toHaveTextContent('Reçu directement par vous · Débitée de votre portefeuille');
    expect(lines).toHaveTextContent('Paiement en ligne du débiteur · Retenue à l’encaissement');
    expect(within(lines).getByRole('link', { name: 'Dossier RC-000123' })).toHaveAttribute(
      'href',
      `/mon-espace/recouvrement/dossiers/${CASE_ID}`,
    );
    const totals = screen.getByRole('region', { name: 'Récapitulatif' });
    expect(totals).toHaveTextContent(/Commission totale \(HT\)19\s000/);
    expect(totals).toHaveTextContent('aucune TVA');
    expect(screen.getByText('SARL Bénin Propre')).toBeInTheDocument();
  });

  it('détail introuvable (404) : message, sans « Réessayer »', async () => {
    stub({
      [`/api/v1/billing/commission-invoices/${INVOICE_ID}`]: {
        status: 404,
        body: { error: { code: 'BILLING_INVOICE_NOT_FOUND', message: 'introuvable', details: {} } },
      },
    });
    render(<CommissionInvoiceDetail id={INVOICE_ID} />);
    expect(await screen.findByText(/Cette facture est introuvable/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Réessayer' })).toBeNull();
  });

  it('liste vide ; mois lisible', async () => {
    stub({ '/api/v1/billing/commission-invoices': { status: 200, body: { data: [], nextCursor: null } } });
    render(<CommissionInvoiceList />);
    expect(await screen.findByText(/la première est émise le 1er du mois/)).toBeInTheDocument();
    expect(periodLabel('2026-01')).toBe('Janvier 2026');
  });
});

describe('reçus des frais', () => {
  it('un reçu par débit : libellé, nature, numéro, dossier ; filtre par dossier', async () => {
    const calls = stub({
      '/api/v1/billing/receipts': { status: 200, body: { data: [receipt], nextCursor: null } },
    });
    render(<FeeReceiptList caseId={CASE_ID} />);
    expect(await screen.findByText('Frais de dossier RC-000123')).toBeInTheDocument();
    expect(screen.getByText('Frais de dossier')).toBeInTheDocument();
    expect(screen.getByText(/Reçu RFD-2026-000012/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Dossier RC-000123' })).toHaveAttribute(
      'href',
      `/mon-espace/recouvrement/dossiers/${CASE_ID}`,
    );
    expect(calls[0]!.searchParams.get('caseId')).toBe(CASE_ID);
  });
});
