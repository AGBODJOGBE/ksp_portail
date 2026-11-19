import { render, screen } from '@testing-library/react';
import { session } from '@/lib/api';
import { OrganizationContextGate } from '@/features/identity';
import { billingPaths, billingTexts } from '@/features/billing/texts';
import { InvoiceDetail } from './invoice-detail';

vi.mock('next/navigation', () => ({
  useSearchParams: () => new URLSearchParams(),
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
}));

const xof = (amount: number) => ({ amount, currency: 'XOF' });
const INVOICE_ID = '0192f1c4-7a2b-7c3d-8e4f-5a6b7c8d6001';
const ORG_ID = '0192f1c4-7a2b-7c3d-8e4f-5a6b7c8d9e99';
const INVOICE = `/api/v1/billing/invoices/${INVOICE_ID}`;
const CONTEXT = '/api/v1/identity/context';
const PERSONAL = { type: 'individual', organizationId: null, organizationName: null };
const BUSINESS = { type: 'business', organizationId: ORG_ID, organizationName: 'SARL Bénin Propre' };

const invoice = {
  id: INVOICE_ID,
  number: 'FAC-2026-000012',
  status: 'paid',
  customerId: '0192f1c4-7a2b-7c3d-8e4f-5a6b7c8d9e11',
  organizationId: ORG_ID,
  source: 'cleaning',
  contractId: '0192f1c4-7a2b-7c3d-8e4f-5a6b7c8d1000',
  periodIndex: 1,
  periodStart: '2026-11-01T00:00:00Z',
  periodEnd: '2026-11-30T23:00:00Z',
  lines: [
    { label: 'Nettoyage de bureaux — novembre', quantity: 1, unitPrice: xof(300000), amount: xof(300000) },
  ],
  total: xof(300000),
  paid: xof(300000),
  balance: xof(0),
  issuedAt: '2026-12-01T08:00:00Z',
  dueAt: '2026-12-11T08:00:00Z',
  paidAt: '2026-12-05T08:00:00Z',
  payments: [],
  organization: {
    legalName: 'SARL Bénin Propre',
    address: 'Lot 12, Haie Vive, Cotonou',
    ifu: '3201912345678',
    rccm: null,
  },
};

const error = (code: string, message: string) => ({
  error: { code, message, details: {}, correlationId: 'c-test' },
});

type Route = { status: number; body: unknown };

/** `fetch` remplacé par « MÉTHODE /chemin » ; garde l'ordre des appels et le jeton envoyé. */
function stub(routes: Record<string, Route>) {
  const calls: Array<{ route: string; token: string | undefined }> = [];
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: string | URL, init: RequestInit = {}) => {
      const route = `${init.method ?? 'GET'} ${new URL(String(input)).pathname}`;
      const headers = (init.headers ?? {}) as Record<string, string>;
      calls.push({ route, token: headers.Authorization ?? headers.authorization });
      const response = routes[route];
      if (!response) throw new Error(`Route non simulée : ${route}`);
      return new Response(JSON.stringify(response.body), {
        status: response.status,
        headers: { 'Content-Type': 'application/json' },
      });
    }),
  );
  return calls;
}

function signIn() {
  session.set({
    status: 'authenticated',
    accessToken: 'jeton-personnel',
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
    activeContext: PERSONAL,
  } as Parameters<typeof session.set>[0]);
}

function renderLinked() {
  return render(
    <OrganizationContextGate
      organisation={ORG_ID}
      back={{ href: billingPaths.list, label: billingTexts.back }}
    >
      <InvoiceDetail id={INVOICE_ID} />
    </OrganizationContextGate>,
  );
}

beforeEach(signIn);
afterEach(() => {
  session.clear();
  vi.unstubAllGlobals();
});

describe('facture d’entreprise ouverte par un lien (?organisation=, ADR-050 §8)', () => {
  it('passe dans le contexte de l’entreprise, puis charge la facture avec le nouveau jeton', async () => {
    const calls = stub({
      [`POST ${CONTEXT}`]: {
        status: 200,
        body: {
          accessToken: 'jeton-entreprise',
          accessTokenExpiresAt: '2099-01-01T00:15:00Z',
          activeContext: BUSINESS,
        },
      },
      [`GET ${INVOICE}`]: { status: 200, body: invoice },
    });
    renderLinked();

    expect(await screen.findByRole('heading', { level: 1, name: /FAC-2026-000012/ })).toBeInTheDocument();
    expect(screen.getByText('Vous utilisez maintenant : Entreprise SARL Bénin Propre.')).toBeInTheDocument();
    // La facture n'est demandée qu'après le changement, avec le jeton de l'entreprise.
    expect(calls.map((call) => call.route)).toEqual([`POST ${CONTEXT}`, `GET ${INVOICE}`]);
    expect(calls[1]?.token).toBe('Bearer jeton-entreprise');
    expect(session.get()?.activeContext.organizationId).toBe(ORG_ID);
  });

  it('déjà dans le contexte de l’entreprise : aucun changement, la facture s’affiche', async () => {
    session.switchContext({
      accessToken: 'jeton-entreprise',
      accessTokenExpiresAt: '2099-01-01T00:15:00Z',
      activeContext: BUSINESS as Parameters<typeof session.switchContext>[0]['activeContext'],
    });
    const calls = stub({ [`GET ${INVOICE}`]: { status: 200, body: invoice } });
    renderLinked();

    expect(await screen.findByRole('heading', { level: 1, name: /FAC-2026-000012/ })).toBeInTheDocument();
    expect(calls.map((call) => call.route)).toEqual([`GET ${INVOICE}`]);
    expect(screen.queryByText(/Vous utilisez maintenant/)).toBeNull();
  });

  it('non-membre : message clair et retour à mes factures, sans lire la facture', async () => {
    const calls = stub({
      [`POST ${CONTEXT}`]: {
        status: 404,
        body: error('IDENTITY_ORGANIZATION_NOT_FOUND', 'Organisation introuvable.'),
      },
    });
    renderLinked();

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Page réservée à un compte entreprise' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent(/dont vous n’êtes pas membre/);
    expect(screen.getByRole('link', { name: 'Retour à mes factures' })).toHaveAttribute(
      'href',
      '/mon-espace/factures',
    );
    expect(screen.queryByRole('button', { name: 'Réessayer' })).toBeNull();
    expect(calls.map((call) => call.route)).toEqual([`POST ${CONTEXT}`]);
    // Le compte personnel reste actif.
    expect(session.get()?.activeContext.organizationId).toBeNull();
  });

  it('entreprise suspendue : message de la gateway, sans réessayer', async () => {
    stub({
      [`POST ${CONTEXT}`]: {
        status: 422,
        body: error('IDENTITY_ORGANIZATION_NOT_ACTIVE', 'Ce compte entreprise est suspendu.'),
      },
    });
    renderLinked();

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Compte entreprise indisponible' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('Ce compte entreprise est suspendu.');
    expect(screen.queryByRole('button', { name: 'Réessayer' })).toBeNull();
  });

  it('panne : « Réessayer » relance le changement de contexte', async () => {
    const responses: Route[] = [
      { status: 503, body: error('GATEWAY_SERVICE_UNAVAILABLE', 'Service momentanément indisponible.') },
      {
        status: 200,
        body: {
          accessToken: 'jeton-entreprise',
          accessTokenExpiresAt: '2099-01-01T00:15:00Z',
          activeContext: BUSINESS,
        },
      },
    ];
    const calls = stub({
      get [`POST ${CONTEXT}`]() {
        return responses.length > 1 ? responses.shift()! : responses[0]!;
      },
      [`GET ${INVOICE}`]: { status: 200, body: invoice },
    });
    renderLinked();

    (await screen.findByRole('button', { name: 'Réessayer' })).click();
    expect(await screen.findByRole('heading', { level: 1, name: /FAC-2026-000012/ })).toBeInTheDocument();
    expect(calls.filter((call) => call.route === `POST ${CONTEXT}`)).toHaveLength(2);
  });
});
