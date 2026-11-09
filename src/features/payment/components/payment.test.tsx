import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { PaymentReturn } from './payment-return';
import { PaymentSimulation } from './payment-simulation';

const push = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push, replace: vi.fn() }),
}));

const PAYMENT_ID = '0192f1c4-7a2b-7c3d-8e4f-5a6b7c8d5001';
const MISSION_ID = '0192f1c4-7a2b-7c3d-8e4f-5a6b7c8d1000';
const INVOICE_ID = '0192f1c4-7a2b-7c3d-8e4f-5a6b7c8d6001';
const PAYMENTS = '/api/v1/payment/payments';
const xof = (amount: number) => ({ amount, currency: 'XOF' as const });

function payment(overrides: Record<string, unknown> = {}) {
  return {
    id: PAYMENT_ID,
    status: 'pending',
    subject: { type: 'cleaning_mission', id: MISSION_ID, part: 'balance', reference: null },
    amount: xof(23800),
    customerId: '0192f1c4-7a2b-7c3d-8e4f-5a6b7c8d9e11',
    organizationId: null,
    method: 'mobile_money_online',
    provider: 'simulated',
    providerReference: 'SIM-1A2B3C4D',
    checkoutUrl: `http://localhost:3010/mon-espace/paiements/simulation?paymentId=${PAYMENT_ID}`,
    failureReason: null,
    createdAt: '2026-11-02T09:00:00Z',
    updatedAt: '2026-11-02T09:00:01Z',
    expiresAt: '2026-11-02T09:30:00Z',
    completedAt: null,
    ...overrides,
  };
}

const errorBody = (code: string, message: string) => ({
  error: { code, message, details: {}, correlationId: 'c-test' },
});

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

beforeEach(() => {
  push.mockReset();
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  vi.useRealTimers();
});

describe('Page de retour', () => {
  it('interroge la gateway jusqu’au statut final, sans rechargement', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const calls = stubGateway({
      [`GET ${PAYMENTS}/${PAYMENT_ID}`]: [
        { status: 200, body: payment() },
        { status: 200, body: payment() },
        { status: 200, body: payment({ status: 'succeeded', completedAt: '2026-11-02T09:01:00Z' }) },
      ],
    });
    render(<PaymentReturn id={PAYMENT_ID} />);
    expect(await screen.findByText(/en attente de confirmation/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Reprendre le paiement' })).toHaveAttribute(
      'href',
      payment().checkoutUrl,
    );
    await act(async () => {
      await vi.advanceTimersByTimeAsync(4000);
    });
    expect(await screen.findByText(/Paiement confirmé/)).toBeInTheDocument();
    expect(screen.getByText('Confirmé le')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Voir la prestation' })).toHaveAttribute(
      'href',
      `/mon-espace/nettoyage/missions/${MISSION_ID}`,
    );
    await act(async () => {
      await vi.advanceTimersByTimeAsync(30000);
    });
    expect(calls).toHaveLength(3);
  });

  it('recharge du portefeuille réussie : bloc du portefeuille, reçu, sans lien en double', async () => {
    const topUp = {
      type: 'wallet_top_up',
      id: '0192f1c4-7a2b-7c3d-8e4f-5a6b7c8d9e11',
      part: null,
      reference: null,
    };
    stubGateway({
      [`GET ${PAYMENTS}/${PAYMENT_ID}`]: {
        status: 200,
        body: payment({ subject: topUp, status: 'succeeded', completedAt: '2026-11-02T09:01:00Z' }),
      },
    });
    render(<PaymentReturn id={PAYMENT_ID} topUpResult={<p>Bloc du portefeuille</p>} />);
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Recharge du portefeuille' }),
    ).toBeInTheDocument();
    expect(screen.getByText('Bloc du portefeuille')).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Reçu de paiement' })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Voir mon portefeuille' })).not.toBeInTheDocument();
  });

  it('recharge échouée : relancer depuis le portefeuille', async () => {
    const topUp = {
      type: 'wallet_top_up',
      id: '0192f1c4-7a2b-7c3d-8e4f-5a6b7c8d9e11',
      part: null,
      reference: null,
    };
    stubGateway({
      [`GET ${PAYMENTS}/${PAYMENT_ID}`]: { status: 200, body: payment({ subject: topUp, status: 'failed' }) },
    });
    render(<PaymentReturn id={PAYMENT_ID} topUpResult={<p>Bloc du portefeuille</p>} />);
    expect(await screen.findByText(/relancer une recharge depuis votre portefeuille/)).toBeInTheDocument();
    expect(screen.queryByText('Bloc du portefeuille')).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Voir mon portefeuille' })).toHaveAttribute(
      'href',
      '/mon-espace/portefeuille',
    );
  });

  it('écart de montant : « Paiement reçu, en cours de vérification »', async () => {
    stubGateway({
      [`GET ${PAYMENTS}/${PAYMENT_ID}`]: {
        status: 200,
        body: payment({
          status: 'amount_mismatch',
          subject: { type: 'billing_invoice', id: INVOICE_ID, part: null, reference: 'FAC-2026-000012' },
        }),
      },
    });
    render(<PaymentReturn id={PAYMENT_ID} />);
    expect(
      await screen.findByText('Paiement reçu, en cours de vérification par l’équipe KSP.'),
    ).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 1, name: 'Facture FAC-2026-000012' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Voir la facture' })).toHaveAttribute(
      'href',
      `/mon-espace/factures/${INVOICE_ID}`,
    );
  });

  it('paiement en vérification (`underReview`) : contact du support mis en avant', async () => {
    stubGateway({
      [`GET ${PAYMENTS}/${PAYMENT_ID}`]: {
        status: 200,
        body: payment({ status: 'amount_mismatch', underReview: true }),
      },
    });
    render(<PaymentReturn id={PAYMENT_ID} />);
    expect(await screen.findByText(/vous ne payez jamais deux fois/)).toBeInTheDocument();
    expect(screen.getAllByText('En vérification').length).toBeGreaterThan(0);
    expect(screen.getByRole('link', { name: 'Contacter le support KSP' })).toHaveAttribute(
      'href',
      '/contact?sujet=paiement',
    );
  });

  it('écart déjà traité par KSP : n’est plus présenté « en vérification »', async () => {
    stubGateway({
      [`GET ${PAYMENTS}/${PAYMENT_ID}`]: {
        status: 200,
        body: payment({ status: 'amount_mismatch', underReview: false }),
      },
    });
    render(<PaymentReturn id={PAYMENT_ID} />);
    expect((await screen.findAllByText('Vérifié par KSP')).length).toBeGreaterThan(0);
    expect(screen.queryByText('En vérification')).toBeNull();
    expect(screen.queryByRole('link', { name: 'Contacter le support KSP' })).toBeNull();
  });

  it('échec, expiration : message clair et réussite tardive possible', async () => {
    stubGateway({
      [`GET ${PAYMENTS}/${PAYMENT_ID}`]: {
        status: 200,
        body: payment({ status: 'expired', failureReason: 'expired', checkoutUrl: null }),
      },
    });
    render(<PaymentReturn id={PAYMENT_ID} />);
    expect(await screen.findByText(/a expiré avant la validation/)).toBeInTheDocument();
    expect(screen.getByText(/confirmé automatiquement dans les 24 heures/)).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Reprendre le paiement' })).not.toBeInTheDocument();
  });

  it('paiement d’un autre compte : introuvable, sans « Réessayer »', async () => {
    stubGateway({
      [`GET ${PAYMENTS}/${PAYMENT_ID}`]: { status: 404, body: errorBody('PAYMENT_NOT_FOUND', 'introuvable') },
    });
    render(<PaymentReturn id={PAYMENT_ID} />);
    expect(await screen.findByText(/Ce paiement est introuvable/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Réessayer' })).not.toBeInTheDocument();
  });
});

describe('Page de paiement simulée', () => {
  it('envoie l’issue choisie puis revient sur la page de retour', async () => {
    const calls = stubGateway({
      [`GET ${PAYMENTS}/${PAYMENT_ID}`]: { status: 200, body: payment() },
      [`POST ${PAYMENTS}/${PAYMENT_ID}/simulate`]: { status: 200, body: payment({ status: 'failed' }) },
    });
    render(<PaymentSimulation id={PAYMENT_ID} />);
    expect(await screen.findByText(/23\s800\sF\sCFA/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Simuler un échec' }));
    await waitFor(() => expect(push).toHaveBeenCalledWith(`/mon-espace/paiements/${PAYMENT_ID}`));
    expect(calls.at(-1)?.body).toEqual({ outcome: 'failed' });
  });

  it('paiement déjà terminé : plus de boutons de simulation', async () => {
    stubGateway({
      [`GET ${PAYMENTS}/${PAYMENT_ID}`]: { status: 200, body: payment({ status: 'succeeded' }) },
    });
    render(<PaymentSimulation id={PAYMENT_ID} />);
    expect(await screen.findByText(/n’est plus en attente/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Simuler un paiement réussi' })).not.toBeInTheDocument();
  });
});
