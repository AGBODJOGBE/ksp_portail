import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { session } from '@/lib/api';
import { describeLinkError, isPaymentLinkToken, isPortalSimulation } from '@/features/payment/link';
import { publicPaymentLinkSchema } from '@/features/payment/schemas';
import { ApiError } from '@/lib/api/errors';
import { PaymentLink, linkRedirect } from './payment-link';

const TOKEN = 'Ab3_dE5-gH7iJ9kL1mN3pQ5rS7tU9vW1xY3zA5bC7dE';
const LINK = `/api/v1/payment/links/${TOKEN}`;
const CHECKOUT = 'https://process.fedapay.com/eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9';
const SIMULATED = 'http://localhost:3010/mon-espace/paiements/simulation?paymentId=p-1';
const xof = (amount: number) => ({ amount, currency: 'XOF' as const });

function attempt(overrides: Record<string, unknown> = {}) {
  return {
    id: '0192f1c4-7a2b-7c3d-8e4f-5a6b7c8d5002',
    status: 'pending',
    checkoutUrl: CHECKOUT,
    expiresAt: '2026-11-07T10:30:00Z',
    failureReason: null,
    ...overrides,
  };
}

function link(overrides: Record<string, unknown> = {}) {
  return {
    status: 'active',
    beneficiaryName: 'Pharmacie du Port',
    description: 'Échéance 2 sur 6',
    reference: 'REC-2026-000137',
    amount: xof(45000),
    dueDate: '2026-11-30',
    expiresAt: '2026-12-10T10:00:00Z',
    paidAt: null,
    payment: null,
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
  body: unknown;
  headers: Record<string, string>;
  credentials: RequestCredentials | undefined;
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
        credentials: init.credentials,
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

const plain = (text: string | null | undefined) => (text ?? '').replace(/\s/g, ' ');
const to = vi.fn();

beforeEach(() => {
  to.mockReset();
  vi.spyOn(linkRedirect, 'to').mockImplementation(to);
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  vi.useRealTimers();
  session.clear();
});

describe('logique du lien de paiement', () => {
  it('jeton : 43 caractères base64url, sinon introuvable', () => {
    expect(isPaymentLinkToken(TOKEN)).toBe(true);
    expect(isPaymentLinkToken(TOKEN.slice(1))).toBe(false);
    expect(isPaymentLinkToken(`${TOKEN.slice(1)}/`)).toBe(false);
  });

  it('reconnaît la page de paiement simulée du portail (développement)', () => {
    expect(isPortalSimulation(SIMULATED)).toBe(true);
    expect(isPortalSimulation(CHECKOUT)).toBe(false);
  });

  it('schéma fidèle au contrat : exemple accepté, champ obligatoire manquant refusé', () => {
    expect(publicPaymentLinkSchema.safeParse(link({ payment: attempt() })).success).toBe(true);
    const { reference: _reference, ...missing } = link();
    expect(publicPaymentLinkSchema.safeParse(missing).success).toBe(false);
    expect(
      publicPaymentLinkSchema.safeParse(link({ amount: { amount: 4.5, currency: 'XOF' } })).success,
    ).toBe(false);
  });

  it('refus : introuvable, état périmé, nouvel essai avec la même clé, attente', () => {
    expect(describeLinkError(new ApiError(404, 'PAYMENT_LINK_NOT_FOUND', 'x')).kind).toBe('notFound');
    expect(describeLinkError(new ApiError(409, 'PAYMENT_LINK_ALREADY_PAID', 'Déjà payé.')).kind).toBe(
      'stale',
    );
    expect(describeLinkError(new ApiError(422, 'PAYMENT_LINK_EXPIRED', 'Expiré.')).kind).toBe('stale');
    expect(describeLinkError(new ApiError(503, 'PAYMENT_PROVIDER_UNAVAILABLE', 'Indispo.')).kind).toBe(
      'retry',
    );
    expect(
      describeLinkError(
        new ApiError(429, 'PAYMENT_LINK_TOO_MANY_ATTEMPTS', 'Trop.', { retryAfterSeconds: 30 }),
      ),
    ).toMatchObject({ kind: 'wait', retryAfterSeconds: 30 });
  });
});

describe('Page publique d’un lien de paiement', () => {
  it('jeton mal formé : introuvable, sans appel à la gateway', async () => {
    const calls = stubGateway({});
    render(<PaymentLink token="trop-court" />);
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Lien de paiement introuvable' }),
    ).toBeInTheDocument();
    expect(calls).toHaveLength(0);
  });

  it('jeton inconnu (404) : introuvable, sans « Réessayer »', async () => {
    stubGateway({
      [`GET ${LINK}`]: { status: 404, body: errorBody('PAYMENT_LINK_NOT_FOUND', 'Introuvable.') },
    });
    render(<PaymentLink token={TOKEN} />);
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Lien de paiement introuvable' }),
    ).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Réessayer' })).not.toBeInTheDocument();
  });

  it('panne à la lecture : message et « Réessayer »', async () => {
    stubGateway({
      [`GET ${LINK}`]: [
        { status: 503, body: errorBody('PAYMENT_UNAVAILABLE', 'Service momentanément indisponible.') },
        { status: 200, body: link() },
      ],
    });
    render(<PaymentLink token={TOKEN} />);
    expect(await screen.findByText('Service momentanément indisponible.')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Réessayer' }));
    expect(await screen.findByRole('heading', { level: 1, name: 'Pharmacie du Port' })).toBeInTheDocument();
  });

  it('lien payable : résumé, paiement sans session, clé d’idempotence, redirection vers le prestataire', async () => {
    const calls = stubGateway({
      [`GET ${LINK}`]: { status: 200, body: link() },
      [`POST ${LINK}/pay`]: { status: 200, body: attempt() },
    });
    render(<PaymentLink token={TOKEN} />);
    expect(await screen.findByRole('heading', { level: 1, name: 'Pharmacie du Port' })).toBeInTheDocument();
    expect(screen.getByText('Échéance 2 sur 6')).toBeInTheDocument();
    expect(screen.getByText('REC-2026-000137')).toBeInTheDocument();
    expect(screen.getByText('30 novembre 2026')).toBeInTheDocument();
    expect(plain(screen.getByText(/^45/).textContent)).toBe('45 000 F CFA');

    fireEvent.click(screen.getByRole('button', { name: /^Payer 45\s000\sF\sCFA$/ }));
    await waitFor(() => expect(to).toHaveBeenCalledWith(CHECKOUT));
    const pay = calls.find((call) => call.method === 'POST')!;
    expect(pay.path).toBe(`${LINK}/pay`);
    // Le montant est celui du lien : rien n'est envoyé, aucune session non plus.
    expect(pay.body).toBeUndefined();
    expect(pay.headers['Idempotency-Key']).toMatch(/^[A-Za-z0-9_-]{8,100}$/);
    expect(pay.headers.Authorization).toBeUndefined();
    expect(calls.every((call) => !call.headers.Authorization)).toBe(true);
  });

  it('n’envoie jamais le jeton de session, même connecté', async () => {
    session.set({
      status: 'authenticated',
      accessToken: 'jeton-acces',
      accessTokenExpiresAt: '2099-01-01T00:15:00Z',
      sessionId: 's-1',
      user: {
        id: 'u-1',
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
    const calls = stubGateway({ [`GET ${LINK}`]: { status: 200, body: link() } });
    render(<PaymentLink token={TOKEN} />);
    await screen.findByRole('heading', { level: 1, name: 'Pharmacie du Port' });
    expect(calls[0]?.headers.Authorization).toBeUndefined();
  });

  it('prestataire injoignable : même clé au nouvel essai', async () => {
    const calls = stubGateway({
      [`GET ${LINK}`]: { status: 200, body: link() },
      [`POST ${LINK}/pay`]: [
        {
          status: 503,
          body: errorBody(
            'PAYMENT_PROVIDER_UNAVAILABLE',
            'Le service de paiement est momentanément indisponible.',
          ),
        },
        { status: 200, body: attempt() },
      ],
    });
    render(<PaymentLink token={TOKEN} />);
    fireEvent.click(await screen.findByRole('button', { name: /^Payer/ }));
    expect(
      await screen.findByText('Le service de paiement est momentanément indisponible.'),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /^Payer/ }));
    await waitFor(() => expect(to).toHaveBeenCalledWith(CHECKOUT));
    const keys = calls
      .filter((call) => call.method === 'POST')
      .map((call) => call.headers['Idempotency-Key']);
    expect(keys).toHaveLength(2);
    expect(keys[0]).toBe(keys[1]);
  });

  it('déjà payé entre-temps (409) : la page relit le lien et montre le paiement reçu', async () => {
    stubGateway({
      [`GET ${LINK}`]: [
        { status: 200, body: link() },
        { status: 200, body: link({ status: 'paid', paidAt: '2026-11-18T09:12:00Z' }) },
      ],
      [`POST ${LINK}/pay`]: {
        status: 409,
        body: errorBody('PAYMENT_LINK_ALREADY_PAID', 'Ce paiement a déjà été reçu.'),
      },
    });
    render(<PaymentLink token={TOKEN} />);
    fireEvent.click(await screen.findByRole('button', { name: /^Payer/ }));
    expect(await screen.findByText('Paiement reçu, merci')).toBeInTheDocument();
    expect(screen.getByText('Ce paiement a déjà été reçu.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^Payer/ })).not.toBeInTheDocument();
    expect(to).not.toHaveBeenCalled();
  });

  it('trop d’essais (429) : message avec le délai, bouton désactivé', async () => {
    stubGateway({
      [`GET ${LINK}`]: { status: 200, body: link() },
      [`POST ${LINK}/pay`]: {
        status: 429,
        body: errorBody('PAYMENT_LINK_TOO_MANY_ATTEMPTS', 'Trop de tentatives.', { retryAfterSeconds: 30 }),
      },
    });
    render(<PaymentLink token={TOKEN} />);
    fireEvent.click(await screen.findByRole('button', { name: /^Payer/ }));
    expect(await screen.findByText(/Patientez 30 secondes/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^Payer/ })).toBeDisabled();
  });

  it('retour du prestataire : relit toutes les 3 secondes jusqu’au paiement confirmé', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const calls = stubGateway({
      [`GET ${LINK}`]: [
        { status: 200, body: link({ payment: attempt() }) },
        { status: 200, body: link({ payment: attempt() }) },
        {
          status: 200,
          body: link({
            status: 'paid',
            paidAt: '2026-11-18T09:12:00Z',
            payment: attempt({ status: 'succeeded', checkoutUrl: null }),
          }),
        },
      ],
    });
    render(<PaymentLink token={TOKEN} />);
    expect(await screen.findByText('Paiement en attente de validation')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Reprendre le paiement' })).toHaveAttribute('href', CHECKOUT);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(6500);
    });
    expect(await screen.findByText('Paiement reçu, merci')).toBeInTheDocument();
    expect(screen.getByText('18 novembre 2026 à 10:12')).toBeInTheDocument();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(30000);
    });
    expect(calls).toHaveLength(3);
  });

  it('attente épuisée : « Vérifier à nouveau » relance la lecture', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const calls = stubGateway({ [`GET ${LINK}`]: { status: 200, body: link({ payment: attempt() }) } });
    render(<PaymentLink token={TOKEN} />);
    await screen.findByText('Paiement en attente de validation');
    await act(async () => {
      await vi.advanceTimersByTimeAsync(61000);
    });
    expect(calls).toHaveLength(21);
    fireEvent.click(await screen.findByRole('button', { name: 'Vérifier à nouveau' }));
    await waitFor(() => expect(calls).toHaveLength(22));
  });

  it('dernier essai échoué : explication, puis nouvel essai', async () => {
    stubGateway({
      [`GET ${LINK}`]: {
        status: 200,
        body: link({ payment: attempt({ status: 'failed', checkoutUrl: null, failureReason: 'declined' }) }),
      },
    });
    render(<PaymentLink token={TOKEN} />);
    expect(await screen.findByText(/Le dernier essai n’a pas abouti \(échoué\)/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Réessayer le paiement' })).toBeEnabled();
  });

  it.each([
    ['under_review', 'Paiement en cours de vérification'],
    ['revoked', 'Cette demande de paiement a été annulée'],
    ['expired', 'Ce lien n’est plus valable'],
  ])('lien %s : message, aucun bouton de paiement', async (status, title) => {
    stubGateway({ [`GET ${LINK}`]: { status: 200, body: link({ status }) } });
    render(<PaymentLink token={TOKEN} />);
    expect(await screen.findByText(title)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^Payer/ })).not.toBeInTheDocument();
    const contact = screen.getAllByRole('link', { name: 'Contacter le support KSP' });
    expect(contact[0]).toHaveAttribute('href', '/contact?sujet=paiement');
    if (status === 'under_review') expect(contact).toHaveLength(1);
  });

  it('mode test (prestataire simulé, hors production) : boutons de simulation à la place de la redirection', async () => {
    const pending = link({ payment: attempt({ checkoutUrl: SIMULATED }) });
    const calls = stubGateway({
      [`GET ${LINK}`]: [
        { status: 200, body: link() },
        { status: 200, body: pending },
        {
          status: 200,
          body: link({
            status: 'paid',
            paidAt: '2026-11-18T09:12:00Z',
            payment: attempt({ status: 'succeeded', checkoutUrl: null }),
          }),
        },
      ],
      [`POST ${LINK}/pay`]: { status: 200, body: attempt({ checkoutUrl: SIMULATED }) },
      [`POST ${LINK}/simulate`]: { status: 200, body: attempt({ status: 'succeeded', checkoutUrl: null }) },
    });
    render(<PaymentLink token={TOKEN} />);
    fireEvent.click(await screen.findByRole('button', { name: /^Payer/ }));
    const test = await screen.findByRole('region', { name: 'Mode test' });
    expect(to).not.toHaveBeenCalled();
    fireEvent.click(within(test).getByRole('button', { name: 'Simuler un paiement réussi' }));
    expect(await screen.findByText('Paiement reçu, merci')).toBeInTheDocument();
    expect(calls.find((call) => call.path === `${LINK}/simulate`)?.body).toEqual({ outcome: 'succeeded' });
  });
});
