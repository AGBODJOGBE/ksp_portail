import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { session as sessionStore } from '@/lib/api';
import {
  PROGRAM_ID,
  QUOTE_ID,
  REQUEST_ID,
  errorBody,
  list,
  program,
  quote,
  request,
  session,
  sessionBody,
  stubGateway,
} from '@/features/cleaning/fixtures.test-utils';
import { ProgramDetail } from './program-detail';
import { ProgramList } from './program-list';
import { ReorderProgram } from './program-reorder';

let search = '';
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  usePathname: () => '/mon-espace/nettoyage/programmes',
  useSearchParams: () => new URLSearchParams(search),
}));

const ORG_ID = '0192f1c4-7a2b-7c3d-8e4f-5a6b7c8d0a01';
const BASE = '/api/v1/cleaning';
const PROGRAM = `${BASE}/programs/${PROGRAM_ID}`;
const SESSIONS = `${PROGRAM}/sessions`;

function signIn(organization?: { role: string }) {
  sessionStore.set(sessionBody() as Parameters<typeof sessionStore.set>[0]);
  if (organization) {
    sessionStore.switchContext({
      accessToken: 'jeton-org',
      accessTokenExpiresAt: '2099-01-01T00:15:00Z',
      activeContext: { type: 'business', organizationId: ORG_ID, organizationName: 'SARL Bénin Propre' },
    });
  }
}

const roleRoute = (role: string) => ({
  [`GET /api/v1/identity/organizations/${ORG_ID}`]: { status: 200, body: { role } },
});

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date('2027-01-10T09:00:00Z'));
});

afterEach(() => {
  vi.useRealTimers();
  sessionStore.clear();
  vi.unstubAllGlobals();
  search = '';
});

describe('mes programmes', () => {
  it('filtre par état lu dans l’adresse, envoyé à la gateway ; avancement de chaque programme', async () => {
    signIn();
    search = 'statut=suspendu';
    const { calls } = stubGateway({
      [`GET ${BASE}/programs`]: {
        status: 200,
        body: list([program({ status: 'suspended', sessionsCompleted: 2 })]),
      },
    });
    render(<ProgramList />);
    const row = await screen.findByRole('link', { name: 'PN-000057 · Maison de Calavi' });
    expect(row).toHaveAttribute('href', `/mon-espace/nettoyage/programmes/${PROGRAM_ID}`);
    expect(screen.getByText('2 / 12 séances réalisées')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Suspendu' })).toHaveAttribute('aria-current', 'page');
    expect(calls[0]?.query.get('status')).toBe('suspended');
  });

  it('liste vide : explication et lien vers les demandes', async () => {
    signIn();
    stubGateway({ [`GET ${BASE}/programs`]: { status: 200, body: list([]) } });
    render(<ProgramList />);
    expect(
      await screen.findByText('Aucun programme pour le moment : il naît d’un devis accepté.'),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Mes demandes de devis' })).toBeInTheDocument();
  });
});

describe('page d’un programme', () => {
  it('en-tête, avancement, calendrier du mois lu à la demande, séances du mois', async () => {
    signIn();
    const { calls } = stubGateway({
      [`GET ${PROGRAM}`]: { status: 200, body: program({ status: 'in_progress', sessionsCompleted: 1 }) },
      [`GET ${SESSIONS}`]: [
        {
          status: 200,
          body: list([
            session({
              rank: 2,
              scheduledStart: '2027-01-11T07:00:00Z',
              scheduledEnd: '2027-01-11T11:00:00Z',
            }),
          ]),
        },
        {
          status: 200,
          body: list([
            session({
              rank: 6,
              scheduledStart: '2027-02-08T07:00:00Z',
              scheduledEnd: '2027-02-08T11:00:00Z',
            }),
          ]),
        },
      ],
    });
    render(<ProgramDetail id={PROGRAM_ID} />);
    expect(await screen.findByRole('heading', { level: 1, name: 'Maison de Calavi' })).toBeInTheDocument();
    expect(screen.getByText('Programme PN-000057')).toBeInTheDocument();
    expect(screen.getByRole('progressbar', { name: 'Séances réalisées' })).toHaveAttribute(
      'aria-valuenow',
      '1',
    );
    const calendar = screen.getByRole('region', { name: 'Calendrier des séances' });
    expect(within(calendar).getByText('janvier 2027')).toBeInTheDocument();
    expect(await screen.findByRole('link', { name: 'Séance 2/12 · lundi 11 janvier 2027' })).toHaveAttribute(
      'href',
      `/mon-espace/nettoyage/programmes/${PROGRAM_ID}/seances/0192f1c4-de70-7000-8000-000000000d01`,
    );
    const first = calls.find((call) => call.path === SESSIONS);
    expect(first?.query.get('from')).toBe('2026-12-31T23:00:00.000Z');
    expect(first?.query.get('to')).toBe('2027-01-31T23:00:00.000Z');
    fireEvent.click(within(calendar).getByRole('button', { name: 'Mois suivant' }));
    expect(
      await screen.findByRole('link', { name: 'Séance 6/12 · lundi 8 février 2027' }),
    ).toBeInTheDocument();
    expect(
      calls
        .filter((call) => call.path === SESSIONS)
        .at(-1)
        ?.query.get('from'),
    ).toBe('2027-01-31T23:00:00.000Z');
  });

  it('programme suspendu : causes, depuis quand, comment les lever', async () => {
    signIn();
    stubGateway({
      [`GET ${PROGRAM}`]: {
        status: 200,
        body: program({
          status: 'suspended',
          suspensionCauses: [
            { cause: 'overdue_sessions', since: '2027-01-05T10:00:00Z', reason: null },
            { cause: 'ksp_decision', since: '2027-01-06T10:00:00Z', reason: 'Accès au lieu impossible' },
          ],
        }),
      },
      [`GET ${SESSIONS}`]: { status: 200, body: list([]) },
    });
    render(<ProgramDetail id={PROGRAM_ID} />);
    const panel = await screen.findByRole('region', { name: 'Programme suspendu' });
    expect(panel).toHaveTextContent('Une séance réalisée n’est pas payée dans le délai.');
    expect(panel).toHaveTextContent('Payez la séance en retard');
    expect(panel).toHaveTextContent('Motif : Accès au lieu impossible');
    expect(within(panel).getByRole('link', { name: /Contacter le support/ })).toHaveAttribute(
      'href',
      '/contact?sujet=nettoyage',
    );
  });

  it('arrêt : effet expliqué, confirmation, programme relu', async () => {
    signIn();
    const { calls } = stubGateway({
      [`GET ${PROGRAM}`]: { status: 200, body: program({ status: 'in_progress' }) },
      [`GET ${SESSIONS}`]: { status: 200, body: list([]) },
      [`POST ${PROGRAM}/stop`]: { status: 200, body: program({ status: 'cancelled' }) },
    });
    render(<ProgramDetail id={PROGRAM_ID} />);
    const panel = await screen.findByRole('region', { name: 'Arrêter le programme' });
    expect(panel).toHaveTextContent('Les séances déjà réalisées restent dues.');
    fireEvent.click(within(panel).getByRole('button', { name: 'Arrêter le programme' }));
    fireEvent.click(within(panel).getByRole('button', { name: 'Oui, arrêter le programme' }));
    await waitFor(() => expect(screen.getByText('Arrêté')).toBeInTheDocument());
    expect(screen.queryByRole('region', { name: 'Arrêter le programme' })).not.toBeInTheDocument();
    expect(calls.find((call) => call.path === `${PROGRAM}/stop`)?.headers['Idempotency-Key']).toBeTruthy();
  });

  it('membre d’une entreprise : arrêt et renouvellement réservés aux administrateurs', async () => {
    signIn({ role: 'org_member' });
    stubGateway({
      [`GET ${PROGRAM}`]: {
        status: 200,
        body: program({ status: 'in_progress', lastSessionAt: '2027-01-18T07:00:00Z' }),
      },
      [`GET ${SESSIONS}`]: { status: 200, body: list([]) },
      ...roleRoute('org_member'),
    });
    render(<ProgramDetail id={PROGRAM_ID} />);
    expect(
      await screen.findByText('Seul un administrateur de l’entreprise peut arrêter le programme.'),
    ).toBeInTheDocument();
    expect(
      screen.getByText('Seul un administrateur de l’entreprise peut renouveler le programme.'),
    ).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Arrêter le programme' })).not.toBeInTheDocument();
  });

  it('lecteur : aucune action', async () => {
    signIn({ role: 'org_viewer' });
    stubGateway({
      [`GET ${PROGRAM}`]: { status: 200, body: program({ status: 'in_progress' }) },
      [`GET ${SESSIONS}`]: { status: 200, body: list([]) },
      ...roleRoute('org_viewer'),
    });
    render(<ProgramDetail id={PROGRAM_ID} />);
    await screen.findByRole('heading', { level: 1, name: 'Maison de Calavi' });
    await waitFor(() =>
      expect(screen.queryByRole('region', { name: 'Arrêter le programme' })).not.toBeInTheDocument(),
    );
  });

  it('renouvellement dans les derniers jours : date facultative, nouvelle demande', async () => {
    signIn();
    const { calls } = stubGateway({
      [`GET ${PROGRAM}`]: {
        status: 200,
        body: program({ status: 'in_progress', lastSessionAt: '2027-01-18T07:00:00Z' }),
      },
      [`GET ${SESSIONS}`]: { status: 200, body: list([]) },
      [`POST ${PROGRAM}/renew`]: { status: 200, body: request({ number: 'DN-000130' }) },
    });
    render(<ProgramDetail id={PROGRAM_ID} />);
    const panel = await screen.findByRole('region', { name: 'Renouvellement' });
    fireEvent.click(within(panel).getByRole('button', { name: 'Renouveler le programme' }));
    fireEvent.click(within(panel).getByRole('button', { name: 'Demander le renouvellement' }));
    expect(await within(panel).findByText(/la demande DN-000130 porte le nouveau devis/)).toBeInTheDocument();
    expect(within(panel).getByRole('link', { name: 'Voir la demande et le devis' })).toHaveAttribute(
      'href',
      `/mon-espace/nettoyage/demandes/${REQUEST_ID}`,
    );
    expect(calls.find((call) => call.path === `${PROGRAM}/renew`)?.body).toEqual({});
  });

  it('renouvellement trop tôt : proposé plus tard, sans bouton', async () => {
    signIn();
    stubGateway({
      [`GET ${PROGRAM}`]: {
        status: 200,
        body: program({ status: 'in_progress', lastSessionAt: '2027-06-18T07:00:00Z' }),
      },
      [`GET ${SESSIONS}`]: { status: 200, body: list([]) },
    });
    render(<ProgramDetail id={PROGRAM_ID} />);
    expect(
      await screen.findByText('Le renouvellement vous sera proposé à l’approche de la fin du programme.'),
    ).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Renouveler le programme' })).not.toBeInTheDocument();
  });

  it('renouvellement proposé par KSP : lien vers le devis, dans sa demande', async () => {
    signIn();
    stubGateway({
      [`GET ${PROGRAM}`]: {
        status: 200,
        body: program({
          status: 'in_progress',
          renewal: {
            status: 'proposed',
            proposedAt: '2027-01-04T09:00:00Z',
            quoteId: QUOTE_ID,
            visitRequired: false,
          },
        }),
      },
      [`GET ${SESSIONS}`]: { status: 200, body: list([]) },
      [`GET ${BASE}/quotes/${QUOTE_ID}`]: { status: 200, body: quote({ kind: 'renewal' }) },
    });
    render(<ProgramDetail id={PROGRAM_ID} />);
    expect(await screen.findByRole('link', { name: 'Voir le devis de renouvellement' })).toHaveAttribute(
      'href',
      `/mon-espace/nettoyage/demandes/${REQUEST_ID}#devis`,
    );
  });

  it('programme ponctuel terminé : « Commander à nouveau »', async () => {
    signIn();
    stubGateway({
      [`GET ${PROGRAM}`]: {
        status: 200,
        body: program({
          status: 'completed',
          schedule: { kind: 'one_off', startTime: '08:00', dates: ['2027-01-04'] },
        }),
      },
      [`GET ${SESSIONS}`]: { status: 200, body: list([]) },
    });
    render(<ProgramDetail id={PROGRAM_ID} />);
    expect(await screen.findByRole('link', { name: 'Commander à nouveau' })).toHaveAttribute(
      'href',
      `/mon-espace/nettoyage/programmes/${PROGRAM_ID}/commander-a-nouveau`,
    );
  });

  it('programme introuvable : message', async () => {
    signIn();
    stubGateway({
      [`GET ${PROGRAM}`]: {
        status: 404,
        body: errorBody('CLEANING_PROGRAM_NOT_FOUND', 'Programme introuvable.'),
      },
    });
    render(<ProgramDetail id={PROGRAM_ID} />);
    expect(
      await screen.findByText('Ce programme est introuvable, ou n’appartient pas au compte actif.'),
    ).toBeInTheDocument();
  });
});

describe('commander à nouveau', () => {
  const ONE_OFF = { kind: 'one_off', startTime: '08:00', dates: ['2027-01-04'], excludeHolidays: true };
  const preview = {
    occurrences: [{ date: '2027-02-15', start: '2027-02-15T07:00:00Z' }],
    count: 1,
    firstStart: '2027-02-15T07:00:00Z',
    lastStart: '2027-02-15T07:00:00Z',
    notices: [],
  };

  it('nouveau rythme avec aperçu, envoi, lien vers la nouvelle demande', async () => {
    signIn();
    const { calls } = stubGateway({
      [`GET ${PROGRAM}`]: { status: 200, body: program({ status: 'completed', schedule: ONE_OFF }) },
      [`POST ${BASE}/schedule-previews`]: { status: 200, body: preview },
      [`POST ${PROGRAM}/reorder`]: { status: 200, body: request({ id: 'req-2', number: 'DN-000131' }) },
    });
    render(<ReorderProgram id={PROGRAM_ID} />);
    expect(await screen.findByRole('heading', { level: 1, name: 'Commander à nouveau' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Envoyer ma commande' }));
    expect(await screen.findByText('Vérifiez le rythme : un champ est incomplet.')).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Jour à ajouter'), { target: { value: '2027-02-15' } });
    fireEvent.click(screen.getByRole('button', { name: 'Ajouter ce jour' }));
    expect(await screen.findByText(/1 séance prévue/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Envoyer ma commande' }));
    expect(await screen.findByRole('link', { name: 'Voir ma nouvelle demande' })).toHaveAttribute(
      'href',
      '/mon-espace/nettoyage/demandes/req-2',
    );
    expect(calls.find((call) => call.path === `${PROGRAM}/reorder`)?.body).toEqual({
      schedule: { kind: 'one_off', dates: ['2027-02-15'], startTime: '08:00', excludeHolidays: true },
    });
  });

  it('programme régulier : pas de nouvelle commande, renvoi au programme', async () => {
    signIn();
    stubGateway({ [`GET ${PROGRAM}`]: { status: 200, body: program({ status: 'in_progress' }) } });
    render(<ReorderProgram id={PROGRAM_ID} />);
    expect(
      await screen.findByText(/Seul un programme ponctuel terminé peut être commandé à nouveau/),
    ).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Envoyer ma commande' })).not.toBeInTheDocument();
  });
});
