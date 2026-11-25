import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { session } from '@/lib/api';
import { errorBody, sessionBody, stubGateway, USER } from '@/features/identity/fake-gateway.test-utils';
import { AccountTodo } from './account-todo';
import { OrganizationDetail } from './organization-detail';
import { OrganizationSpace } from './organization-space';

const ORG_ID = '0192f1c4-7a2b-7c3d-8e4f-5a6b7c8d0a01';
const OTHER_USER = '0192f1c4-7a2b-7c3d-8e4f-5a6b7c8d0b02';
const INVITATION_ID = '0192f1c4-7a2b-7c3d-8e4f-5a6b7c8d0c01';
const ORGS = '/api/v1/identity/organizations';
const MEMBERS = `${ORGS}/${ORG_ID}/members`;
const MY_INVITATIONS = '/api/v1/identity/me/organization-invitations';
const NOT_SERVED = { status: 404, body: errorBody('GATEWAY_ROUTE_NOT_FOUND', "Cette adresse n'existe pas.") };

function membership(role = 'org_admin', status = 'active') {
  return {
    organization: {
      id: ORG_ID,
      legalName: 'SARL Bénin Propre',
      address: 'Lot 1234, Haie Vive, Cotonou',
      ifu: '3201912345678',
      rccm: null,
      billingEmail: null,
      status,
      rejectionReason: null,
      suspensionReason: null,
      createdAt: '2026-10-27T10:00:00Z',
      reviewedAt: '2026-10-28T10:00:00Z',
    },
    role,
    pendingBillingEmail: null,
  };
}

const member = (overrides: Record<string, unknown> = {}) => ({
  userId: USER.id,
  role: 'org_admin',
  firstName: 'Koffi',
  lastName: 'Adjovi',
  phoneMasked: '+229 •• •• 45',
  joinedAt: '2026-10-28T10:00:00Z',
  ...overrides,
});

const invitation = (overrides: Record<string, unknown> = {}) => ({
  id: INVITATION_ID,
  organizationId: ORG_ID,
  organizationName: 'SARL Bénin Propre',
  role: 'org_member',
  phoneMasked: '+229 •• •• 46',
  status: 'pending',
  invitedBy: USER.id,
  invitedAt: '2026-11-24T10:00:00Z',
  expiresAt: '2026-12-01T10:00:00Z',
  ...overrides,
});

const memberList = (data: unknown[], pendingInvitations: unknown[] = []) => ({
  status: 200,
  body: { data, pendingInvitations },
});

function signIn(organizationId: string | null = null) {
  const body = sessionBody({ profileIncomplete: false });
  session.set({
    ...body,
    activeContext: organizationId
      ? { type: 'business', organizationId, organizationName: 'SARL Bénin Propre' }
      : body.activeContext,
  } as Parameters<typeof session.set>[0]);
}

beforeEach(() => signIn());
afterEach(() => {
  session.clear();
  vi.unstubAllGlobals();
});

describe('Membres d’un compte entreprise', () => {
  it('route pas encore servie : « Bientôt disponible », le reste de la fiche reste affiché', async () => {
    stubGateway({
      [`GET ${ORGS}/${ORG_ID}`]: { status: 200, body: membership() },
      [`GET ${MEMBERS}`]: NOT_SERVED,
    });
    render(<OrganizationDetail id={ORG_ID} />);
    expect(await screen.findByText('Bientôt disponible')).toBeInTheDocument();
    const pending = screen.getByRole('region', { name: 'Membres' });
    expect(pending).toHaveAttribute('data-backend-pending');
    // Hors production : les routes attendues sont listées pour l'équipe.
    expect(within(pending).getByText(/organizations\/\{id\}\/members$/)).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Informations' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Réessayer' })).toBeNull();
  });

  it('administrateur : membres, invitations en attente, invitation d’un numéro local', async () => {
    const { calls } = stubGateway({
      [`GET ${ORGS}/${ORG_ID}`]: { status: 200, body: membership() },
      [`GET ${MEMBERS}`]: memberList(
        [member(), member({ userId: OTHER_USER, role: 'org_member', firstName: 'Afi', lastName: 'Dossou' })],
        [invitation({ phoneMasked: '+229 •• •• 47', role: 'org_viewer' })],
      ),
      [`POST ${ORGS}/${ORG_ID}/invitations`]: [
        {
          status: 409,
          body: errorBody('IDENTITY_MEMBER_ALREADY_EXISTS', 'Ce numéro fait déjà partie de l’entreprise.'),
        },
        { status: 201, body: invitation() },
      ],
    });
    render(<OrganizationDetail id={ORG_ID} />);
    const section = await screen.findByRole('region', { name: 'Membres' });
    expect(await within(section).findByText('Afi Dossou')).toBeInTheDocument();
    expect(within(section).getByText('(vous)')).toBeInTheDocument();
    expect(within(section).getByText('+229 •• •• 47')).toBeInTheDocument();
    // Pas d'action sur soi-même : seulement sur l'autre membre.
    expect(within(section).getAllByRole('button', { name: /Changer le rôle/ })).toHaveLength(1);

    const phone = within(section).getByLabelText(/Numéro de téléphone/);
    fireEvent.click(within(section).getByRole('button', { name: 'Envoyer l’invitation' }));
    expect(
      await within(section).findByText('Indiquez le numéro de la personne à inviter.'),
    ).toBeInTheDocument();
    expect(phone).toHaveFocus();

    fireEvent.change(phone, { target: { value: '01 97 00 00 46' } });
    expect(within(section).getByText(/Numéro utilisé : \+229 01 97 00 00 46/)).toBeInTheDocument();
    fireEvent.click(within(section).getByRole('button', { name: 'Envoyer l’invitation' }));
    expect(await within(section).findByText(/fait déjà partie/)).toBeInTheDocument();
    expect(phone).toHaveAttribute('aria-invalid', 'true');

    fireEvent.change(within(section).getByLabelText('Rôle'), { target: { value: 'org_member' } });
    fireEvent.click(within(section).getByRole('button', { name: 'Envoyer l’invitation' }));
    expect(await within(section).findByText(/Invitation envoyée à \+229 01 97 00 00 46/)).toBeInTheDocument();
    expect(within(section).getByText('+229 •• •• 46')).toBeInTheDocument();
    expect(calls.filter((call) => call.method === 'POST').at(-1)?.body).toEqual({
      phone: '+2290197000046',
      role: 'org_member',
    });
  });

  it('administrateur : change un rôle, refus du dernier administrateur, retire un membre après confirmation', async () => {
    const other = member({ userId: OTHER_USER, role: 'org_member', firstName: 'Afi', lastName: 'Dossou' });
    const { calls } = stubGateway({
      [`GET ${ORGS}/${ORG_ID}`]: { status: 200, body: membership() },
      [`GET ${MEMBERS}`]: memberList([member(), other]),
      [`PATCH ${MEMBERS}/${OTHER_USER}`]: [
        {
          status: 422,
          body: errorBody('IDENTITY_ORGANIZATION_LAST_ADMIN', 'L’entreprise doit garder un administrateur.'),
        },
        { status: 200, body: { ...other, role: 'org_viewer' } },
      ],
      [`POST ${MEMBERS}/${OTHER_USER}/remove`]: { status: 204 },
    });
    render(<OrganizationDetail id={ORG_ID} />);
    const section = await screen.findByRole('region', { name: 'Membres' });
    fireEvent.click(await within(section).findByRole('button', { name: 'Changer le rôle : Afi Dossou' }));
    const select = within(section).getByLabelText('Rôle de Afi Dossou');
    fireEvent.change(select, { target: { value: 'org_viewer' } });
    fireEvent.click(within(section).getByRole('button', { name: 'Enregistrer le rôle' }));
    expect(
      await within(section).findByText('L’entreprise doit garder un administrateur.'),
    ).toBeInTheDocument();
    fireEvent.click(within(section).getByRole('button', { name: 'Enregistrer le rôle' }));
    expect(
      await within(section).findByText('Afi Dossou est maintenant : Lecture seule.'),
    ).toBeInTheDocument();
    expect(calls.find((call) => call.method === 'PATCH')?.body).toEqual({ role: 'org_viewer' });

    fireEvent.click(within(section).getByRole('button', { name: 'Retirer Afi Dossou' }));
    expect(within(section).getByText('Retirer Afi Dossou de l’entreprise ?')).toHaveFocus();
    expect(calls.some((call) => call.path.endsWith('/remove'))).toBe(false);
    fireEvent.click(within(section).getByRole('button', { name: 'Oui, retirer' }));
    expect(
      await within(section).findByText('Afi Dossou ne fait plus partie de l’entreprise.'),
    ).toBeInTheDocument();
    expect(within(section).queryByText('Afi Dossou')).toBeNull();
  });

  it('administrateur d’une entreprise pas encore validée : pas d’invitation possible', async () => {
    stubGateway({
      [`GET ${ORGS}/${ORG_ID}`]: { status: 200, body: membership('org_admin', 'pending_review') },
      [`GET ${MEMBERS}`]: memberList([member()]),
    });
    render(<OrganizationDetail id={ORG_ID} />);
    expect(await screen.findByText(/une fois le compte entreprise validé/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Envoyer l’invitation' })).toBeNull();
  });

  it('membre : liste sans action, quitte l’entreprise active et revient au compte personnel', async () => {
    signIn(ORG_ID);
    const { calls } = stubGateway({
      [`GET ${ORGS}/${ORG_ID}`]: { status: 200, body: membership('org_member') },
      [`GET ${MEMBERS}`]: memberList([
        member({ userId: OTHER_USER, firstName: 'Afi', lastName: 'Dossou' }),
        member({ role: 'org_member' }),
      ]),
      [`POST ${MEMBERS}/${USER.id}/remove`]: { status: 204 },
      'POST /api/v1/identity/context': {
        status: 200,
        body: {
          accessToken: 'jeton-personnel',
          accessTokenExpiresAt: '2099-01-01T00:15:00Z',
          activeContext: { type: 'individual', organizationId: null, organizationName: null },
        },
      },
    });
    render(<OrganizationDetail id={ORG_ID} />);
    const section = await screen.findByRole('region', { name: 'Membres' });
    expect(await within(section).findByText('Afi Dossou')).toBeInTheDocument();
    expect(within(section).queryByRole('button', { name: /Changer le rôle|Retirer/ })).toBeNull();
    expect(within(section).queryByRole('button', { name: 'Envoyer l’invitation' })).toBeNull();

    fireEvent.click(within(section).getByRole('button', { name: 'Quitter l’entreprise' }));
    expect(within(section).getByText('Quitter cette entreprise ?')).toHaveFocus();
    fireEvent.click(within(section).getByRole('button', { name: 'Oui, quitter' }));
    expect(
      await screen.findByText(
        'Vous avez quitté SARL Bénin Propre. Vous utilisez de nouveau votre compte personnel.',
      ),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Retour à mes comptes entreprise' })).toHaveAttribute(
      'href',
      '/mon-espace/entreprise',
    );
    expect(calls.at(-1)?.body).toEqual({ organizationId: null });
    expect(session.getAccessToken()).toBe('jeton-personnel');
  });
});

describe('Invitations reçues', () => {
  it('route pas encore servie : « Bientôt disponible » dans Mon entreprise, rien dans « À faire »', async () => {
    const { calls } = stubGateway({
      [`GET ${ORGS}`]: { status: 200, body: { data: [] } },
      [`GET ${MY_INVITATIONS}`]: NOT_SERVED,
    });
    render(<OrganizationSpace />);
    const pending = await screen.findByRole('region', { name: 'Invitations reçues' });
    expect(within(pending).getByText('Bientôt disponible')).toBeInTheDocument();
    expect(screen.getByText('Vous n’avez pas encore de compte entreprise.')).toBeInTheDocument();

    const { container } = render(<AccountTodo />);
    await waitFor(() => expect(calls.filter((call) => call.path === MY_INVITATIONS)).toHaveLength(2));
    expect(container.querySelector('#todo-invitations')).toBeNull();
  });

  it('accepte une invitation, l’entreprise rejoint la liste, puis passe dans son contexte', async () => {
    const { calls } = stubGateway({
      [`GET ${ORGS}`]: { status: 200, body: { data: [] } },
      [`GET ${MY_INVITATIONS}`]: { status: 200, body: { data: [invitation()] } },
      [`POST /api/v1/identity/organization-invitations/${INVITATION_ID}/respond`]: {
        status: 200,
        body: { invitation: invitation({ status: 'accepted' }), membership: membership('org_member') },
      },
      'POST /api/v1/identity/context': {
        status: 200,
        body: {
          accessToken: 'jeton-entreprise',
          accessTokenExpiresAt: '2099-01-01T00:15:00Z',
          activeContext: { type: 'business', organizationId: ORG_ID, organizationName: 'SARL Bénin Propre' },
        },
      },
    });
    render(<OrganizationSpace />);
    const block = await screen.findByRole('region', { name: 'Invitations reçues' });
    expect(within(block).getByText('Rôle proposé : Membre')).toBeInTheDocument();
    fireEvent.click(
      within(block).getByRole('button', { name: 'Accepter l’invitation de SARL Bénin Propre' }),
    );
    expect(
      await within(block).findByText('Vous faites maintenant partie de SARL Bénin Propre.'),
    ).toBeInTheDocument();
    expect(calls.find((call) => call.path.endsWith('/respond'))?.body).toEqual({ accept: true });
    expect(screen.getByRole('link', { name: 'SARL Bénin Propre' })).toHaveAttribute(
      'href',
      `/mon-espace/entreprise/${ORG_ID}`,
    );

    fireEvent.click(within(block).getByRole('button', { name: 'Utiliser SARL Bénin Propre maintenant' }));
    await waitFor(() => expect(session.getAccessToken()).toBe('jeton-entreprise'));
    expect(within(block).queryByRole('button', { name: /maintenant/ })).toBeNull();
  });

  it('refuse une invitation ; invitation déjà close : message de la gateway', async () => {
    const second = '0192f1c4-7a2b-7c3d-8e4f-5a6b7c8d0c02';
    stubGateway({
      [`GET ${ORGS}`]: { status: 200, body: { data: [] } },
      [`GET ${MY_INVITATIONS}`]: {
        status: 200,
        body: { data: [invitation(), invitation({ id: second, organizationName: 'Hôtel du Lac' })] },
      },
      [`POST /api/v1/identity/organization-invitations/${INVITATION_ID}/respond`]: {
        status: 200,
        body: { invitation: invitation({ status: 'declined' }), membership: null },
      },
      [`POST /api/v1/identity/organization-invitations/${second}/respond`]: {
        status: 422,
        body: errorBody('IDENTITY_INVITATION_NOT_PENDING', 'Cette invitation a expiré.'),
      },
    });
    render(<OrganizationSpace />);
    const block = await screen.findByRole('region', { name: 'Invitations reçues' });
    fireEvent.click(within(block).getByRole('button', { name: 'Refuser l’invitation de SARL Bénin Propre' }));
    expect(await within(block).findByText('Invitation de SARL Bénin Propre refusée.')).toBeInTheDocument();
    fireEvent.click(within(block).getByRole('button', { name: 'Accepter l’invitation de Hôtel du Lac' }));
    expect(await within(block).findByText('Cette invitation a expiré.')).toBeInTheDocument();
  });

  it('« À faire » de Mon espace : une carte par invitation, vers Mon entreprise', async () => {
    stubGateway({ [`GET ${MY_INVITATIONS}`]: { status: 200, body: { data: [invitation()] } } });
    render(<AccountTodo />);
    const panel = await screen.findByRole('region', { name: /Invitations/ });
    expect(within(panel).getByText('Rejoindre SARL Bénin Propre')).toBeInTheDocument();
    expect(within(panel).getByRole('link', { name: 'Répondre' })).toHaveAttribute(
      'href',
      '/mon-espace/entreprise#invitations-recues',
    );
    // Le compte (e-mail à ajouter) suit dans la même rubrique.
    expect(screen.getByText('Ajoutez votre e-mail')).toBeInTheDocument();
  });
});
