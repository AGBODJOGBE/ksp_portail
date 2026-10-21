import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { session } from '@/lib/api';
import { errorBody, NO_SESSION, sessionBody, stubGateway } from '@/features/identity/fake-gateway.test-utils';
import { AccountOverview } from './account-overview';
import { RequireSession } from './require-session';

const replace = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace }),
  usePathname: () => '/mon-espace',
}));

const REFRESH = 'POST /api/v1/identity/token/refresh';
const LOGOUT = 'POST /api/v1/identity/logout';

function renderSpace() {
  return render(
    <RequireSession>
      <AccountOverview />
      <p>Contenu réservé</p>
    </RequireSession>,
  );
}

beforeEach(() => {
  replace.mockReset();
  session.clear();
  window.history.replaceState(null, '', '/mon-espace?onglet=factures');
});

afterEach(() => vi.unstubAllGlobals());

describe('garde de « Mon espace KSP »', () => {
  it('renouvelle la session en silence puis affiche l’espace', async () => {
    const { calls } = stubGateway({
      [REFRESH]: { status: 200, body: sessionBody({ profileIncomplete: false }) },
    });
    renderSpace();

    expect(screen.getByRole('status')).toHaveTextContent('Chargement de votre espace…');
    expect(await screen.findByRole('heading', { level: 1, name: 'Bonjour Koffi' })).toBeInTheDocument();
    expect(screen.getByText('Contenu réservé')).toBeInTheDocument();
    expect(screen.getByText('+2290197000045')).toBeInTheDocument();
    expect(calls[0]).toMatchObject({
      method: 'POST',
      path: '/api/v1/identity/token/refresh',
      body: undefined,
    });
    expect(replace).not.toHaveBeenCalled();
  });

  it('envoie vers la connexion sans session, avec retour à la page demandée', async () => {
    stubGateway({ [REFRESH]: NO_SESSION });
    renderSpace();

    await waitFor(() =>
      expect(replace).toHaveBeenCalledWith('/connexion?retour=%2Fmon-espace%3Fonglet%3Dfactures'),
    );
    expect(screen.queryByText('Contenu réservé')).toBeNull();
  });

  it('distingue une panne de la gateway et propose de réessayer', async () => {
    stubGateway({
      [REFRESH]: [
        {
          status: 503,
          body: errorBody('IDENTITY_UNAVAILABLE', 'Le service est momentanément indisponible.'),
        },
        { status: 200, body: sessionBody({ profileIncomplete: false }) },
      ],
    });
    renderSpace();

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Impossible de vérifier votre connexion. Le service est momentanément indisponible.',
    );
    expect(replace).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Réessayer' }));
    expect(await screen.findByText('Contenu réservé')).toBeInTheDocument();
  });

  it('demande le profil avant d’ouvrir l’espace', async () => {
    stubGateway({ [REFRESH]: { status: 200, body: sessionBody({ profileIncomplete: true }) } });
    renderSpace();

    expect(await screen.findByRole('heading', { name: 'Complétez votre profil' })).toBeInTheDocument();
    expect(screen.queryByText('Contenu réservé')).toBeNull();
  });
});

describe('déconnexion', () => {
  it('ferme la session côté gateway, vide la mémoire et revient à l’accueil', async () => {
    const { calls } = stubGateway({
      [REFRESH]: { status: 200, body: sessionBody({ profileIncomplete: false }) },
      [LOGOUT]: { status: 200, body: { revokedSessions: 1 } },
    });
    renderSpace();
    fireEvent.click(await screen.findByRole('button', { name: 'Se déconnecter' }));

    await waitFor(() => expect(replace).toHaveBeenCalledWith('/'));
    expect(session.get()).toBeNull();
    const logout = calls.find((call) => call.path === '/api/v1/identity/logout');
    expect(logout?.headers.Authorization).toBe('Bearer jeton-acces');
  });

  it('garde la session si la gateway ne répond pas', async () => {
    stubGateway({
      [REFRESH]: { status: 200, body: sessionBody({ profileIncomplete: false }) },
      [LOGOUT]: { status: 503, body: errorBody('IDENTITY_UNAVAILABLE', 'Service indisponible.') },
    });
    renderSpace();
    fireEvent.click(await screen.findByRole('button', { name: 'Se déconnecter' }));

    expect(await screen.findByText('Service indisponible.')).toBeInTheDocument();
    expect(session.get()).not.toBeNull();
    expect(replace).not.toHaveBeenCalled();
  });
});
