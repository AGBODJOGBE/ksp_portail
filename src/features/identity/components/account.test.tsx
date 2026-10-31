import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { session } from '@/lib/api';
import {
  errorBody,
  PERSONAL,
  sessionBody,
  stubGateway,
  USER,
} from '@/features/identity/fake-gateway.test-utils';
import { ContextSwitcher } from './context-switcher';
import { OrganizationDetail } from './organization-detail';
import { OrganizationSpace } from './organization-space';
import { ProfileSpace } from './profile-space';

const ORG_ID = '0192f1c4-7a2b-7c3d-8e4f-5a6b7c8d0a01';
const OTHER_ID = '0192f1c4-7a2b-7c3d-8e4f-5a6b7c8d0a02';
const ME = '/api/v1/identity/me';
const ORGS = '/api/v1/identity/organizations';

function membership(overrides: Record<string, unknown> = {}, extra: Record<string, unknown> = {}) {
  return {
    organization: {
      id: ORG_ID,
      legalName: 'SARL Bénin Propre',
      address: 'Lot 1234, Haie Vive, Cotonou',
      ifu: '3201912345678',
      rccm: null,
      billingEmail: null,
      status: 'pending_review',
      rejectionReason: null,
      suspensionReason: null,
      createdAt: '2026-10-27T10:00:00Z',
      reviewedAt: null,
      ...overrides,
    },
    role: 'org_admin',
    pendingBillingEmail: null,
    ...extra,
  };
}

function profileBody(overrides: Record<string, unknown> = {}, pendingEmail: string | null = null) {
  return {
    user: { ...USER, firstName: 'Koffi', lastName: 'Adjovi', ...overrides },
    profileIncomplete: false,
    activeContext: PERSONAL,
    pendingEmail,
  };
}

const challenge = (pendingEmail: string) => ({ pendingEmail, expiresInSeconds: 900, resendAfterSeconds: 60 });

beforeEach(() => {
  session.set(sessionBody({ profileIncomplete: false }) as Parameters<typeof session.set>[0]);
});

afterEach(() => {
  session.clear();
  vi.unstubAllGlobals();
});

describe('Mon profil', () => {
  it('déclare un e-mail, puis le confirme par le code reçu', async () => {
    const { calls } = stubGateway({
      [`GET ${ME}`]: { status: 200, body: profileBody() },
      [`PUT ${ME}/email`]: { status: 200, body: challenge('koffi@exemple.bj') },
      [`POST ${ME}/email/verify`]: [
        {
          status: 400,
          body: errorBody('IDENTITY_OTP_INVALID', 'Le code est incorrect.', { attemptsRemaining: 2 }),
        },
        {
          status: 200,
          body: profileBody({ email: 'koffi@exemple.bj', emailVerified: true }),
        },
      ],
    });
    render(<ProfileSpace />);

    expect(screen.getByText('Koffi Adjovi')).toBeInTheDocument();
    expect(await screen.findByText('Aucune adresse e-mail.')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Ajouter une adresse e-mail' }));

    const input = screen.getByRole('textbox', { name: /Adresse e-mail/ });
    expect(input).toHaveFocus();
    fireEvent.change(input, { target: { value: 'koffi@' } });
    fireEvent.click(screen.getByRole('button', { name: 'Recevoir le code' }));
    expect(await screen.findByText(/Adresse e-mail invalide/)).toBeInTheDocument();
    expect(calls.some((call) => call.method === 'PUT')).toBe(false);

    fireEvent.change(input, { target: { value: ' koffi@exemple.bj ' } });
    fireEvent.click(screen.getByRole('button', { name: 'Recevoir le code' }));
    expect(
      await screen.findByText('Nous avons envoyé un code à koffi@exemple.bj. Il est valable 15 minutes.'),
    ).toBeInTheDocument();
    expect(calls.find((call) => call.method === 'PUT')?.body).toEqual({ email: 'koffi@exemple.bj' });

    const code = screen.getByRole('textbox', { name: /Code reçu par e-mail/ });
    fireEvent.change(code, { target: { value: '000000' } });
    fireEvent.click(screen.getByRole('button', { name: 'Confirmer' }));
    expect(await screen.findByText('Le code est incorrect. Il vous reste 2 essais.')).toBeInTheDocument();

    fireEvent.change(code, { target: { value: '482913' } });
    fireEvent.click(screen.getByRole('button', { name: 'Confirmer' }));
    expect(await screen.findByText('Adresse confirmée : koffi@exemple.bj.')).toBeInTheDocument();
    expect(screen.getByText('Vérifiée')).toBeInTheDocument();
    expect(session.get()?.user).toMatchObject({ email: 'koffi@exemple.bj', emailVerified: true });
    expect(calls.filter((call) => call.path.endsWith('/email/verify')).at(-1)?.body).toEqual({
      code: '482913',
    });
  });

  it('montre une adresse en attente et propose d’en saisir le code', async () => {
    stubGateway({ [`GET ${ME}`]: { status: 200, body: profileBody({}, 'compta@exemple.bj') } });
    render(<ProfileSpace />);

    expect(await screen.findByText('En attente de confirmation : compta@exemple.bj')).toBeInTheDocument();
    expect(screen.getByText('Non vérifiée')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Saisir le code reçu' }));
    expect(screen.getByText('Nous avons envoyé un code à compta@exemple.bj.')).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: /Code reçu par e-mail/ })).toHaveFocus();
  });
});

describe('Mon entreprise', () => {
  it('demande un compte entreprise, puis le montre en attente de validation', async () => {
    const { calls } = stubGateway({
      [`GET ${ORGS}`]: { status: 200, body: { data: [] } },
      [`POST ${ORGS}`]: [
        {
          status: 409,
          body: errorBody('IDENTITY_ORGANIZATION_ALREADY_EXISTS', 'Cet IFU est déjà enregistré.'),
        },
        { status: 200, body: membership({ rccm: 'RB/COT/19 B 12345' }) },
      ],
    });
    render(<OrganizationSpace />);

    expect(await screen.findByText('Vous n’avez pas encore de compte entreprise.')).toBeInTheDocument();
    fireEvent.change(screen.getByRole('textbox', { name: 'Raison sociale' }), {
      target: { value: 'SARL Bénin Propre' },
    });
    fireEvent.change(screen.getByRole('textbox', { name: /Adresse du siège/ }), {
      target: { value: 'Lot 1234, Haie Vive, Cotonou' },
    });
    const ifu = screen.getByRole('textbox', { name: /IFU/ });
    fireEvent.change(ifu, { target: { value: '3201 9123' } });
    fireEvent.click(screen.getByRole('button', { name: 'Envoyer ma demande' }));
    expect(await screen.findByText('L’IFU compte 13 chiffres.')).toBeInTheDocument();
    expect(ifu).toHaveFocus();

    fireEvent.change(ifu, { target: { value: '3201 9123 45678' } });
    fireEvent.change(screen.getByRole('textbox', { name: /RCCM/ }), {
      target: { value: 'RB/COT/19 B 12345' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Envoyer ma demande' }));
    expect(await screen.findByText('Cet IFU est déjà enregistré.')).toBeInTheDocument();
    expect(ifu).toHaveAttribute('aria-invalid', 'true');

    fireEvent.click(screen.getByRole('button', { name: 'Envoyer ma demande' }));
    expect(await screen.findByRole('link', { name: 'SARL Bénin Propre' })).toHaveAttribute(
      'href',
      `/mon-espace/entreprise/${ORG_ID}`,
    );
    expect(screen.getByText('En attente de validation')).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('Demande envoyée pour SARL Bénin Propre.');
    expect(calls.filter((call) => call.method === 'POST').at(-1)?.body).toEqual({
      legalName: 'SARL Bénin Propre',
      address: 'Lot 1234, Haie Vive, Cotonou',
      ifu: '3201912345678',
      rccm: 'RB/COT/19 B 12345',
    });
  });
});

describe('fiche d’un compte entreprise', () => {
  it('déclare et confirme l’e-mail de facturation d’une demande en attente', async () => {
    const { calls } = stubGateway({
      [`GET ${ORGS}/${ORG_ID}`]: { status: 200, body: membership() },
      [`PUT ${ORGS}/${ORG_ID}/billing-email`]: { status: 200, body: challenge('compta@beninpropre.bj') },
      [`POST ${ORGS}/${ORG_ID}/billing-email/verify`]: {
        status: 200,
        body: membership({ billingEmail: 'compta@beninpropre.bj' }),
      },
    });
    render(<OrganizationDetail id={ORG_ID} />);

    expect(await screen.findByRole('heading', { level: 1, name: 'SARL Bénin Propre' })).toBeInTheDocument();
    expect(screen.getByText('En attente de validation')).toBeInTheDocument();
    expect(screen.getByText(/KSP vérifie votre demande/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Utiliser ce compte entreprise' })).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'Ajouter une adresse e-mail' }));
    fireEvent.change(screen.getByRole('textbox', { name: /Adresse e-mail/ }), {
      target: { value: 'compta@beninpropre.bj' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Recevoir le code' }));
    fireEvent.change(await screen.findByRole('textbox', { name: /Code reçu par e-mail/ }), {
      target: { value: '482913' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Confirmer' }));
    expect(await screen.findByText('Adresse confirmée : compta@beninpropre.bj.')).toBeInTheDocument();
    expect(calls.find((call) => call.method === 'PUT')?.body).toEqual({ email: 'compta@beninpropre.bj' });
  });

  it('réserve l’e-mail de facturation à l’administrateur', async () => {
    stubGateway({
      [`GET ${ORGS}/${ORG_ID}`]: {
        status: 200,
        body: membership({ status: 'active' }, { role: 'org_member' }),
      },
    });
    render(<OrganizationDetail id={ORG_ID} />);

    expect(await screen.findByText(/Seul un administrateur/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /adresse e-mail/ })).toBeNull();
  });

  it('active un compte entreprise validé comme contexte', async () => {
    const { calls } = stubGateway({
      [`GET ${ORGS}/${ORG_ID}`]: { status: 200, body: membership({ status: 'active' }) },
      'POST /api/v1/identity/context': {
        status: 200,
        body: {
          accessToken: 'jeton-entreprise',
          accessTokenExpiresAt: '2099-01-01T00:15:00Z',
          activeContext: { type: 'business', organizationId: ORG_ID, organizationName: 'SARL Bénin Propre' },
        },
      },
    });
    render(<OrganizationDetail id={ORG_ID} />);

    fireEvent.click(await screen.findByRole('button', { name: 'Utiliser ce compte entreprise' }));
    expect(await screen.findByText('Vous utilisez ce compte entreprise.')).toBeInTheDocument();
    expect(calls.at(-1)?.body).toEqual({ organizationId: ORG_ID });
    expect(session.getAccessToken()).toBe('jeton-entreprise');
  });

  it('dit qu’une organisation est introuvable, sans proposer de réessayer', async () => {
    stubGateway({
      [`GET ${ORGS}/${ORG_ID}`]: {
        status: 404,
        body: errorBody('IDENTITY_ORGANIZATION_NOT_FOUND', 'Organisation introuvable.'),
      },
    });
    render(<OrganizationDetail id={ORG_ID} />);

    expect(await screen.findByText(/introuvable, ou vous n’en êtes pas membre/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Réessayer' })).toBeNull();
  });
});

describe('sélecteur de contexte', () => {
  it('passe du compte personnel à un compte entreprise validé', async () => {
    const { calls } = stubGateway({
      [`GET ${ORGS}`]: {
        status: 200,
        body: {
          data: [
            membership({ id: OTHER_ID, legalName: 'Ets Nouveau', status: 'pending_review' }),
            membership({ status: 'active' }),
          ],
        },
      },
      'POST /api/v1/identity/context': [
        {
          status: 422,
          body: errorBody('IDENTITY_ORGANIZATION_NOT_ACTIVE', 'Cette organisation n’est pas encore validée.'),
        },
        {
          status: 200,
          body: {
            accessToken: 'jeton-entreprise',
            accessTokenExpiresAt: '2099-01-01T00:15:00Z',
            activeContext: {
              type: 'business',
              organizationId: ORG_ID,
              organizationName: 'SARL Bénin Propre',
            },
          },
        },
      ],
    });
    render(<ContextSwitcher />);

    expect(screen.getByText('Compte personnel (particulier)')).toBeInTheDocument();
    const toggle = screen.getByRole('button', { name: 'Changer de compte' });
    fireEvent.click(toggle);
    expect(toggle).toHaveAttribute('aria-expanded', 'true');

    const group = await screen.findByRole('group', { name: 'Utiliser le compte' });
    expect(within(group).getByRole('radio', { name: 'Compte personnel' })).toBeChecked();
    expect(within(group).getByRole('radio', { name: /Ets Nouveau/ })).toBeDisabled();
    expect(within(group).getByText('indisponible : en attente de validation')).toBeInTheDocument();

    fireEvent.click(within(group).getByRole('radio', { name: 'SARL Bénin Propre' }));
    fireEvent.click(screen.getByRole('button', { name: 'Utiliser ce compte' }));
    expect(await screen.findByText('Cette organisation n’est pas encore validée.')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Utiliser ce compte' }));
    await waitFor(() =>
      expect(screen.getByRole('status')).toHaveTextContent(
        'Vous utilisez maintenant : Entreprise SARL Bénin Propre.',
      ),
    );
    expect(screen.getByText('Entreprise SARL Bénin Propre')).toBeInTheDocument();
    expect(calls.at(-1)?.body).toEqual({ organizationId: ORG_ID });
    expect(session.get()?.activeContext.organizationId).toBe(ORG_ID);
  });

  it('propose de demander un compte entreprise quand il n’y en a aucun', async () => {
    stubGateway({ [`GET ${ORGS}`]: { status: 200, body: { data: [] } } });
    render(<ContextSwitcher />);

    fireEvent.click(screen.getByRole('button', { name: 'Changer de compte' }));
    expect(await screen.findByRole('link', { name: 'Demander un compte entreprise' })).toHaveAttribute(
      'href',
      '/mon-espace/entreprise',
    );
  });
});
