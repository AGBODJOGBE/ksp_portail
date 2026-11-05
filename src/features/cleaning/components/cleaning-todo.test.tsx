import { render, screen } from '@testing-library/react';
import { session } from '@/lib/api';
import { resetServicesCache } from '@/features/cleaning/api';
import {
  MISSION_ID,
  QUOTE,
  REQUEST_ID,
  SERVICES,
  mission,
  quoteRequest,
  stubGateway,
} from '@/features/cleaning/fake-gateway.test-utils';
import { CleaningOngoing, CleaningTodo } from './cleaning-todo';

function signIn() {
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
    activeContext: { type: 'individual', organizationId: null, organizationName: null },
  });
}

beforeEach(() => {
  resetServicesCache();
  signIn();
});
afterEach(() => {
  vi.unstubAllGlobals();
  session.clear();
});

describe('Nettoyage dans le tableau de bord de Mon espace', () => {
  it('met en avant le devis à étudier et la mission suspendue pour impayés, puis ce que KSP a en cours', async () => {
    stubGateway({
      'GET /api/v1/cleaning/services': { status: 200, body: SERVICES },
      'GET /api/v1/cleaning/quote-requests': {
        status: 200,
        body: {
          data: [
            quoteRequest({ status: 'quote_sent', quote: QUOTE }),
            quoteRequest({ id: '0192f1c4-7a2b-7c3d-8e4f-5a6b7c8d1002', status: 'received' }),
          ],
          nextCursor: null,
        },
      },
      'GET /api/v1/cleaning/missions': {
        status: 200,
        body: {
          data: [
            mission({
              suspension: {
                cause: 'unpaid_interventions',
                causes: ['unpaid_interventions'],
                since: '2026-12-11T09:00:00Z',
                unpaidCount: 1,
              },
            }),
          ],
          nextCursor: null,
        },
      },
    });
    render(
      <>
        <CleaningTodo />
        <CleaningOngoing />
      </>,
    );
    const quote = await screen.findByRole('link', { name: 'Voir et accepter' });
    expect(quote).toHaveAttribute('href', `/mon-espace/nettoyage/demandes/${REQUEST_ID}`);
    const suspended = screen.getByRole('link', { name: 'Voir la mission' });
    expect(suspended).toHaveAttribute('href', `/mon-espace/nettoyage/missions/${MISSION_ID}`);
    // Une mission suspendue n'est pas annoncée comme paiement à régler : la suspension l'explique.
    expect(screen.queryByText('Paiement à régler')).not.toBeInTheDocument();
    // « Prestations en cours » : la demande reçue et la mission, avec leur état.
    expect(await screen.findAllByText('Demande reçue')).not.toHaveLength(0);
  });

  it('annonce un paiement attendu avec son montant, et le prochain passage', async () => {
    stubGateway({
      'GET /api/v1/cleaning/services': { status: 200, body: SERVICES },
      'GET /api/v1/cleaning/quote-requests': { status: 200, body: { data: [], nextCursor: null } },
      'GET /api/v1/cleaning/missions': {
        status: 200,
        body: {
          data: [
            mission({
              payment: {
                plan: { option: 'deposit', timing: 'before', method: 'mobile_money_online' },
                status: 'due',
                total: { amount: 34000, currency: 'XOF' },
                depositPercent: 30,
                depositAmount: { amount: 10200, currency: 'XOF' },
                paid: { amount: 0, currency: 'XOF' },
                payments: [],
              },
            }),
          ],
          nextCursor: null,
        },
      },
    });
    render(<CleaningTodo />);
    expect(await screen.findByText('Paiement à régler')).toBeInTheDocument();
    expect(screen.getByText(/10\s200\sF\sCFA à régler avant le premier passage\./)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Payer' })).toHaveAttribute(
      'href',
      `/mon-espace/nettoyage/missions/${MISSION_ID}#paiement`,
    );
    expect(screen.getByText(/Nos agents interviennent le/)).toBeInTheDocument();
  });

  it('dit quand rien n’attend le client', async () => {
    stubGateway({
      'GET /api/v1/cleaning/services': { status: 200, body: SERVICES },
      'GET /api/v1/cleaning/quote-requests': { status: 200, body: { data: [], nextCursor: null } },
      'GET /api/v1/cleaning/missions': { status: 200, body: { data: [], nextCursor: null } },
    });
    render(<CleaningTodo />);
    expect(await screen.findByText('Rien à faire de votre côté pour le moment.')).toBeInTheDocument();
  });
});
