import { fireEvent, render, screen, within } from '@testing-library/react';
import { session } from '@/lib/api';
import { resetServicesCache } from '@/features/cleaning/api';
import {
  MISSION_ID,
  QUOTE,
  REQUEST_ID,
  SERVICES,
  errorBody,
  mission,
  quoteRequest,
  stubGateway,
} from '@/features/cleaning/fake-gateway.test-utils';
import { shortReference } from '@/features/cleaning/tracking';
import { CleaningTracking, CleaningTrackingSummary } from './tracking-board';

const OTHER_REQUEST = '0192f1c4-7a2b-7c3d-8e4f-5a6b7c8d1002';
const CANCELLED_REQUEST = '0192f1c4-7a2b-7c3d-8e4f-5a6b7c8d1003';

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

/**
 * Un devis à accepter, une demande reçue, une demande annulée et une mission planifiée dont le solde est
 * attendu avant le passage (paiement « avant » : elle attend aussi le client).
 */
function stubSeveral() {
  stubGateway({
    'GET /api/v1/cleaning/services': { status: 200, body: SERVICES },
    'GET /api/v1/cleaning/quote-requests': {
      status: 200,
      body: {
        data: [
          quoteRequest({ status: 'quote_sent', quote: QUOTE }),
          quoteRequest({ id: OTHER_REQUEST, status: 'received', createdAt: '2026-10-25T10:00:00Z' }),
          quoteRequest({ id: CANCELLED_REQUEST, status: 'cancelled', createdAt: '2026-10-20T10:00:00Z' }),
        ],
        nextCursor: null,
      },
    },
    'GET /api/v1/cleaning/missions': { status: 200, body: { data: [mission()], nextCursor: null } },
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

const cards = () => screen.getAllByRole('article');

describe('Suivre ma demande', () => {
  it('montre chaque demande avec son état, sa référence, son fil d’étapes et son lien', async () => {
    stubSeveral();
    render(<CleaningTracking />);
    expect(await screen.findByText('4 demandes')).toBeInTheDocument();
    const quote = cards().find((card) => within(card).queryByText('Devis à étudier'))!;
    expect(within(quote).getByText(`Réf. ${shortReference(REQUEST_ID)}`)).toBeInTheDocument();
    expect(within(quote).getByText('À vous d’agir')).toBeInTheDocument();
    expect(within(quote).getByRole('link', { name: /Voir le détail/ })).toHaveAttribute(
      'href',
      `/mon-espace/nettoyage/demandes/${REQUEST_ID}`,
    );
    expect(within(quote).getByRole('list', { name: /avancement/ })).toBeInTheDocument();
    // Le prochain passage de la mission est annoncé dans les rendez-vous (déplacé de Mon espace).
    expect(screen.getByRole('heading', { name: 'Vos prochains rendez-vous' })).toBeInTheDocument();
    expect(screen.getByText(/Nos agents interviennent le/)).toBeInTheDocument();
  });

  it('filtre par état, avec le nombre de demandes de chaque état', async () => {
    stubSeveral();
    render(<CleaningTracking />);
    await screen.findByText('4 demandes');
    const action = screen.getByRole('button', { name: /Action requise/ });
    expect(action).toHaveTextContent('2');
    fireEvent.click(action);
    expect(action).toHaveAttribute('aria-pressed', 'true');
    expect(cards()).toHaveLength(2);
    expect(screen.getByText('Devis à étudier')).toBeInTheDocument();
    expect(screen.getByText('Un paiement est attendu : réglez-le depuis la mission.')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Annulées/ }));
    expect(cards()).toHaveLength(1);
    expect(screen.getByText('Demande annulée')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /En cours/ }));
    expect(cards()).toHaveLength(1);
    expect(screen.getByText('Demande reçue')).toBeInTheDocument();
  });

  it('cherche par référence ou par prestation, sans tenir compte des accents', async () => {
    stubSeveral();
    render(<CleaningTracking />);
    await screen.findByText('4 demandes');
    const search = screen.getByRole('searchbox', { name: 'Rechercher une demande' });
    fireEvent.change(search, { target: { value: shortReference(MISSION_ID).toLowerCase() } });
    expect(cards()).toHaveLength(1);
    expect(screen.getByText('Planifiée')).toBeInTheDocument();

    fireEvent.change(search, { target: { value: 'zzz' } });
    expect(screen.getByText('Aucune demande ne correspond')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Tout afficher' }));
    expect(cards()).toHaveLength(4);
  });

  it('annonce les autres services comme « Bientôt », sans données', async () => {
    stubSeveral();
    render(<CleaningTracking />);
    await screen.findByText('4 demandes');
    expect(screen.getByRole('button', { name: /Recouvrement/ })).toBeDisabled();
    const cleaning = screen.getByRole('button', { name: /Nettoyage/ });
    fireEvent.click(cleaning);
    expect(cleaning).toHaveAttribute('aria-pressed', 'true');
    expect(cards()).toHaveLength(4);
  });

  it('invite à faire une demande quand il n’y en a aucune', async () => {
    stubGateway({
      'GET /api/v1/cleaning/services': { status: 200, body: SERVICES },
      'GET /api/v1/cleaning/quote-requests': { status: 200, body: { data: [], nextCursor: null } },
      'GET /api/v1/cleaning/missions': { status: 200, body: { data: [], nextCursor: null } },
    });
    render(<CleaningTracking />);
    expect(await screen.findByText('Aucune demande en cours')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Faire une demande/ })).toHaveAttribute('href', '/services');
  });

  it('propose « Réessayer » si la gateway ne répond pas', async () => {
    stubGateway({
      'GET /api/v1/cleaning/services': { status: 200, body: SERVICES },
      'GET /api/v1/cleaning/quote-requests': [
        { status: 503, body: errorBody('GATEWAY_UNAVAILABLE', 'Service indisponible.') },
        { status: 200, body: { data: [quoteRequest()], nextCursor: null } },
      ],
      'GET /api/v1/cleaning/missions': { status: 200, body: { data: [], nextCursor: null } },
    });
    render(<CleaningTracking />);
    fireEvent.click(await screen.findByRole('button', { name: 'Réessayer' }));
    expect(await screen.findByText('1 demande')).toBeInTheDocument();
  });
});

describe('résumé du suivi dans Mon espace', () => {
  it('compte les demandes en cours et celles qui attendent le client, sans la liste', async () => {
    stubSeveral();
    render(<CleaningTrackingSummary />);
    expect(await screen.findByText('3 demandes en cours')).toBeInTheDocument();
    expect(screen.getByText('dont 2 attendent votre action')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Suivre mes demandes/ })).toHaveAttribute(
      'href',
      '/mon-espace/suivi',
    );
    expect(screen.queryByRole('article')).not.toBeInTheDocument();
  });
});
