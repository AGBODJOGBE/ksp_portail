import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { session } from '@/lib/api';
import { BillingPreferences } from './billing-preferences';
import { InvoiceDetail } from './invoice-detail';
import { redirect, resetMobileMoneyPending } from './invoice-mobile-money';

vi.mock('next/navigation', () => ({
  useSearchParams: () => new URLSearchParams(''),
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
}));

const xof = (amount: number) => ({ amount, currency: 'XOF' as const });
const INVOICE_ID = '0192f1c4-7a2b-7c3d-8e4f-5a6b7c8d6101';
const ORG_ID = '0192f1c4-7a2b-7c3d-8e4f-5a6b7c8d0a01';
const INVOICE = `/api/v1/billing/invoices/${INVOICE_ID}`;
const PREFERENCES = '/api/v1/billing/preferences';
const CHECKOUT = 'https://process.fedapay.com/facture-1';
const errorBody = (code: string, message: string, details: Record<string, unknown> = {}) => ({
  error: { code, message, details, correlationId: 'c-test' },
});
const NOT_SERVED = { status: 404, body: errorBody('GATEWAY_ROUTE_NOT_FOUND', "Cette adresse n'existe pas.") };

/** Facture v2 telle que la gateway la renverra : champs v1 vides, champs v2 renseignés. */
function invoiceV2(overrides: Record<string, unknown> = {}) {
  return {
    id: INVOICE_ID,
    number: 'FAC-2026-000101',
    status: 'pending_payment',
    customerId: '0192f1c4-7a2b-7c3d-8e4f-5a6b7c8d9e11',
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
      {
        label: 'Frais de visite déduits',
        quantity: 1,
        unitPrice: xof(-5000),
        amount: xof(-5000),
        kind: 'visit_fee_deduction',
      },
    ],
    total: xof(20000),
    paid: xof(0),
    balance: xof(20000),
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
    creditNotes: [
      {
        id: '0192f1c4-7a2b-7c3d-8e4f-5a6b7c8d6201',
        number: 'AV-2026-000003',
        invoiceId: INVOICE_ID,
        invoiceNumber: 'FAC-2026-000101',
        customerId: '0192f1c4-7a2b-7c3d-8e4f-5a6b7c8d9e11',
        organizationId: null,
        lines: [{ label: 'Retard de l’équipe', quantity: 1, unitPrice: xof(5000), amount: xof(5000) }],
        total: xof(5000),
        reason: 'Équipe arrivée avec une heure de retard.',
        issuedBy: 'service:cleaning',
        issuedAt: '2026-11-13T09:00:00Z',
        appliedToBalance: xof(5000),
        creditedToWallet: xof(0),
      },
    ],
    ...overrides,
  };
}

type Reply = { status: number; body?: unknown };
interface Call {
  method: string;
  path: string;
  body: unknown;
  headers: Record<string, string>;
}

/** Gateway simulée : « MÉTHODE /chemin » → réponses dans l'ordre (la dernière est répétée). */
function stubGateway(routes: Record<string, Reply | Reply[]>) {
  const calls: Call[] = [];
  const queues = new Map(Object.entries(routes).map(([key, value]) => [key, [value].flat()]));
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: string | URL, init: RequestInit = {}) => {
      const url = new URL(String(input));
      const method = init.method ?? 'GET';
      calls.push({
        method,
        path: url.pathname,
        body: typeof init.body === 'string' ? (JSON.parse(init.body) as unknown) : undefined,
        headers: { ...(init.headers as Record<string, string>) },
      });
      const queue = queues.get(`${method} ${url.pathname}`);
      if (!queue?.length) throw new TypeError(`Route non simulée : ${method} ${url.pathname}`);
      const reply = (queue.length > 1 ? queue.shift() : queue[0])!;
      return new Response(reply.body === undefined ? null : JSON.stringify(reply.body), {
        status: reply.status,
        headers: { 'Content-Type': 'application/json' },
      });
    }),
  );
  return calls;
}

const WALLET = { status: 200, body: { prepaid: { balance: xof(50000), lastEntryAt: null } } };
const plain = (text: string | null | undefined) => (text ?? '').replace(/\s/g, ' ');
const to = vi.fn();

function signIn(organization = false) {
  session.set({
    status: 'authenticated',
    accessToken: 'jeton-acces',
    accessTokenExpiresAt: '2099-01-01T00:15:00Z',
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
    activeContext: organization
      ? { type: 'business', organizationId: ORG_ID, organizationName: 'SARL Bénin Propre' }
      : { type: 'individual', organizationId: null, organizationName: null },
  });
}

beforeEach(() => {
  to.mockReset();
  vi.spyOn(redirect, 'to').mockImplementation(to);
  resetMobileMoneyPending();
  signIn();
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  session.clear();
});

describe('Facture v2', () => {
  it('facture de séance : nature, séance, lieu, date, lignes détaillées, numéros, avoir ; ni mois ni période vides', async () => {
    stubGateway({
      [`GET ${INVOICE}`]: { status: 200, body: invoiceV2() },
      'GET /api/v1/wallet/me': WALLET,
    });
    render(<InvoiceDetail id={INVOICE_ID} />);
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Facture FAC-2026-000101' }),
    ).toBeInTheDocument();
    expect(
      screen.getByText('Facture de séance · Séance 3/15 · Bureau Haie Vive · Prestation du 12 novembre 2026'),
    ).toBeInTheDocument();
    expect(screen.queryByText(/Mois \d+ du contrat|Mois facturé|Période du/)).toBeNull();
    expect(screen.queryByText(/au prorata des jours facturables/)).toBeNull();

    const details = screen.getByRole('region', { name: 'Détail' });
    expect(within(details).getByText('DN-2026-000045')).toBeInTheDocument();
    expect(within(details).getByRole('link', { name: 'Mes demandes de nettoyage' })).toHaveAttribute(
      'href',
      '/mon-espace/nettoyage/demandes',
    );
    expect(within(details).getByRole('link', { name: 'Mes programmes de nettoyage' })).toHaveAttribute(
      'href',
      '/mon-espace/nettoyage/programmes',
    );
    // La nature n'est pas répétée quand le libellé la dit déjà (« Séance 3/15 — … »).
    expect(
      within(details).getAllByText('12 novembre 2026 · Bureau Haie Vive · PN-2026-000012')[0],
    ).toBeInTheDocument();
    expect(within(details).getAllByText('Frais de visite déduits')[0]).toBeInTheDocument();

    const notes = screen.getByRole('region', { name: 'Avoirs' });
    expect(within(notes).getByText('Avoir AV-2026-000003')).toBeInTheDocument();
    expect(within(notes).getByText('Équipe arrivée avec une heure de retard.')).toBeInTheDocument();
    expect(plain(within(notes).getByText('Déduit du reste à régler').nextElementSibling?.textContent)).toBe(
      '5 000 F CFA',
    );
    expect(within(notes).queryByText('Crédité sur le portefeuille')).toBeNull();
  });

  it('facture v2 renvoyée aujourd’hui par la gateway (sans champs v2, période vide) : affichée sans case vide', async () => {
    const {
      kind: _kind,
      requestNumber: _request,
      programNumber: _program,
      sessionRank: _rank,
      placeLabel: _place,
      serviceDate: _date,
      creditNotes: _notes,
      ...today
    } = invoiceV2({ lines: [{ label: 'Séance', quantity: 1, unitPrice: xof(20000), amount: xof(20000) }] });
    stubGateway({ [`GET ${INVOICE}`]: { status: 200, body: today }, 'GET /api/v1/wallet/me': WALLET });
    render(<InvoiceDetail id={INVOICE_ID} />);
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Facture FAC-2026-000101' }),
    ).toBeInTheDocument();
    expect(screen.queryByText(/Mois|Période du|Invalid/)).toBeNull();
    expect(screen.queryByRole('region', { name: 'Avoirs' })).toBeNull();
    expect(screen.getByText('Origine')).toBeInTheDocument();
  });

  it('Mobile Money pas encore servi : « Bientôt disponible », le portefeuille reste proposé, puis d’emblée', async () => {
    const calls = stubGateway({
      [`GET ${INVOICE}`]: { status: 200, body: invoiceV2() },
      'GET /api/v1/wallet/me': WALLET,
      [`POST ${INVOICE}/pay-mobile-money`]: NOT_SERVED,
    });
    const { unmount } = render(<InvoiceDetail id={INVOICE_ID} />);
    const momo = await screen.findByRole('region', { name: 'Payer par Mobile Money' });
    fireEvent.click(within(momo).getByRole('button', { name: /Payer 20\s000\sF\sCFA par Mobile Money/ }));
    const pending = await screen.findByText('Bientôt disponible');
    expect(pending.closest('[data-backend-pending]')).not.toBeNull();
    expect(await screen.findByRole('button', { name: 'Payer avec mon portefeuille' })).toBeInTheDocument();
    expect(to).not.toHaveBeenCalled();
    unmount();

    // Autre facture du même onglet : la section est d'emblée « Bientôt disponible », sans nouvel essai.
    render(<InvoiceDetail id={INVOICE_ID} />);
    expect(await screen.findByText('Bientôt disponible')).toBeInTheDocument();
    expect(calls.filter((call) => call.method === 'POST')).toHaveLength(1);
  });

  it('Mobile Money servi : clé gardée pendant les renvois, page du prestataire', async () => {
    const calls = stubGateway({
      [`GET ${INVOICE}`]: { status: 200, body: invoiceV2() },
      'GET /api/v1/wallet/me': WALLET,
      [`POST ${INVOICE}/pay-mobile-money`]: [
        {
          status: 503,
          body: errorBody('PAYMENT_PROVIDER_UNAVAILABLE', 'Prestataire injoignable.'),
        },
        {
          status: 200,
          body: {
            paymentId: '0192f1c4-7a2b-7c3d-8e4f-5a6b7c8d5101',
            amount: xof(20000),
            checkoutUrl: null,
            expiresAt: '2026-11-25T10:30:00Z',
            created: true,
          },
        },
        {
          status: 200,
          body: {
            paymentId: '0192f1c4-7a2b-7c3d-8e4f-5a6b7c8d5101',
            amount: xof(20000),
            checkoutUrl: CHECKOUT,
            expiresAt: '2026-11-25T10:30:00Z',
            created: false,
          },
        },
      ],
    });
    render(<InvoiceDetail id={INVOICE_ID} />);
    const momo = await screen.findByRole('region', { name: 'Payer par Mobile Money' });
    const button = () => within(momo).getByRole('button', { name: /par Mobile Money/ });
    fireEvent.click(button());
    expect(await within(momo).findByText(/momentanément indisponible/)).toBeInTheDocument();
    fireEvent.click(button());
    expect(await within(momo).findByText(/pas encore prête/)).toBeInTheDocument();
    fireEvent.click(button());
    await waitFor(() => expect(to).toHaveBeenCalledWith(CHECKOUT));

    const posts = calls.filter((call) => call.method === 'POST');
    expect(posts).toHaveLength(3);
    expect(posts[0]?.body).toBeUndefined();
    expect(posts[0]?.headers['Idempotency-Key']).toMatch(/^[A-Za-z0-9_-]{8,100}$/);
    expect(new Set(posts.map((post) => post.headers['Idempotency-Key'])).size).toBe(1);
  });

  it('Mobile Money : facture déjà réglée entre-temps, message et fiche relue ; lecteur : pas de bouton', async () => {
    const calls = stubGateway({
      [`GET ${INVOICE}`]: [
        { status: 200, body: invoiceV2() },
        { status: 200, body: invoiceV2({ status: 'paid', paid: xof(20000), balance: xof(0) }) },
      ],
      'GET /api/v1/wallet/me': WALLET,
      [`POST ${INVOICE}/pay-mobile-money`]: {
        status: 422,
        body: errorBody('BILLING_INVALID_TRANSITION', 'Facture déjà payée.'),
      },
    });
    render(<InvoiceDetail id={INVOICE_ID} />);
    const momo = await screen.findByRole('region', { name: 'Payer par Mobile Money' });
    fireEvent.click(within(momo).getByRole('button', { name: /par Mobile Money/ }));
    await waitFor(() => expect(calls.filter((call) => call.path === INVOICE)).toHaveLength(2));
    expect(await screen.findByText('Payée')).toBeInTheDocument();
    expect(screen.queryByRole('region', { name: 'Payer par Mobile Money' })).toBeNull();
  });

  it('entreprise, membre lecteur : la section explique, sans bouton', async () => {
    signIn(true);
    stubGateway({
      [`GET ${INVOICE}`]: { status: 200, body: invoiceV2() },
      'GET /api/v1/wallet/me': WALLET,
      [`GET /api/v1/identity/organizations/${ORG_ID}`]: {
        status: 200,
        body: { organization: { id: ORG_ID }, role: 'org_viewer', pendingBillingEmail: null },
      },
    });
    render(<InvoiceDetail id={INVOICE_ID} />);
    const momo = await screen.findByRole('region', { name: 'Payer par Mobile Money' });
    expect(await within(momo).findByText(/lecture seule/)).toBeInTheDocument();
    expect(within(momo).queryByRole('button')).toBeNull();
  });
});

describe('Prélèvement automatique (fiche entreprise)', () => {
  const preferences = (autoDebit: boolean) => ({
    organizationId: ORG_ID,
    autoDebit,
    updatedBy: autoDebit ? '0192f1c4-7a2b-7c3d-8e4f-5a6b7c8d9e11' : null,
    updatedAt: autoDebit ? '2026-11-25T09:00:00Z' : null,
  });
  const role = (value: string) => ({
    [`GET /api/v1/identity/organizations/${ORG_ID}`]: {
      status: 200,
      body: { organization: { id: ORG_ID }, role: value, pendingBillingEmail: null },
    },
  });

  it('entreprise qui n’est pas le compte actif : invitation à l’utiliser, aucune lecture', async () => {
    const calls = stubGateway({});
    render(<BillingPreferences organizationId={ORG_ID} />);
    expect(screen.getByText(/Utilisez ce compte entreprise/)).toBeInTheDocument();
    expect(calls).toHaveLength(0);
  });

  it('route pas encore servie : « Bientôt disponible »', async () => {
    signIn(true);
    stubGateway({ [`GET ${PREFERENCES}`]: NOT_SERVED, ...role('org_admin') });
    render(<BillingPreferences organizationId={ORG_ID} />);
    const section = await screen.findByText('Bientôt disponible');
    expect(section.closest('[data-backend-pending]')).toHaveTextContent('Prélèvement automatique');
  });

  it('administrateur : active après confirmation, puis désactive', async () => {
    signIn(true);
    const calls = stubGateway({
      [`GET ${PREFERENCES}`]: { status: 200, body: preferences(false) },
      [`PATCH ${PREFERENCES}`]: [
        { status: 200, body: preferences(true) },
        { status: 200, body: preferences(false) },
      ],
      ...role('org_admin'),
    });
    render(<BillingPreferences organizationId={ORG_ID} />);
    expect(await screen.findByText('Désactivé')).toBeInTheDocument();
    fireEvent.click(await screen.findByRole('button', { name: 'Activer le prélèvement automatique' }));
    expect(screen.getByText('Activer le prélèvement automatique ?')).toHaveFocus();
    expect(calls.some((call) => call.method === 'PATCH')).toBe(false);
    fireEvent.click(screen.getByRole('button', { name: 'Oui, activer' }));
    expect(await screen.findByText('Prélèvement automatique activé.')).toBeInTheDocument();
    expect(screen.getByText('Activé')).toBeInTheDocument();
    expect(screen.getByText(/Dernière modification le 25 novembre 2026/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Désactiver le prélèvement automatique' }));
    expect(await screen.findByText('Prélèvement automatique désactivé.')).toBeInTheDocument();
    expect(calls.filter((call) => call.method === 'PATCH').map((call) => call.body)).toEqual([
      { autoDebit: true },
      { autoDebit: false },
    ]);
  });

  it('membre : lecture seule du réglage', async () => {
    signIn(true);
    stubGateway({ [`GET ${PREFERENCES}`]: { status: 200, body: preferences(true) }, ...role('org_member') });
    render(<BillingPreferences organizationId={ORG_ID} />);
    expect(await screen.findByText('Activé')).toBeInTheDocument();
    expect(await screen.findByText(/Seul un administrateur/)).toBeInTheDocument();
    expect(screen.queryByRole('button')).toBeNull();
  });
});
