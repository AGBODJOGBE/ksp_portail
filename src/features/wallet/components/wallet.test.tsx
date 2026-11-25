import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
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
const EMPTY_PAGE: Reply = { status: 200, body: { data: [], nextCursor: null } };
interface Call {
  method: string;
  path: string;
  query: Record<string, string>;
  body: unknown;
  headers: Record<string, string>;
}

/**
 * Gateway simulée : « MÉTHODE /chemin » → réponses dans l'ordre (la dernière est répétée). « Mes retraits »
 * (affiché sur tout portefeuille) répond une liste vide quand le test ne le précise pas.
 */
function stubGateway(routes: Record<string, Reply | Reply[]>) {
  const calls: Call[] = [];
  const queues = new Map(
    Object.entries({ [`GET ${WALLET}/withdrawals`]: EMPTY_PAGE, ...routes }).map(([key, value]) => [
      key,
      [value].flat(),
    ]),
  );
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
  // Démonter avant de vider la session : sinon l'écran encore monté se relit sans session, avec le vrai
  // `fetch`, et sa réponse tardive peut vider la session du test suivant (écran remonté en plein test).
  cleanup();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  session.clear();
});

function payout(overrides: Record<string, unknown> = {}) {
  return {
    id: '0192f1c4-7a2b-7c3d-8e4f-5a6b7c8d8001',
    holder: { type: 'user', id: '0192f1c4-7a2b-7c3d-8e4f-5a6b7c8d9e11' },
    amount: xof(36000),
    status: 'completed',
    paymentPayoutId: '0192f1c4-7a2b-7c3d-8e4f-5a6b7c8d8501',
    beneficiaryOperator: 'mtn',
    beneficiaryPhoneMasked: '+229 •• •• 45',
    createdAt: '2026-11-17T09:00:00Z',
    updatedAt: '2026-11-17T09:05:00Z',
    completedAt: '2026-11-17T10:30:00Z',
    failedAt: null,
    ...overrides,
  };
}

describe('Reversements', () => {
  const creditor = {
    ...wallet(0),
    totalCollected: xof(180000),
    payoutsInProgress: xof(15000),
    totalPaidOut: xof(36000),
  };
  const empty = { status: 200, body: { data: [], nextCursor: null } };

  it('créancier : cumuls de la gateway, reversements avec numéro masqué, page suivante', async () => {
    const calls = stubGateway({
      [`GET ${WALLET}`]: { status: 200, body: creditor },
      [`GET ${WALLET}/statement`]: empty,
      [`GET ${WALLET}/payouts`]: [
        {
          status: 200,
          body: {
            data: [
              payout(),
              payout({
                id: '0192f1c4-7a2b-7c3d-8e4f-5a6b7c8d8002',
                status: 'failed',
                beneficiaryOperator: 'moov',
                amount: xof(15000),
                completedAt: null,
                failedAt: '2026-11-16T10:30:00Z',
              }),
            ],
            nextCursor: '0192f1c4-7a2b-7c3d-8e4f-5a6b7c8d8002',
          },
        },
        {
          status: 200,
          body: {
            data: [
              payout({ id: '0192f1c4-7a2b-7c3d-8e4f-5a6b7c8d8003', status: 'submitted', completedAt: null }),
            ],
            nextCursor: null,
          },
        },
      ],
    });
    render(<WalletSpace />);
    const section = await screen.findByRole('region', { name: 'Reversements' });
    expect(plain(section.textContent)).toContain('Déjà reversé36 000 F CFA');
    expect(plain(section.textContent)).toContain('En cours15 000 F CFA');
    expect(await within(section).findByText('Vers MTN +229 •• •• 45')).toBeInTheDocument();
    expect(within(section).getByText('Versé')).toBeInTheDocument();
    expect(within(section).getByText('Échoué')).toBeInTheDocument();
    expect(within(section).getByText(/le montant est revenu à votre solde/)).toBeInTheDocument();
    fireEvent.click(within(section).getByRole('button', { name: 'Afficher plus' }));
    expect(await within(section).findByText('En cours', { selector: 'span' })).toBeInTheDocument();
    const reads = calls.filter((call) => call.path === `${WALLET}/payouts`);
    expect(reads[0]?.query).toMatchObject({ limit: '10' });
    expect(reads[1]?.query).toMatchObject({ cursor: '0192f1c4-7a2b-7c3d-8e4f-5a6b7c8d8002' });
  });

  it('client sans fonds à reverser : ni rubrique ni lecture des reversements', async () => {
    const calls = stubGateway({
      [`GET ${WALLET}`]: {
        status: 200,
        body: { ...wallet(9800), totalCollected: xof(0), payoutsInProgress: xof(0), totalPaidOut: xof(0) },
      },
      [`GET ${WALLET}/statement`]: empty,
    });
    render(<WalletSpace />);
    await screen.findByRole('region', { name: 'Solde disponible' });
    await screen.findByText('Aucune opération pour le moment.');
    expect(screen.queryByRole('region', { name: 'Reversements' })).not.toBeInTheDocument();
    expect(calls.some((call) => call.path === `${WALLET}/payouts`)).toBe(false);
  });

  it('reversements illisibles : message et « Réessayer », le reste de l’écran reste affiché', async () => {
    stubGateway({
      [`GET ${WALLET}`]: { status: 200, body: creditor },
      [`GET ${WALLET}/statement`]: empty,
      [`GET ${WALLET}/payouts`]: [
        { status: 503, body: errorBody('WALLET_UNAVAILABLE', 'Portefeuille momentanément indisponible.') },
        { status: 200, body: { data: [payout()], nextCursor: null } },
      ],
    });
    render(<WalletSpace />);
    const section = await screen.findByRole('region', { name: 'Reversements' });
    expect(await within(section).findByText('Portefeuille momentanément indisponible.')).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Solde disponible' })).toBeInTheDocument();
    fireEvent.click(within(section).getByRole('button', { name: 'Réessayer' }));
    expect(await within(section).findByText('Vers MTN +229 •• •• 45')).toBeInTheDocument();
  });
});

describe('Mon portefeuille', () => {
  it('solde, relevé lisible, lien vers une facture seulement, page suivante', async () => {
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
    // Mission du Nettoyage v1 : plus d'écran, donc pas de lien.
    expect(within(statement).queryAllByRole('link')).toHaveLength(0);
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
        returnTo={`/mon-espace/factures/${INVOICE_ID}`}
        onPaid={vi.fn()}
      />,
    );
    await waitFor(() => expect(screen.getByText('Solde du portefeuille')).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: 'Payer avec mon portefeuille' }));
    expect(screen.getByText(/il vous manque 9\s200\sF\sCFA/)).toHaveFocus();
    fireEvent.click(screen.getByRole('button', { name: /Recharger 9\s200\sF\sCFA/ }));
    await waitFor(() => expect(to).toHaveBeenCalledWith(CHECKOUT));
    expect(pay).not.toHaveBeenCalled();
    expect(sessionStorage.getItem('ksp:portefeuille:reprise')).toBe(`/mon-espace/factures/${INVOICE_ID}`);
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
    sessionStorage.setItem('ksp:portefeuille:reprise', `/mon-espace/factures/${INVOICE_ID}`);
    render(<TopUpResult />);
    expect(await screen.findByText(/Nouveau solde : 29\s200\sF\sCFA/)).toBeInTheDocument();
    const resume = screen.getByRole('link', { name: 'Reprendre mon paiement' });
    expect(resume).toHaveAttribute('href', `/mon-espace/factures/${INVOICE_ID}`);
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

function withdrawal(overrides: Record<string, unknown> = {}) {
  return {
    id: '0192f1c4-7a2b-7c3d-8e4f-5a6b7c8d9001',
    holder: { type: 'user', id: '0192f1c4-7a2b-7c3d-8e4f-5a6b7c8d9e11' },
    amount: xof(30000),
    status: 'requested',
    beneficiaryOperator: 'moov',
    beneficiaryPhoneMasked: '+229 •• •• 46',
    requestedBy: '0192f1c4-7a2b-7c3d-8e4f-5a6b7c8d9e11',
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
    ...overrides,
  };
}

const prepaid = (balance: number, inProgress = 0) => ({
  holder: { type: 'user', id: '0192f1c4-7a2b-7c3d-8e4f-5a6b7c8d9e11' },
  balance: xof(balance),
  lastEntryAt: '2026-11-25T09:00:00Z',
  ...(inProgress ? { withdrawalsInProgress: xof(inProgress) } : {}),
});

describe('Retirer vers Mobile Money', () => {
  const empty = { status: 200, body: { data: [], nextCursor: null } };

  it('saisie préremplie, contrôles, récapitulatif, envoi idempotent, solde et « Mes retraits » relus', async () => {
    const calls = stubGateway({
      [`GET ${WALLET}`]: { status: 200, body: wallet(30000) },
      [`GET ${WALLET}/statement`]: empty,
      [`GET ${WALLET}/withdrawals`]: [
        empty,
        { status: 200, body: { data: [withdrawal()], nextCursor: null } },
      ],
      [`POST ${WALLET}/withdrawals`]: [
        { status: 503, body: errorBody('WALLET_UNAVAILABLE', 'Portefeuille momentanément indisponible.') },
        { status: 201, body: { withdrawal: withdrawal(), wallet: prepaid(0, 30000), created: true } },
      ],
    });
    render(<WalletSpace />);
    const section = await screen.findByRole('region', { name: 'Retirer vers Mobile Money' });
    // Numéro et nom repris de la session, modifiables.
    expect(within(section).getByLabelText(/Numéro Mobile Money/)).toHaveValue('+229 01 97 00 00 45');
    expect(within(section).getByLabelText(/Nom du titulaire/)).toHaveValue('Koffi Adjovi');
    expect(await screen.findByText('Aucun retrait pour le moment.')).toBeInTheDocument();

    // Montant au-delà du solde et opérateur manquant : refusés avant l'envoi, focus sur le montant.
    const amount = within(section).getByLabelText(/Montant à retirer/);
    fireEvent.change(amount, { target: { value: '50 000' } });
    fireEvent.click(within(section).getByRole('button', { name: 'Vérifier ma demande' }));
    expect(
      within(section).getByText(/dépasse votre solde disponible \(30\s000\sF\sCFA\)/),
    ).toBeInTheDocument();
    expect(within(section).getByText('Choisissez l’opérateur du compte Mobile Money.')).toBeInTheDocument();
    expect(amount).toHaveFocus();

    // Numéro local, sans indicatif : la forme envoyée est montrée sous le champ.
    fireEvent.click(within(section).getByRole('button', { name: /Tout retirer/ }));
    fireEvent.click(within(section).getByRole('radio', { name: 'Moov' }));
    fireEvent.change(within(section).getByLabelText(/Numéro Mobile Money/), {
      target: { value: '01 97 00 00 46' },
    });
    expect(plain(within(section).getByText(/Numéro utilisé/).textContent)).toBe(
      'Numéro utilisé : +229 01 97 00 00 46.',
    );
    fireEvent.click(within(section).getByRole('button', { name: 'Vérifier ma demande' }));

    // Récapitulatif : rien n'est envoyé avant la confirmation.
    expect(within(section).getByText('Vérifiez votre demande')).toHaveFocus();
    expect(plain(within(section).getByText('Vers').nextElementSibling?.textContent)).toBe(
      'Moov +229 01 97 00 00 46',
    );
    expect(calls.some((call) => call.method === 'POST')).toBe(false);
    fireEvent.click(within(section).getByRole('button', { name: /Confirmer le retrait de 30\s000\sF\sCFA/ }));
    expect(await within(section).findByText('Portefeuille momentanément indisponible.')).toBeInTheDocument();
    fireEvent.click(within(section).getByRole('button', { name: /Confirmer le retrait/ }));
    expect(
      await within(section).findByText(/Demande de retrait de 30\s000\sF\sCFA enregistrée/),
    ).toHaveFocus();
    expect(within(section).getByText(/Nouveau solde : 0\sF\sCFA/)).toBeInTheDocument();

    const posts = calls.filter((call) => call.method === 'POST');
    expect(posts[0]?.body).toEqual({
      amount: xof(30000),
      beneficiary: { phone: '+2290197000046', operator: 'moov', name: 'Koffi Adjovi' },
    });
    expect(posts[0]?.headers['Idempotency-Key']).toMatch(/^[A-Za-z0-9_-]{8,100}$/);
    // Service injoignable : même saisie, même clé (un seul retrait).
    expect(posts[1]?.headers['Idempotency-Key']).toBe(posts[0]?.headers['Idempotency-Key']);

    // Solde de la réponse (retenue faite) et « Mes retraits » relu.
    const balance = screen.getByRole('region', { name: 'Solde disponible' });
    expect(plain(balance.textContent)).toContain('En cours de retrait : 30 000 F CFA, déjà déduit du solde.');
    const list = screen.getByRole('region', { name: 'Mes retraits' });
    expect(await within(list).findByText('Vers Moov +229 •• •• 46')).toBeInTheDocument();
    expect(within(list).getByText('Demandé')).toBeInTheDocument();
    expect(within(list).getByText('KSP vérifie votre demande.')).toBeInTheDocument();

    // Solde vidé par la demande : plus rien à retirer.
    fireEvent.click(within(section).getByRole('button', { name: 'Faire une autre demande' }));
    expect(within(section).getByText(/Votre solde est vide/)).toBeInTheDocument();
  });

  it('clé neuve quand la saisie change ; solde insuffisant : message, portefeuille relu', async () => {
    const calls = stubGateway({
      [`GET ${WALLET}`]: [
        { status: 200, body: wallet(20000) },
        { status: 200, body: wallet(5000) },
      ],
      [`GET ${WALLET}/statement`]: empty,
      [`POST ${WALLET}/withdrawals`]: [
        { status: 503, body: errorBody('WALLET_UNAVAILABLE', 'Indisponible.') },
        {
          status: 422,
          body: errorBody('WALLET_INSUFFICIENT_FUNDS', 'Solde insuffisant.', {
            balance: xof(5000),
            missing: xof(5000),
          }),
        },
      ],
    });
    render(<WalletSpace />);
    const section = await screen.findByRole('region', { name: 'Retirer vers Mobile Money' });
    fireEvent.change(within(section).getByLabelText(/Montant à retirer/), { target: { value: '15000' } });
    fireEvent.click(within(section).getByRole('radio', { name: 'MTN' }));
    fireEvent.click(within(section).getByRole('button', { name: 'Vérifier ma demande' }));
    fireEvent.click(within(section).getByRole('button', { name: /Confirmer le retrait de 15\s000/ }));
    expect(await within(section).findByText('Indisponible.')).toBeInTheDocument();

    fireEvent.click(within(section).getByRole('button', { name: 'Modifier' }));
    fireEvent.change(within(section).getByLabelText(/Montant à retirer/), { target: { value: '10000' } });
    fireEvent.click(within(section).getByRole('button', { name: 'Vérifier ma demande' }));
    fireEvent.click(within(section).getByRole('button', { name: /Confirmer le retrait de 10\s000/ }));
    expect(
      await within(section).findByText(/Solde insuffisant : il vous manque 5\s000\sF\sCFA/),
    ).toBeInTheDocument();
    const posts = calls.filter((call) => call.method === 'POST');
    expect(posts[1]?.headers['Idempotency-Key']).not.toBe(posts[0]?.headers['Idempotency-Key']);
    // Le solde est relu sur la gateway.
    await waitFor(() =>
      expect(plain(screen.getByRole('region', { name: 'Solde disponible' }).textContent)).toContain(
        '5 000 F CFA',
      ),
    );
  });

  it('numéro refusé par la gateway : retour à la saisie, erreur sous le champ', async () => {
    stubGateway({
      [`GET ${WALLET}`]: { status: 200, body: wallet(20000) },
      [`GET ${WALLET}/statement`]: empty,
      [`POST ${WALLET}/withdrawals`]: {
        status: 400,
        body: errorBody(
          'WALLET_VALIDATION_FAILED',
          'Numéro béninois au format international attendu (+229…).',
          { field: 'beneficiary.phone' },
        ),
      },
    });
    render(<WalletSpace />);
    const section = await screen.findByRole('region', { name: 'Retirer vers Mobile Money' });
    fireEvent.change(within(section).getByLabelText(/Montant à retirer/), { target: { value: '5000' } });
    fireEvent.click(within(section).getByRole('radio', { name: 'Celtiis' }));
    fireEvent.click(within(section).getByRole('button', { name: 'Vérifier ma demande' }));
    fireEvent.click(within(section).getByRole('button', { name: /Confirmer le retrait/ }));
    expect(await within(section).findByText(/format international attendu/)).toBeInTheDocument();
    expect(within(section).getByLabelText(/Numéro Mobile Money/)).toHaveAttribute('aria-invalid', 'true');
  });

  it('numéro étranger refusé avant l’envoi ; solde vide : rien à retirer', async () => {
    stubGateway({
      [`GET ${WALLET}`]: [
        { status: 200, body: wallet(8000) },
        { status: 200, body: wallet(0) },
      ],
      [`GET ${WALLET}/statement`]: empty,
    });
    const { unmount } = render(<WalletSpace />);
    const section = await screen.findByRole('region', { name: 'Retirer vers Mobile Money' });
    fireEvent.change(within(section).getByLabelText(/Numéro Mobile Money/), {
      target: { value: '+33 6 12 34 56 78' },
    });
    fireEvent.click(within(section).getByRole('button', { name: 'Vérifier ma demande' }));
    expect(within(section).getByText(/Indiquez un numéro béninois à 10 chiffres/)).toBeInTheDocument();
    unmount();

    render(<WalletSpace />);
    const emptied = await screen.findByRole('region', { name: 'Retirer vers Mobile Money' });
    expect(within(emptied).getByText(/Votre solde est vide/)).toBeInTheDocument();
    expect(within(emptied).queryByRole('button', { name: 'Vérifier ma demande' })).toBeNull();
  });

  it('entreprise : un membre suit les retraits mais ne peut pas en demander', async () => {
    signIn(true);
    stubGateway({
      [`GET ${WALLET}`]: { status: 200, body: wallet(150000) },
      [`GET ${WALLET}/statement`]: empty,
      [`GET ${WALLET}/withdrawals`]: {
        status: 200,
        body: {
          data: [
            withdrawal({
              status: 'rejected',
              rejectedAt: '2026-11-20T10:00:00Z',
              rejectionReason: 'Titulaire du compte différent de l’entreprise.',
            }),
            withdrawal({
              id: '0192f1c4-7a2b-7c3d-8e4f-5a6b7c8d9002',
              status: 'completed',
              beneficiaryOperator: 'mtn',
              completedAt: '2026-11-18T10:00:00Z',
            }),
            withdrawal({
              id: '0192f1c4-7a2b-7c3d-8e4f-5a6b7c8d9003',
              status: 'failed',
              failedAt: '2026-11-17T10:00:00Z',
            }),
          ],
          nextCursor: null,
        },
      },
      [`GET /api/v1/identity/organizations/${ORGANIZATION_ID}`]: {
        status: 200,
        body: { organization: { id: ORGANIZATION_ID }, role: 'org_member', pendingBillingEmail: null },
      },
    });
    render(<WalletSpace />);
    const section = await screen.findByRole('region', { name: 'Retirer vers Mobile Money' });
    expect(within(section).getByText(/Seuls les administrateurs de l’entreprise/)).toBeInTheDocument();
    expect(within(section).queryByRole('button', { name: 'Vérifier ma demande' })).toBeNull();
    const list = screen.getByRole('region', { name: 'Mes retraits' });
    expect(await within(list).findByText('Refusé')).toBeInTheDocument();
    expect(within(list).getByText(/Motif : Titulaire du compte différent/)).toBeInTheDocument();
    expect(within(list).getByText(/Refusé le .* : le montant est revenu à votre solde/)).toBeInTheDocument();
    expect(within(list).getByText('Versé')).toBeInTheDocument();
    expect(within(list).getByText(/Échec du virement le/)).toBeInTheDocument();
  });

  it('entreprise, administrateur : formulaire de retrait proposé', async () => {
    signIn(true);
    stubGateway({
      [`GET ${WALLET}`]: { status: 200, body: wallet(150000) },
      [`GET ${WALLET}/statement`]: empty,
      [`GET /api/v1/identity/organizations/${ORGANIZATION_ID}`]: {
        status: 200,
        body: { organization: { id: ORGANIZATION_ID }, role: 'org_admin', pendingBillingEmail: null },
      },
    });
    render(<WalletSpace />);
    const section = await screen.findByRole('region', { name: 'Retirer vers Mobile Money' });
    expect(within(section).getByRole('button', { name: 'Vérifier ma demande' })).toBeInTheDocument();
  });

  it('relevé : natures du retrait et crédit KSP, lien vers une séance du Nettoyage', async () => {
    const SESSION_ID = '0192f1c4-7a2b-7c3d-8e4f-5a6b7c8d7101';
    stubGateway({
      [`GET ${WALLET}`]: { status: 200, body: wallet(9800) },
      [`GET ${WALLET}/statement`]: {
        status: 200,
        body: {
          data: [
            line({ kind: 'withdrawal_hold', description: 'Retrait vers Mobile Money', object: null }),
            line({
              transactionId: '0192f1c4-7a2b-7c3d-8e4f-5a6b7c8d7002',
              kind: 'withdrawal_release',
              direction: 'credit',
              description: 'Retrait refusé',
              object: null,
            }),
            line({
              transactionId: '0192f1c4-7a2b-7c3d-8e4f-5a6b7c8d7003',
              kind: 'service_credit',
              direction: 'credit',
              description: 'Geste commercial',
              object: null,
            }),
            line({
              transactionId: '0192f1c4-7a2b-7c3d-8e4f-5a6b7c8d7004',
              description: 'Séance 3/15 — PN-2026-000012',
              object: {
                service: 'cleaning',
                objectType: 'cleaning_session',
                objectId: SESSION_ID,
                part: null,
              },
            }),
          ],
          nextCursor: null,
        },
      },
    });
    render(<WalletSpace />);
    const statement = await screen.findByRole('region', { name: 'Relevé' });
    expect(await within(statement).findByText('Retrait demandé')).toBeInTheDocument();
    expect(within(statement).getByText('Retrait rendu')).toBeInTheDocument();
    expect(within(statement).getByText('Crédit KSP')).toBeInTheDocument();
    expect(within(statement).getByRole('link', { name: 'Voir la séance' })).toHaveAttribute(
      'href',
      `/mon-espace/nettoyage/seances/${SESSION_ID}`,
    );
    // Le prépayé est désormais retirable (ADR-055 décision 8).
    expect(screen.getByText(/retirable vers Mobile Money/)).toBeInTheDocument();
    expect(screen.queryByText(/n’est pas retirable/)).toBeNull();
  });
});
