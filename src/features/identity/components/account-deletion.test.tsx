import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { ApiError, session } from '@/lib/api';
import { describeDeletionError } from '@/features/identity/deletion';
import {
  errorBody,
  PERSONAL,
  sessionBody,
  stubGateway,
  USER,
} from '@/features/identity/fake-gateway.test-utils';
import { AccountDeletion } from './account-deletion';
import { LoginFlow } from './login-flow';
import { RequireSession } from './require-session';

const replace = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace }),
  usePathname: () => '/mon-espace/compte',
  useSearchParams: () => new URLSearchParams('retour=%2Fmon-espace%2Ffactures'),
}));

const DELETION = '/api/v1/identity/me/deletion';
const ME = 'GET /api/v1/identity/me';
const REFRESH = 'POST /api/v1/identity/token/refresh';
const LOGOUT = 'POST /api/v1/identity/logout';

const SCHEDULED = { requestedAt: '2026-11-05T10:00:00Z', scheduledFor: '2026-12-05T10:00:00Z' };

/** Session restreinte d'un compte en cours de suppression (ADR-036). */
function pendingSession() {
  const body = sessionBody({ profileIncomplete: false });
  return { ...body, accessToken: 'jeton-restreint', user: { ...body.user, status: 'deletion_pending' } };
}

function meBody(deletion: unknown) {
  return {
    user: pendingSession().user,
    profileIncomplete: false,
    activeContext: PERSONAL,
    pendingEmail: null,
    deletion,
  };
}

function signInActive() {
  session.set({ ...sessionBody({ profileIncomplete: false }), status: 'authenticated' });
}

function renderGuarded(children: React.ReactNode) {
  return render(<RequireSession>{children}</RequireSession>);
}

beforeEach(() => {
  replace.mockReset();
  session.clear();
});
afterEach(() => vi.unstubAllGlobals());

describe('Supprimer mon compte (ADR-036)', () => {
  it('explique les conséquences, demande une confirmation, puis montre la date prévue', async () => {
    const { calls } = stubGateway({
      [`POST ${DELETION}`]: { status: 200, body: { deletion: { ...SCHEDULED, postponedBy: [] } } },
    });
    signInActive();
    renderGuarded(<AccountDeletion />);

    expect(await screen.findByText(/gelé pendant 30 jours/)).toBeInTheDocument();
    expect(screen.getByText(/Toutes vos sessions sont fermées/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Supprimer mon compte' }));
    // Rien n'est envoyé avant la confirmation ; le focus va au titre de la confirmation.
    expect(calls).toHaveLength(0);
    const confirmation = screen.getByRole('group', { name: 'Confirmer la suppression de votre compte ?' });
    expect(screen.getByRole('heading', { name: 'Confirmer la suppression de votre compte ?' })).toHaveFocus();

    fireEvent.click(within(confirmation).getByRole('button', { name: 'Oui, supprimer mon compte' }));
    expect(
      await screen.findByRole('heading', {
        level: 1,
        name: /Suppression de votre compte prévue le .*5 décembre 2026/,
      }),
    ).toBeInTheDocument();
    expect(calls[0]).toMatchObject({ method: 'POST', path: DELETION, body: undefined });
    expect(session.get()).toBeNull();
    expect(screen.getByRole('link', { name: 'Se reconnecter' })).toHaveAttribute(
      'href',
      '/connexion?retour=%2Fmon-espace%2Fcompte',
    );
  });

  it('« Garder mon compte » referme la confirmation sans rien envoyer', async () => {
    const { calls } = stubGateway({});
    signInActive();
    renderGuarded(<AccountDeletion />);
    fireEvent.click(await screen.findByRole('button', { name: 'Supprimer mon compte' }));
    fireEvent.click(screen.getByRole('button', { name: 'Garder mon compte' }));
    expect(screen.getByRole('button', { name: 'Supprimer mon compte' })).toHaveFocus();
    expect(calls).toHaveLength(0);
  });

  it('refus : obligations en cours avec des libellés lisibles et l’écran où agir', async () => {
    stubGateway({
      [`POST ${DELETION}`]: {
        status: 422,
        body: errorBody(
          'IDENTITY_DELETION_BLOCKED',
          'Votre compte ne peut pas être supprimé tant que des opérations sont en cours.',
          {
            obligations: [
              {
                service: 'cleaning',
                kind: 'open_cleaning_mission',
                reference: 'M-1',
                description: 'La prestation du 12 novembre n’est pas terminée.',
              },
              {
                service: 'billing',
                kind: 'unpaid_invoice',
                reference: 'FAC-2026-000042',
                description: 'La facture FAC-2026-000042 (150 000 FCFA) est en attente de paiement.',
              },
              {
                service: 'payment',
                kind: 'payment_under_review',
                reference: 'P-1',
                description: 'Un paiement est en cours de vérification.',
              },
            ],
          },
        ),
      },
    });
    signInActive();
    renderGuarded(<AccountDeletion />);
    fireEvent.click(await screen.findByRole('button', { name: 'Supprimer mon compte' }));
    fireEvent.click(screen.getByRole('button', { name: 'Oui, supprimer mon compte' }));

    expect(await screen.findByText('Prestation de nettoyage en cours')).toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveTextContent(/tant que des opérations sont en cours/);
    expect(screen.getByText(/FAC-2026-000042 \(150 000 FCFA\)/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Voir : facture à régler' })).toHaveAttribute(
      'href',
      '/mon-espace/factures',
    );
    expect(screen.getByRole('link', { name: 'Voir : paiement en vérification' })).toHaveAttribute(
      'href',
      '/mon-espace/paiements',
    );
    // Toujours connecté : rien n'a changé.
    expect(session.get()).not.toBeNull();
  });

  it('service injoignable (503) : « réessayez plus tard »', async () => {
    stubGateway({
      [`POST ${DELETION}`]: {
        status: 503,
        body: errorBody('IDENTITY_DELETION_CHECK_UNAVAILABLE', 'brut', { services: ['billing'] }),
      },
    });
    signInActive();
    renderGuarded(<AccountDeletion />);
    fireEvent.click(await screen.findByRole('button', { name: 'Supprimer mon compte' }));
    fireEvent.click(screen.getByRole('button', { name: 'Oui, supprimer mon compte' }));
    expect(
      await screen.findByText(
        'Nous ne pouvons pas vérifier votre compte pour le moment. Réessayez plus tard.',
      ),
    ).toBeInTheDocument();
  });

  it('seul administrateur d’un compte entreprise : raison lisible depuis `details.organizations`', () => {
    const view = describeDeletionError(
      new ApiError(422, 'IDENTITY_DELETION_LAST_ORG_ADMIN', 'Vous êtes le seul administrateur.', {
        organizations: [{ id: 'o-1', legalName: 'SARL Bénin Propre' }],
      }),
    );
    expect(view.obstacles).toEqual([
      expect.objectContaining({ kind: 'last_org_admin', reference: 'SARL Bénin Propre' }),
    ]);
  });
});

describe('Session restreinte d’un compte en cours de suppression', () => {
  it('remplace la page demandée par la date prévue, sans appeler les autres services', async () => {
    const { calls } = stubGateway({
      [REFRESH]: { status: 200, body: pendingSession() },
      [ME]: {
        status: 200,
        body: meBody({
          ...SCHEDULED,
          postponedBy: [
            {
              service: 'billing',
              kind: 'unpaid_invoice',
              reference: 'FAC-1',
              description: 'La facture FAC-1 est en attente de paiement.',
            },
          ],
        }),
      },
    });
    renderGuarded(<p>Contenu réservé</p>);
    expect(
      await screen.findByRole('heading', { level: 1, name: /Suppression prévue le .*5 décembre 2026/ }),
    ).toBeInTheDocument();
    expect(screen.queryByText('Contenu réservé')).toBeNull();
    expect(screen.getByText('Suppression reportée')).toBeInTheDocument();
    expect(screen.getByText('La facture FAC-1 est en attente de paiement.')).toBeInTheDocument();
    expect(calls.map((call) => `${call.method} ${call.path}`)).toEqual([REFRESH, ME]);
  });

  it('« Annuler la suppression » : jeton complet en session, puis l’espace', async () => {
    const { calls } = stubGateway({
      [REFRESH]: { status: 200, body: pendingSession() },
      [ME]: { status: 200, body: meBody({ ...SCHEDULED, postponedBy: [] }) },
      [`DELETE ${DELETION}`]: {
        status: 200,
        body: {
          user: { ...USER, firstName: 'Koffi', lastName: 'Adjovi' },
          profileIncomplete: false,
          activeContext: PERSONAL,
          accessToken: 'jeton-complet',
          accessTokenExpiresAt: '2099-01-01T00:15:00Z',
        },
      },
    });
    renderGuarded(<p>Contenu réservé</p>);
    fireEvent.click(await screen.findByRole('button', { name: 'Annuler la suppression' }));
    expect(
      await screen.findByText('Suppression annulée : votre compte est de nouveau actif.'),
    ).toBeInTheDocument();
    expect(calls.at(-1)).toMatchObject({ method: 'DELETE', path: DELETION });
    expect(calls.at(-1)?.headers.Authorization).toBe('Bearer jeton-restreint');
    fireEvent.click(screen.getByRole('button', { name: 'Continuer' }));
    expect(await screen.findByText('Contenu réservé')).toBeInTheDocument();
    expect(session.getAccessToken()).toBe('jeton-complet');
    expect(session.get()?.user.status).toBe('active');
  });

  it('« Se déconnecter » ferme la session restreinte', async () => {
    const { calls } = stubGateway({
      [REFRESH]: { status: 200, body: pendingSession() },
      [ME]: { status: 200, body: meBody({ ...SCHEDULED, postponedBy: [] }) },
      [LOGOUT]: { status: 200, body: { revokedSessions: 1 } },
    });
    renderGuarded(<p>Contenu réservé</p>);
    fireEvent.click(await screen.findByRole('button', { name: 'Se déconnecter' }));
    await waitFor(() => expect(replace).toHaveBeenCalledWith('/'));
    expect(calls.some((call) => `${call.method} ${call.path}` === LOGOUT)).toBe(true);
    expect(session.get()).toBeNull();
  });

  it('connexion d’un compte en cours de suppression : « Mon compte », pas la page demandée', async () => {
    stubGateway({ [REFRESH]: { status: 200, body: pendingSession() } });
    render(<LoginFlow />);
    await waitFor(() => expect(replace).toHaveBeenCalledWith('/mon-espace/compte'));
  });
});
