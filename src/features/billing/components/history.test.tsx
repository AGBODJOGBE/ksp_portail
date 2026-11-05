import { fireEvent, render, screen, within } from '@testing-library/react';
import { session } from '@/lib/api';
import { BillingHistory } from './history';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
}));

const xof = (amount: number) => ({ amount, currency: 'XOF' });
const INVOICE_ID = '0192f1c4-7a2b-7c3d-8e4f-5a6b7c8d6001';
const PAYMENT_ID = '0192f1c4-7a2b-7c3d-8e4f-5a6b7c8d5001';

function invoice(overrides: Record<string, unknown> = {}) {
  return {
    id: INVOICE_ID,
    number: 'FAC-2026-000012',
    status: 'overdue',
    customerId: '0192f1c4-7a2b-7c3d-8e4f-5a6b7c8d9e11',
    organizationId: null,
    source: 'cleaning',
    contractId: '0192f1c4-7a2b-7c3d-8e4f-5a6b7c8d1000',
    periodIndex: 1,
    periodStart: '2026-11-01T00:00:00Z',
    periodEnd: '2026-11-30T23:00:00Z',
    lines: [],
    total: xof(300000),
    paid: xof(100000),
    balance: xof(200000),
    issuedAt: '2026-10-01T08:00:00Z',
    dueAt: '2026-10-11T08:00:00Z',
    paidAt: null,
    payments: [],
    organization: null,
    ...overrides,
  };
}

function payment(overrides: Record<string, unknown> = {}) {
  return {
    id: PAYMENT_ID,
    status: 'succeeded',
    subject: { type: 'cleaning_mission', id: 'm', part: 'deposit', reference: null },
    amount: xof(10200),
    customerId: '0192f1c4-7a2b-7c3d-8e4f-5a6b7c8d9e11',
    organizationId: null,
    method: 'mobile_money_online',
    provider: 'simulated',
    providerReference: 'SIM-1A2B3C4D',
    checkoutUrl: null,
    failureReason: null,
    createdAt: '2026-11-02T09:00:00Z',
    updatedAt: '2026-11-02T09:00:01Z',
    expiresAt: '2026-11-02T09:30:00Z',
    completedAt: '2026-11-02T09:01:00Z',
    ...overrides,
  };
}

/** `fetch` remplacé : réponse selon le chemin. */
function stub(routes: Record<string, unknown>) {
  const calls: string[] = [];
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: string | URL) => {
      const url = new URL(String(input));
      calls.push(`${url.pathname}${url.search}`);
      const body = routes[url.pathname];
      return new Response(JSON.stringify(body), {
        status: body ? 200 : 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }),
  );
  return calls;
}

beforeEach(() => {
  session.set({
    status: 'authenticated',
    accessToken: 'jeton-acces',
    accessTokenExpiresAt: '2099-01-01T00:15:00Z',
    sessionId: 's',
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
  });
});
afterEach(() => {
  vi.unstubAllGlobals();
  session.clear();
});

describe('Factures et paiements', () => {
  it('fusionne factures et paiements, le plus récent d’abord, avec reste dû, échéance et reçu', async () => {
    stub({
      '/api/v1/billing/invoices': { data: [invoice()], nextCursor: null },
      '/api/v1/payment/payments': { data: [payment()], nextCursor: null },
    });
    render(<BillingHistory />);
    const history = await screen.findByRole('region', { name: 'Historique' });
    const rows = within(history).getAllByRole('listitem');
    // Le paiement (2 novembre) précède la facture (1er octobre).
    expect(rows[0]).toHaveTextContent('Acompte de la prestation');
    expect(rows[1]).toHaveTextContent('Facture FAC-2026-000012');
    expect(within(rows[1]!).getByText(/200\s000\sF\sCFA/)).toBeInTheDocument();
    expect(within(rows[1]!).getByText(/Échéance : /)).toBeInTheDocument();
    expect(within(rows[0]!).getByRole('link', { name: /Voir le reçu/ })).toHaveAttribute(
      'href',
      `/mon-espace/paiements/${PAYMENT_ID}#recu`,
    );
    expect(screen.getByText(/Une facture attend votre règlement/)).toBeInTheDocument();
    // Paiement direct depuis l'historique : le bouton du prestataire apparaît, avec le reste dû.
    fireEvent.click(within(rows[1]!).getByRole('button', { name: 'Payer cette facture' }));
    expect(await within(rows[1]!).findByRole('button', { name: /Payer/ })).toBeInTheDocument();
  });

  it('historique vide et rien à régler', async () => {
    stub({
      '/api/v1/billing/invoices': { data: [], nextCursor: null },
      '/api/v1/payment/payments': { data: [], nextCursor: null },
    });
    render(<BillingHistory />);
    expect(await screen.findByText('Rien à régler pour le moment.')).toBeInTheDocument();
    expect(screen.getByText('Aucune facture ni aucun paiement pour le moment.')).toBeInTheDocument();
  });
});
