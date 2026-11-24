import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { session } from '@/lib/api';
import { clearDraft, emptyDraft, writeDraft } from '@/features/cleaning/draft';
import {
  CATALOG,
  FLOOR_ID,
  ON_QUOTE,
  OTHER_ID,
  PROGRAM,
  QUOTE_ID,
  REQUEST_ID,
  VILLA_DETAIL,
  VILLA_ID,
  ZONES,
  errorBody,
  sessionBody,
  stubGateway,
  quote,
  request,
  simulation,
  visitFee,
} from '@/features/cleaning/fixtures.test-utils';
import { emptySchedule } from '@/features/cleaning/schedule';
import { RequestDetail } from './request-detail';
import { RequestWizard } from './request-wizard';
import { CleaningSimulator } from './simulator';

const push = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push, replace: vi.fn() }),
  usePathname: () => '/nettoyage/demande',
  useSearchParams: () => new URLSearchParams(),
}));

const ORG_ID = '0192f1c4-7a2b-7c3d-8e4f-5a6b7c8d0a01';
const BASE = '/api/v1/cleaning';
const CATALOG_ROUTES = {
  [`GET ${BASE}/catalog/place-types`]: { status: 200, body: CATALOG },
  [`GET ${BASE}/catalog/zones`]: { status: 200, body: ZONES },
  [`GET ${BASE}/catalog/place-types/${VILLA_ID}`]: { status: 200, body: VILLA_DETAIL },
};

function signIn(organization?: { role: string }) {
  session.set(sessionBody() as Parameters<typeof session.set>[0]);
  if (organization) {
    session.switchContext({
      accessToken: 'jeton-org',
      accessTokenExpiresAt: '2099-01-01T00:15:00Z',
      activeContext: { type: 'business', organizationId: ORG_ID, organizationName: 'SARL Bénin Propre' },
    });
  }
}

afterEach(() => {
  session.clear();
  clearDraft();
  vi.unstubAllGlobals();
  push.mockReset();
});

async function fillVilla() {
  fireEvent.click(await screen.findByText('Villa'));
  fireEvent.click(await screen.findByText('Sol'));
  fireEvent.change(screen.getByLabelText(/Superficie/), { target: { value: '120' } });
  fireEvent.click(within(screen.getByRole('group', { name: /Niveau de saleté/ })).getByLabelText('Normal'));
}

describe('simulateur public', () => {
  it('estimation en direct : fourchette, séances, frais de visite, détail replié', async () => {
    const { calls } = stubGateway({
      ...CATALOG_ROUTES,
      [`POST ${BASE}/simulations`]: { status: 200, body: simulation() },
    });
    render(<CleaningSimulator />);
    await fillVilla();
    const result = screen.getByRole('region', { name: 'Votre estimation' });
    await waitFor(() => expect(result).toHaveTextContent(/28\s500\sF\sCFA.*37\s000\sF\sCFA/), {
      timeout: 3000,
    });
    expect(result).toHaveTextContent('12 séances');
    expect(result).toHaveTextContent(/5\s000\sF\sCFA/);
    expect(within(result).getByText('Voir le détail du calcul')).toBeInTheDocument();
    const sent = calls.find((call) => call.path === `${BASE}/simulations`);
    expect(sent?.body).toEqual({
      placeTypeId: VILLA_ID,
      cleaningTypeIds: [FLOOR_ID],
      values: { surface: 120, dirt_level: 'normal' },
    });
    expect(sent?.headers.Authorization).toBeUndefined();

    fireEvent.click(screen.getAllByRole('button', { name: /Demander un devis/ })[0]!);
    expect(push).toHaveBeenCalledWith('/nettoyage/demande');
    expect(JSON.parse(window.sessionStorage.getItem('ksp.nettoyage.demande') ?? '{}')).toMatchObject({
      placeTypeId: VILLA_ID,
      cleaningTypeIds: [FLOOR_ID],
      step: 'schedule',
    });
  });

  it('« sur devis » : aucun prix de séance, mentions traduites', async () => {
    stubGateway({ ...CATALOG_ROUTES, [`POST ${BASE}/simulations`]: { status: 200, body: ON_QUOTE } });
    render(<CleaningSimulator />);
    await fillVilla();
    const result = screen.getByRole('region', { name: 'Votre estimation' });
    await waitFor(() => expect(result).toHaveTextContent('Sur devis'), { timeout: 3000 });
    expect(result).not.toHaveTextContent('Prix estimé d’une séance');
    expect(result).toHaveTextContent('Commune non indiquée');
  });

  it('trop d’estimations (429) : délai annoncé', async () => {
    stubGateway({
      ...CATALOG_ROUTES,
      [`POST ${BASE}/simulations`]: {
        status: 429,
        body: errorBody('GATEWAY_RATE_LIMITED', 'Trop de requêtes.', { retryAfterSeconds: 20 }),
      },
    });
    render(<CleaningSimulator />);
    await fillVilla();
    expect(
      await screen.findByText(/Nouvel essai possible dans 20 s/, undefined, { timeout: 3000 }),
    ).toBeInTheDocument();
  });

  it('lieu « Autre » : pas de simulation, demande de devis directe', async () => {
    const { calls } = stubGateway(CATALOG_ROUTES);
    render(<CleaningSimulator />);
    fireEvent.click(await screen.findByText('Autre lieu'));
    expect(screen.getByText('Votre lieu n’est pas dans la liste')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Demander un devis pour ce lieu/ }));
    expect(push).toHaveBeenCalledWith('/nettoyage/demande');
    expect(calls.some((call) => call.path.endsWith('/simulations'))).toBe(false);
    expect(JSON.parse(window.sessionStorage.getItem('ksp.nettoyage.demande') ?? '{}')).toMatchObject({
      placeTypeId: OTHER_ID,
      freeDescription: true,
      step: 'params',
    });
  });
});

describe('assistant de demande', () => {
  it('reprend le brouillon et, sans session, invite à se connecter avec retour à la demande', async () => {
    stubGateway({
      ...CATALOG_ROUTES,
      'POST /api/v1/identity/token/refresh': {
        status: 401,
        body: errorBody('IDENTITY_REFRESH_TOKEN_INVALID', 'Expirée.'),
      },
    });
    writeDraft({
      ...emptyDraft(),
      placeTypeId: VILLA_ID,
      cleaningTypeIds: [FLOOR_ID],
      values: { surface: '120', dirt_level: 'normal' },
      schedule: { ...emptySchedule(), kind: 'one_off', dates: ['2027-01-05'] },
      step: 'place',
    });
    render(<RequestWizard />);
    expect(await screen.findByText('Connectez-vous pour continuer')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Se connecter ou créer un compte' })).toHaveAttribute(
      'href',
      '/connexion?retour=%2Fnettoyage%2Fdemande',
    );
    expect(screen.getByText(/Étape 4 sur 7/)).toBeInTheDocument();
  });

  it('étape « Rythme » : impossible de continuer sans rythme', async () => {
    stubGateway(CATALOG_ROUTES);
    writeDraft({ ...emptyDraft(), placeTypeId: VILLA_ID, cleaningTypeIds: [FLOOR_ID], step: 'schedule' });
    render(<RequestWizard />);
    fireEvent.click(await screen.findByRole('button', { name: /Continuer/ }));
    expect(await screen.findByText('Choisissez un rythme.')).toBeInTheDocument();
  });
});

describe('page d’une demande', () => {
  const detailRoute = (body: unknown) => ({ [`GET ${BASE}/requests/${REQUEST_ID}`]: { status: 200, body } });

  it('frais de visite à régler : Mobile Money d’abord ; solde insuffisant, recharge proposée', async () => {
    signIn();
    const awaiting = request({
      status: 'awaiting_visit_fee',
      visitFee: visitFee({
        status: 'awaiting_payment',
        paidAt: null,
        invoiceId: null,
        payBefore: '2026-11-27T10:00:00Z',
      }),
    });
    const { calls } = stubGateway({
      ...detailRoute(awaiting),
      [`POST ${BASE}/requests/${REQUEST_ID}/visit-fee/pay`]: {
        status: 422,
        body: errorBody('CLEANING_INSUFFICIENT_BALANCE', 'Solde insuffisant.'),
      },
    });
    render(<RequestDetail id={REQUEST_ID} />);
    const now = await screen.findByRole('region', { name: 'Frais de visite à régler' });
    expect(within(now).getByText(/avant le 27 novembre 2026 à 11:00/)).toBeInTheDocument();
    const buttons = within(now)
      .getAllByRole('button')
      .map((button) => button.textContent);
    expect(buttons[0]).toBe('Payer par Mobile Money');
    fireEvent.click(within(now).getByRole('button', { name: /Payer avec mon portefeuille/ }));
    expect(await within(now).findByRole('link', { name: 'Recharger mon portefeuille' })).toHaveAttribute(
      'href',
      '/mon-espace/portefeuille',
    );
    const pay = calls.find((call) => call.path.endsWith('/visit-fee/pay'));
    expect(pay?.body).toEqual({ method: 'wallet' });
    expect(pay?.headers['Idempotency-Key']).toMatch(/^[A-Za-z0-9_-]{8,100}$/);
  });

  it('devis : écarts déclaré / retenu, acceptation avec la version des conditions générales', async () => {
    signIn();
    const withQuote = request({ status: 'quote_sent', currentQuote: quote() });
    const { calls } = stubGateway({
      ...detailRoute(withQuote),
      [`POST ${BASE}/quotes/${QUOTE_ID}/accept`]: {
        status: 200,
        body: { quote: quote({ status: 'accepted' }), program: PROGRAM },
      },
    });
    render(<RequestDetail id={REQUEST_ID} />);
    const section = await screen.findByRole('region', { name: 'Votre devis' });
    expect(section).toHaveTextContent('Mesure faite sur place');
    expect(section).toHaveTextContent('130 m²');
    expect(within(section).queryByRole('link', { name: /PDF/ })).toBeNull();
    fireEvent.click(within(section).getByRole('button', { name: 'Accepter le devis' }));
    expect(within(section).getByRole('link', { name: 'conditions générales du Nettoyage' })).toHaveAttribute(
      'href',
      '/conditions/nettoyage/cg-2026-11',
    );
    fireEvent.click(within(section).getByRole('button', { name: 'Confirmer l’acceptation' }));
    expect(
      await within(section).findByText('Cochez la case pour accepter les conditions générales.'),
    ).toBeInTheDocument();
    fireEvent.click(within(section).getByRole('checkbox'));
    fireEvent.click(within(section).getByRole('button', { name: 'Confirmer l’acceptation' }));
    expect(await within(section).findByRole('link', { name: 'Voir mon programme' })).toHaveAttribute(
      'href',
      `/mon-espace/nettoyage/programmes/${PROGRAM.id}`,
    );
    expect(calls.find((call) => call.path.endsWith('/accept'))?.body).toEqual({
      acceptTerms: true,
      termsVersion: 'cg-2026-11',
    });
  });

  it('entreprise, membre : « Accepter » désactivé et expliqué, « Transmettre aux administrateurs »', async () => {
    signIn({ role: 'org_member' });
    const { calls } = stubGateway({
      ...detailRoute(
        request({
          status: 'quote_sent',
          currentQuote: quote(),
          organizationId: ORG_ID,
          customerKind: 'organization',
        }),
      ),
      [`GET /api/v1/identity/organizations/${ORG_ID}`]: { status: 200, body: { role: 'org_member' } },
      [`POST ${BASE}/quotes/${QUOTE_ID}/forward`]: { status: 200, body: quote() },
    });
    render(<RequestDetail id={REQUEST_ID} />);
    const section = await screen.findByRole('region', { name: 'Votre devis' });
    await waitFor(() =>
      expect(within(section).getByRole('button', { name: 'Accepter le devis' })).toBeDisabled(),
    );
    expect(within(section).getByText(/Seul un administrateur/)).toBeInTheDocument();
    fireEvent.click(within(section).getByRole('button', { name: 'Transmettre aux administrateurs' }));
    expect(
      await within(section).findByText('Devis transmis aux administrateurs de l’entreprise.'),
    ).toBeInTheDocument();
    expect(calls.find((call) => call.path.endsWith('/forward'))?.headers['Idempotency-Key']).toBeUndefined();
  });

  it('entreprise, lecteur : aucune action', async () => {
    signIn({ role: 'org_viewer' });
    stubGateway({
      ...detailRoute(request({ status: 'quote_sent', currentQuote: quote(), organizationId: ORG_ID })),
      [`GET /api/v1/identity/organizations/${ORG_ID}`]: { status: 200, body: { role: 'org_viewer' } },
    });
    render(<RequestDetail id={REQUEST_ID} />);
    const section = await screen.findByRole('region', { name: 'Votre devis' });
    await waitFor(() =>
      expect(within(section).queryByRole('button', { name: 'Accepter le devis' })).toBeNull(),
    );
    expect(screen.queryByRole('button', { name: 'Annuler la demande' })).toBeNull();
  });

  it('annulation : effet sur les frais annoncé, puis demande relue', async () => {
    signIn();
    const { calls } = stubGateway({
      ...detailRoute(request()),
      [`POST ${BASE}/requests/${REQUEST_ID}/cancel`]: { status: 200, body: request({ status: 'cancelled' }) },
    });
    render(<RequestDetail id={REQUEST_ID} />);
    const panel = await screen.findByRole('region', { name: 'Annuler la demande' });
    expect(panel).toHaveTextContent(/rembourser les frais de visite/);
    fireEvent.click(within(panel).getByRole('button', { name: 'Annuler la demande' }));
    fireEvent.change(within(panel).getByLabelText('Motif (facultatif)'), {
      target: { value: 'no_longer_needed' },
    });
    fireEvent.click(within(panel).getByRole('button', { name: 'Confirmer l’annulation' }));
    expect(await screen.findByRole('region', { name: 'Demande annulée' })).toBeInTheDocument();
    expect(calls.find((call) => call.path.endsWith('/cancel'))?.body).toEqual({
      reasonCode: 'no_longer_needed',
    });
  });

  it('demande introuvable : message, sans « Réessayer »', async () => {
    signIn();
    stubGateway({
      [`GET ${BASE}/requests/${REQUEST_ID}`]: {
        status: 404,
        body: errorBody('CLEANING_REQUEST_NOT_FOUND', 'Introuvable.'),
      },
    });
    render(<RequestDetail id={REQUEST_ID} />);
    expect(await screen.findByText(/introuvable, ou n’appartient pas au compte actif/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Réessayer' })).toBeNull();
  });
});
