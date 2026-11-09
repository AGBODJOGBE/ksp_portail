import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { session } from '@/lib/api';
import { TopUpResult } from './top-up-result';
import { redirect } from './use-top-up';
import { WalletPay } from './wallet-pay';
import { WalletSpace } from './wallet-space';

const push = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push, replace: vi.fn() }),
}));

const xof = (amount: number) => ({ amount, currency: 'XOF' as const });
const ORGANIZATION_ID = '0192f1c4-7a2b-7c3d-8e4f-5a6b7c8d0000';
const MISSION_ID = '0192f1c4-7a2b-7c3d-8e4f-5a6b7c8d1000';
const INVOICE_ID = '0192f1c4-7a2b-7c3d-8e4f-5a6b7c8d6001';
const WALLET = '/api/v1/wallet/me';
const CHECKOUT = 'https://process.fedapay.com/recharge-1';

const wallet = (balance: number) => ({
  prepaid: { balance: xof(balance), lastEntryAt: '2026-11-08T09:00:00Z' },
  topUpLimits: { min: xof(500), max: xof(1_000_000) },
});

function line(overrides: Record<string, unknown> = {}) {
  return {
    transactionId: '0192f1c4-7a2b-7c3d-8e4f-5a6b7c8d7001',
    account: 'prepaid',
    kind: 'service_payment',
    direction: 'debit',
    amount: xof(10200),
    balanceAfter: xof(9800),
    reference: 'cleaning:mission',
    description: 'Nettoyage de maison — acompte',
    grossAmount: null,
    commission: null,
    commissionRateBps: null,
    payoutId: null,
    payoutStatus: null,
    reversesTransactionId: null,
    createdAt: '2026-11-08T09:00:00Z',
    object: { service: 'cleaning', objectType: 'cleaning_mission', objectId: MISSION_ID, part: 'deposit' },
    ...overrides,
  };
}

function topUp(overrides: Record<string, unknown> = {}) {
  return {
    paymentId: '0192f1c4-7a2b-7c3d-8e4f-5a6b7c8d5009',
    holder: { type: 'user', id: '0192f1c4-7a2b-7c3d-8e4f-5a6b7c8d9e11' },
    amount: xof(5000),
    status: 'pending',
    checkoutUrl: CHECKOUT,
    expiresAt: '2026-11-09T10:30:00Z',
    ...overrides,
  };
}

const errorBody = (code: string, message: string, details: Record<string, unknown> = {}) => ({
  error: { code, message, details, correlationId: 'c-test' },
});

type Reply = { status: number; body?: unknown };
interface Call {
  method: string;
  path: string;
  query: Record<string, string>;
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
        query: Object.fromEntries(url.searchParams),
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
      ? { type: 'business', organizationId: ORGANIZATION_ID, organizationName: 'SARL Bénin Propre' }
      : { type: 'individual', organizationId: null, organizationName: null },
  });
}

const plain = (text: string | null | undefined) => (text ?? '').replace(/\s/g, ' ');
const to = vi.fn();

beforeEach(() => {
  push.mockReset();
  to.mockReset();
  vi.spyOn(redirect, 'to').mockImplementation(to);
  sessionStorage.clear();
  signIn();
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  session.clear();
});

describe('Mon portefeuille', () => {
  it('solde, relevé lisible avec lien vers la mission, page suivante', async () => {
    const calls = stubGateway({
      [`GET ${WALLET}`]: { status: 200, body: wallet(9800) },
      [`GET ${WALLET}/statement`]: [
        {
          status: 200,
          body: {
            data: [
              line(),
              line({
                transactionId: '0192f1c4-7a2b-7c3d-8e4f-5a6b7c8d7000',
                kind: 'top_up',
                direction: 'credit',
                amount: xof(20000),
                balanceAfter: xof(20000),
                description: 'Recharge Mobile Money',
                object: null,
              }),
            ],
            nextCursor: 'page-2',
          },
        },
        {
          status: 200,
          body: {
            data: [
              line({
                transactionId: '0192f1c4-7a2b-7c3d-8e4f-5a6b7c8d6999',
                kind: 'refund',
                direction: 'credit',
                description: 'Facture FAC-2026-000012 — remboursement',
                object: {
                  service: 'billing',
                  objectType: 'billing_invoice',
                  objectId: INVOICE_ID,
                  part: null,
                },
              }),
            ],
            nextCursor: null,
          },
        },
      ],
    });
    render(<WalletSpace />);
    const balance = await screen.findByRole('region', { name: 'Solde disponible' });
    expect(plain(balance.textContent)).toContain('9 800 F CFA');

    const statement = await screen.findByRole('list');
    expect(within(statement).getByText('Nettoyage de maison — acompte')).toBeInTheDocument();
    expect(within(statement).getByText('Recharge')).toBeInTheDocument();
    expect(plain(within(statement).getAllByText(/Solde après/)[0]?.textContent)).toBe(
      'Solde après : 9 800 F CFA',
    );
    expect(within(statement).getByRole('link', { name: 'Voir la prestation' })).toHaveAttribute(
      'href',
      `/mon-espace/nettoyage/missions/${MISSION_ID}`,
    );
    expect(calls.find((call) => call.path === `${WALLET}/statement`)?.query).toMatchObject({
      account: 'prepaid',
    });

    fireEvent.click(screen.getByRole('button', { name: 'Afficher plus' }));
    expect(await screen.findByRole('link', { name: 'Voir la facture' })).toHaveAttribute(
      'href',
      `/mon-espace/factures/${INVOICE_ID}`,
    );
    expect(screen.getByText('Remboursement')).toBeInTheDocument();
  });

  it('recharge : raccourci ou montant libre, clé d’idempotence, page du prestataire', async () => {
    const calls = stubGateway({
      [`GET ${WALLET}`]: { status: 200, body: wallet(0) },
      [`GET ${WALLET}/statement`]: { status: 200, body: { data: [], nextCursor: null } },
      [`POST ${WALLET}/top-ups`]: [
        {
          status: 503,
          body: errorBody('PAYMENT_PROVIDER_UNAVAILABLE', 'Le service de paiement est indisponible.'),
        },
        { status: 200, body: topUp({ amount: xof(10000) }) },
      ],
    });
    render(<WalletSpace />);
    expect(await screen.findByText('Aucune opération pour le moment.')).toBeInTheDocument();
    const amount = screen.getByLabelText(/Autre montant/);

    // Montant trop faible : refusé avant l'envoi, le champ reçoit le focus.
    fireEvent.change(amount, { target: { value: '100' } });
    fireEvent.click(screen.getByRole('button', { name: 'Recharger' }));
    expect(await screen.findByText(/Le montant minimum d’une recharge est de 500/)).toBeInTheDocument();
    expect(amount).toHaveFocus();

    fireEvent.click(screen.getByRole('button', { name: /10\s000\sF\sCFA/, pressed: false }));
    expect(screen.getByRole('button', { name: /10\s000\sF\sCFA/, pressed: true })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Recharger 10\s000\sF\sCFA/ }));
    expect(await screen.findByRole('alert')).toHaveTextContent(/momentanément indisponible/);
    fireEvent.click(screen.getByRole('button', { name: /Recharger 10\s000\sF\sCFA/ }));
    await waitFor(() => expect(to).toHaveBeenCalledWith(CHECKOUT));

    const posts = calls.filter((call) => call.method === 'POST');
    expect(posts[0]?.body).toEqual({ amount: xof(10000) });
    expect(posts[0]?.headers['Idempotency-Key']).toMatch(/^[A-Za-z0-9_-]{8,100}$/);
    // Prestataire injoignable : même montant, même clé.
    expect(posts[1]?.headers['Idempotency-Key']).toBe(posts[0]?.headers['Idempotency-Key']);
    // Recharge depuis le portefeuille : aucun paiement à reprendre au retour.
    expect(sessionStorage.getItem('ksp:portefeuille:reprise')).toBeNull();
  });

  it('entreprise, membre lecteur : portefeuille de l’entreprise en lecture seule', async () => {
    signIn(true);
    stubGateway({
      [`GET ${WALLET}`]: { status: 200, body: wallet(150000) },
      [`GET ${WALLET}/statement`]: { status: 200, body: { data: [], nextCursor: null } },
      [`GET /api/v1/identity/organizations/${ORGANIZATION_ID}`]: {
        status: 200,
        body: { organization: { id: ORGANIZATION_ID }, role: 'org_viewer', pendingBillingEmail: null },
      },
    });
    render(<WalletSpace />);
    const balance = await screen.findByRole('region', { name: 'Solde de SARL Bénin Propre' });
    expect(plain(balance.textContent)).toContain('150 000 F CFA');
    expect(await screen.findByText(/Vous êtes en lecture seule dans cette entreprise/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Recharger/ })).not.toBeInTheDocument();
  });
});

describe('Payer avec mon portefeuille', () => {
  it('confirmation avec le solde après, puis solde relu annoncé', async () => {
    const calls = stubGateway({
      [`GET ${WALLET}`]: [
        { status: 200, body: wallet(400000) },
        { status: 200, body: wallet(100000) },
      ],
    });
    const pay = vi.fn(async () => ({ id: INVOICE_ID, status: 'paid' }));
    const onPaid = vi.fn();
    render(<WalletPay pay={pay} amount={xof(300000)} onPaid={onPaid} />);
    await waitFor(() => expect(screen.getByText('Solde du portefeuille')).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: 'Payer avec mon portefeuille' }));
    expect(screen.getByText('Confirmer le paiement')).toHaveFocus();
    expect(plain(screen.getByText('Solde après paiement').nextElementSibling?.textContent)).toBe(
      '100 000 F CFA',
    );
    // Annuler ne débite rien.
    fireEvent.click(screen.getByRole('button', { name: 'Annuler' }));
    expect(pay).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Payer avec mon portefeuille' }));
    fireEvent.click(screen.getByRole('button', { name: /Confirmer le paiement de 300\s000\sF\sCFA/ }));
    await waitFor(() => expect(onPaid).toHaveBeenCalled());
    expect(pay).toHaveBeenCalledWith(expect.stringMatching(/^[A-Za-z0-9_-]{8,100}$/));
    expect(plain(onPaid.mock.calls[0]?.[1] as string)).toBe(
      'Paiement de 300 000 F CFA effectué depuis votre portefeuille. Solde restant : 100 000 F CFA.',
    );
    expect(calls.filter((call) => call.path === WALLET)).toHaveLength(3);
  });

  it('solde connu insuffisant : « Recharger X » puis retour sur l’écran du paiement', async () => {
    stubGateway({
      [`GET ${WALLET}`]: { status: 200, body: wallet(1000) },
      [`POST ${WALLET}/top-ups`]: { status: 200, body: topUp({ amount: xof(9200) }) },
    });
    const pay = vi.fn();
    render(
      <WalletPay
        pay={pay}
        amount={xof(10200)}
        returnTo={`/mon-espace/nettoyage/missions/${MISSION_ID}`}
        onPaid={vi.fn()}
      />,
    );
    await waitFor(() => expect(screen.getByText('Solde du portefeuille')).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: 'Payer avec mon portefeuille' }));
    expect(screen.getByText(/il vous manque 9\s200\sF\sCFA/)).toHaveFocus();
    fireEvent.click(screen.getByRole('button', { name: /Recharger 9\s200\sF\sCFA/ }));
    await waitFor(() => expect(to).toHaveBeenCalledWith(CHECKOUT));
    expect(pay).not.toHaveBeenCalled();
    expect(sessionStorage.getItem('ksp:portefeuille:reprise')).toBe(
      `/mon-espace/nettoyage/missions/${MISSION_ID}`,
    );
  });

  it('débit remboursé entre-temps : nouvelle clé au renvoi ; rien à payer : fiche relue', async () => {
    stubGateway({ [`GET ${WALLET}`]: { status: 200, body: wallet(50000) } });
    const { ApiError } = await import('@/lib/api');
    const pay = vi
      .fn()
      .mockRejectedValueOnce(new ApiError(422, 'WALLET_DEBIT_REFUNDED', 'Remboursé.'))
      .mockRejectedValueOnce(new ApiError(422, 'CLEANING_NOTHING_DUE', 'Rien à payer.'));
    const onStale = vi.fn();
    render(<WalletPay pay={pay} amount={xof(10200)} onPaid={vi.fn()} onStale={onStale} />);
    await waitFor(() => expect(screen.getByText('Solde du portefeuille')).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: 'Payer avec mon portefeuille' }));
    fireEvent.click(screen.getByRole('button', { name: /Confirmer le paiement/ }));
    expect(await screen.findByText(/remboursé dans votre portefeuille entre-temps/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Confirmer le paiement/ }));
    expect(await screen.findByText(/Ce montant est déjà réglé/)).toBeInTheDocument();
    expect(onStale).toHaveBeenCalled();
    expect(pay.mock.calls[1]?.[0]).not.toBe(pay.mock.calls[0]?.[0]);
  });

  it('membre lecteur (`AUTH_FORBIDDEN`) : plus de bouton de paiement', async () => {
    stubGateway({ [`GET ${WALLET}`]: { status: 200, body: wallet(50000) } });
    const { ApiError } = await import('@/lib/api');
    const pay = vi.fn().mockRejectedValue(new ApiError(403, 'AUTH_FORBIDDEN', 'Accès refusé.'));
    render(<WalletPay pay={pay} amount={xof(10200)} onPaid={vi.fn()} />);
    fireEvent.click(await screen.findByRole('button', { name: 'Payer avec mon portefeuille' }));
    fireEvent.click(screen.getByRole('button', { name: /Confirmer le paiement/ }));
    expect(await screen.findByText(/Vous êtes en lecture seule/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Payer|Confirmer/ })).not.toBeInTheDocument();
  });
});

describe('Retour d’une recharge', () => {
  it('nouveau solde annoncé et reprise du paiement interrompu', async () => {
    stubGateway({ [`GET ${WALLET}`]: { status: 200, body: wallet(29200) } });
    sessionStorage.setItem('ksp:portefeuille:reprise', `/mon-espace/nettoyage/missions/${MISSION_ID}`);
    render(<TopUpResult />);
    expect(await screen.findByText(/Nouveau solde : 29\s200\sF\sCFA/)).toBeInTheDocument();
    const resume = screen.getByRole('link', { name: 'Reprendre mon paiement' });
    expect(resume).toHaveAttribute('href', `/mon-espace/nettoyage/missions/${MISSION_ID}`);
    fireEvent.click(resume);
    expect(sessionStorage.getItem('ksp:portefeuille:reprise')).toBeNull();
  });

  it('sans paiement à reprendre : lien vers le portefeuille', async () => {
    stubGateway({ [`GET ${WALLET}`]: { status: 200, body: wallet(5000) } });
    render(<TopUpResult />);
    expect(await screen.findByText(/Nouveau solde/)).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Reprendre mon paiement' })).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Voir mon portefeuille' })).toHaveAttribute(
      'href',
      '/mon-espace/portefeuille',
    );
  });
});
