import { render, screen } from '@testing-library/react';
import { session } from '@/lib/api';
import { OrganizationContextFromSearch } from './lazy';

let search = '';
vi.mock('next/navigation', () => ({
  useSearchParams: () => new URLSearchParams(search),
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
}));

const ORG_ID = '0192f1c4-7a2b-7c3d-8e4f-5a6b7c8d9e99';
const PERSONAL = { type: 'individual', organizationId: null, organizationName: null };
const BUSINESS = { type: 'business', organizationId: ORG_ID, organizationName: 'SARL Bénin Propre' };

function stub(refused = false) {
  const calls: string[] = [];
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: string | URL, init: RequestInit = {}) => {
      calls.push(`${init.method ?? 'GET'} ${new URL(String(input)).pathname}`);
      if (refused) {
        return new Response(
          JSON.stringify({
            error: { code: 'IDENTITY_ORGANIZATION_NOT_FOUND', message: 'Introuvable.', details: {} },
          }),
          { status: 404, headers: { 'Content-Type': 'application/json' } },
        );
      }
      return new Response(
        JSON.stringify({
          accessToken: 'jeton-entreprise',
          accessTokenExpiresAt: '2099-01-01T00:15:00Z',
          activeContext: BUSINESS,
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      );
    }),
  );
  return calls;
}

beforeEach(() => {
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
});

afterEach(() => {
  session.clear();
  vi.unstubAllGlobals();
  search = '';
});

const back = { href: '/mon-espace', label: 'Mon espace KSP' };

describe('organisation lue dans l’adresse d’une page statique (liste des factures)', () => {
  it('?organisation= : passe dans le contexte de l’entreprise avant d’afficher la liste', async () => {
    search = `organisation=${ORG_ID}`;
    const calls = stub();
    render(
      <OrganizationContextFromSearch back={back}>
        <p>Liste des factures</p>
      </OrganizationContextFromSearch>,
    );
    expect(await screen.findByText('Liste des factures')).toBeInTheDocument();
    expect(calls).toEqual(['POST /api/v1/identity/context']);
    expect(session.get()?.activeContext.organizationId).toBe(ORG_ID);
  });

  it('sans organisation dans l’adresse : la liste s’affiche telle quelle', async () => {
    const calls = stub();
    render(
      <OrganizationContextFromSearch back={back}>
        <p>Liste des factures</p>
      </OrganizationContextFromSearch>,
    );
    expect(await screen.findByText('Liste des factures')).toBeInTheDocument();
    expect(calls).toEqual([]);
  });

  it('non-membre : refus sous l’en-tête de la page, sans seconde bande ni second titre de page', async () => {
    search = `organisation=${ORG_ID}`;
    stub(true);
    render(
      <OrganizationContextFromSearch back={back}>
        <p>Liste des factures</p>
      </OrganizationContextFromSearch>,
    );
    expect(
      await screen.findByRole('heading', { level: 2, name: 'Page réservée à un compte entreprise' }),
    ).toBeInTheDocument();
    expect(screen.queryByRole('heading', { level: 1 })).not.toBeInTheDocument();
    expect(screen.queryByText('Liste des factures')).not.toBeInTheDocument();
  });
});
