import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { PayButton, redirect } from './pay-button';
import { PaymentList } from './payment-list';
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

const to = vi.fn();
beforeEach(() => {
  push.mockReset();
  to.mockReset();
  vi.spyOn(redirect, 'to').mockImplementation(to);
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  vi.useRealTimers();
});

describe('Bouton « Payer par Mobile Money »', () => {
  it('envoie l’objet sans montant, avec une clé d’idempotence, puis ouvre la page du prestataire', async () => {
    const calls = stubGateway({ [`POST ${PAYMENTS}`]: { status: 200, body: payment() } });
    render(
      <PayButton
        subject={{ subjectType: 'cleaning_mission', subjectId: MISSION_ID, part: 'deposit' }}
        label="Payer l’acompte par Mobile Money"
        amount={xof(10200)}
      />,
    );
    expect(screen.getByText(/Montant à payer/)).toHaveTextContent(/10\s200\sF\sCFA/);
    fireEvent.click(screen.getByRole('button', { name: 'Payer l’acompte par Mobile Money' }));
    await waitFor(() => expect(to).toHaveBeenCalledWith(payment().checkoutUrl));
    expect(calls[0]?.body).toEqual({
      subjectType: 'cleaning_mission',
      subjectId: MISSION_ID,
      part: 'deposit',
    });
    expect(calls[0]?.headers['Idempotency-Key']).toMatch(/^[A-Za-z0-9_-]{8,100}$/);
  });

  it('garde la même clé quand le prestataire est injoignable, puis réussit au renvoi', async () => {
    const calls = stubGateway({
      [`POST ${PAYMENTS}`]: [
        {
          status: 503,
          body: errorBody('PAYMENT_PROVIDER_UNAVAILABLE', 'Le service de paiement est indisponible.'),
        },
        {
          status: 200,
          body: payment({
            subject: { type: 'billing_invoice', id: INVOICE_ID, part: null, reference: 'FAC-1' },
          }),
        },
      ],
    });
    render(
      <PayButton subject={{ subjectType: 'billing_invoice', subjectId: INVOICE_ID }} amount={xof(300000)} />,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Payer par Mobile Money' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(/momentanément indisponible/);
    fireEvent.click(screen.getByRole('button', { name: 'Payer par Mobile Money' }));
    await waitFor(() => expect(to).toHaveBeenCalled());
    expect(calls[0]?.body).toEqual({ subjectType: 'billing_invoice', subjectId: INVOICE_ID });
    expect(calls[1]?.headers['Idempotency-Key']).toBe(calls[0]?.headers['Idempotency-Key']);
  });

  it('montant déjà réglé : message clair et relecture de la fiche', async () => {
    stubGateway({
      [`POST ${PAYMENTS}`]: { status: 422, body: errorBody('PAYMENT_NOTHING_DUE', 'Il n’y a rien à payer.') },
    });
    const onStale = vi.fn();
    render(
      <PayButton
        subject={{ subjectType: 'cleaning_mission', subjectId: MISSION_ID, part: 'balance' }}
        amount={null}
        onStale={onStale}
      />,
    );
    expect(screen.getByText(/calculé par KSP/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Payer par Mobile Money' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Ce montant est déjà réglé');
    expect(onStale).toHaveBeenCalled();
    expect(to).not.toHaveBeenCalled();
  });

  it('limite d’appels (429) et objet hors périmètre : messages traduits', async () => {
    stubGateway({
      [`POST ${PAYMENTS}`]: [
        { status: 429, body: errorBody('GATEWAY_RATE_LIMITED', 'Too many') },
        { status: 404, body: errorBody('PAYMENT_SUBJECT_NOT_FOUND', 'introuvable') },
      ],
    });
    render(
      <PayButton subject={{ subjectType: 'billing_invoice', subjectId: INVOICE_ID }} amount={xof(1000)} />,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Payer par Mobile Money' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(/Trop de tentatives de paiement/);
    fireEvent.click(screen.getByRole('button', { name: 'Payer par Mobile Money' }));
    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent(/compte actif/));
  });

  it('paiement déjà terminé avec cette clé : page de retour', async () => {
    stubGateway({
      [`POST ${PAYMENTS}`]: { status: 200, body: payment({ status: 'succeeded', checkoutUrl: null }) },
    });
    render(
      <PayButton subject={{ subjectType: 'billing_invoice', subjectId: INVOICE_ID }} amount={xof(1000)} />,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Payer par Mobile Money' }));
    await waitFor(() => expect(push).toHaveBeenCalledWith(`/mon-espace/paiements/${PAYMENT_ID}`));
    expect(to).not.toHaveBeenCalled();
  });
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

describe('Mes paiements', () => {
  it('liste les paiements du compte actif avec leur statut', async () => {
    stubGateway({
      [`GET ${PAYMENTS}`]: {
        status: 200,
        body: {
          data: [
            payment({ status: 'succeeded' }),
            payment({
              id: 'b',
              status: 'failed',
              subject: { type: 'billing_invoice', id: INVOICE_ID, part: null, reference: 'FAC-1' },
            }),
          ],
          nextCursor: null,
        },
      },
    });
    render(<PaymentList />);
    expect(await screen.findByRole('link', { name: 'Solde de la prestation' })).toHaveAttribute(
      'href',
      `/mon-espace/paiements/${PAYMENT_ID}`,
    );
    expect(screen.getByRole('link', { name: 'Facture FAC-1' })).toBeInTheDocument();
    expect(screen.getByText('Réussi')).toBeInTheDocument();
    expect(screen.getByText('Échoué')).toBeInTheDocument();
  });

  it('liste vide : où payer', async () => {
    stubGateway({ [`GET ${PAYMENTS}`]: { status: 200, body: { data: [], nextCursor: null } } });
    render(<PaymentList />);
    expect(await screen.findByText('Aucun paiement en ligne pour le moment.')).toBeInTheDocument();
  });
});
