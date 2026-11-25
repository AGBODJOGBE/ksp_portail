import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { session as sessionStore } from '@/lib/api';
import {
  CLAIM_ID,
  PROGRAM_ID,
  SESSION_ID,
  claim,
  completedSession,
  errorBody,
  list,
  program,
  session,
  sessionBody,
  stubGateway,
} from '@/features/cleaning/fixtures.test-utils';
import { ClaimDetail } from './claim-detail';
import { ClaimList } from './claim-list';
import { CleaningHome, CleaningTodo } from './cleaning-home';
import { CleaningTracking } from './cleaning-tracking';

let search = '';
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  usePathname: () => '/mon-espace/nettoyage',
  useSearchParams: () => new URLSearchParams(search),
}));

const ORG_ID = '0192f1c4-7a2b-7c3d-8e4f-5a6b7c8d0a01';
const BASE = '/api/v1/cleaning';
const CLAIM = `${BASE}/claims/${CLAIM_ID}`;
const money = (amount: number) => ({ amount, currency: 'XOF' });

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

const summary = (status: string, extra: Record<string, unknown> = {}) => ({
  id: `req-${status}`,
  number: status === 'quote_sent' ? 'DN-000125' : 'DN-000124',
  status,
  customerKind: 'individual',
  organizationId: null,
  placeTypeName: 'Villa',
  communeKey: 'abomey-calavi',
  communeName: 'Abomey-Calavi',
  cleaningTypes: [],
  nextVisitAt: null,
  createdAt: '2026-11-20T09:00:00Z',
  updatedAt: '2026-11-20T09:00:00Z',
  ...extra,
});

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date('2026-11-23T18:00:00Z'));
});

afterEach(() => {
  vi.useRealTimers();
  sessionStore.clear();
  vi.unstubAllGlobals();
  search = '';
});

describe('réclamations', () => {
  it('liste filtrée par état (adresse), lien vers chaque réclamation', async () => {
    signIn();
    search = 'statut=ouverte';
    const { calls } = stubGateway({ [`GET ${BASE}/claims`]: { status: 200, body: list([claim()]) } });
    render(<ClaimList />);
    expect(await screen.findByRole('link', { name: 'Travail incomplet' })).toHaveAttribute(
      'href',
      `/mon-espace/nettoyage/reclamations/${CLAIM_ID}`,
    );
    expect(screen.getByText('Ouverte le 23 novembre 2026 · 1 message')).toBeInTheDocument();
    expect(calls[0]?.query.get('status')).toBe('open');
  });

  it('fil des messages et réponse tant qu’elle est ouverte', async () => {
    signIn();
    const replied = claim({
      status: 'in_progress',
      messages: [
        ...claim().messages,
        {
          id: 'm-2',
          author: 'customer',
          authorId: 'u-1',
          text: 'Merci, j’attends.',
          at: '2026-11-23T18:00:00Z',
        },
      ],
    });
    const { calls } = stubGateway({
      [`GET ${CLAIM}`]: {
        status: 200,
        body: claim({
          photos: [
            {
              fileId: 'f-1',
              kind: 'claim',
              takenAt: '2026-11-23T12:00:00Z',
              url: 'https://files.ksp.bj/vitres.jpg',
              urlExpiresAt: '2026-11-23T12:05:00Z',
            },
          ],
        }),
      },
      [`POST ${CLAIM}/messages`]: { status: 200, body: replied },
    });
    render(<ClaimDetail id={CLAIM_ID} />);
    expect(await screen.findByRole('heading', { level: 1, name: 'Travail incomplet' })).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'Vos photos, photo 1' })).toHaveAttribute(
      'src',
      'https://files.ksp.bj/vitres.jpg',
    );
    const thread = screen.getByRole('region', { name: 'Échanges' });
    expect(thread).toHaveTextContent('Merci, nous regardons avec l’équipe.');
    expect(screen.getByRole('link', { name: 'Voir la séance' })).toHaveAttribute(
      'href',
      `/mon-espace/nettoyage/programmes/${PROGRAM_ID}/seances/${SESSION_ID}`,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Envoyer' }));
    expect(await screen.findByText('Écrivez votre message.')).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Votre message'), { target: { value: 'Merci, j’attends.' } });
    fireEvent.click(screen.getByRole('button', { name: 'Envoyer' }));
    expect(await screen.findByText('Message envoyé.')).toBeInTheDocument();
    expect(within(thread).getByText('Merci, j’attends.')).toBeInTheDocument();
    expect(calls.find((call) => call.path === `${CLAIM}/messages`)?.body).toEqual({
      text: 'Merci, j’attends.',
    });
  });

  it('décision : crédit au portefeuille, séance gratuite ; close, plus de réponse', async () => {
    signIn();
    stubGateway({
      [`GET ${CLAIM}`]: {
        status: 200,
        body: claim({
          status: 'resolved',
          closedAt: '2026-11-24T10:00:00Z',
          decision: {
            outcome: 'wallet_credit',
            creditAmount: money(9000),
            redoSessionId: null,
            reason: 'Vitres oubliées : moitié du prix créditée.',
            decidedBy: 's-1',
            decidedAt: '2026-11-24T10:00:00Z',
            approvalStatus: 'not_required',
            approvedBy: null,
            decidedByName: null,
          },
        }),
      },
    });
    render(<ClaimDetail id={CLAIM_ID} />);
    const decision = await screen.findByRole('region', { name: 'Décision de KSP' });
    expect(decision).toHaveTextContent('Un crédit vous est accordé');
    expect(decision).toHaveTextContent(/Crédit : 9\s000\sF\sCFA/);
    expect(within(decision).getByRole('link', { name: 'Voir mon portefeuille' })).toBeInTheDocument();
    expect(
      screen.getByText('La réclamation est close : vous ne pouvez plus y répondre.'),
    ).toBeInTheDocument();
    expect(screen.queryByLabelText('Votre message')).not.toBeInTheDocument();
  });

  it('lecteur d’une entreprise : pas de réponse', async () => {
    signIn({ role: 'org_viewer' });
    stubGateway({
      [`GET ${CLAIM}`]: { status: 200, body: claim({ organizationId: ORG_ID }) },
      [`GET /api/v1/identity/organizations/${ORG_ID}`]: { status: 200, body: { role: 'org_viewer' } },
    });
    render(<ClaimDetail id={CLAIM_ID} />);
    expect(
      await screen.findByText(
        'Votre rôle dans l’entreprise permet de suivre la réclamation, pas d’y répondre.',
      ),
    ).toBeInTheDocument();
    expect(screen.queryByLabelText('Votre message')).not.toBeInTheDocument();
  });

  it('réclamation introuvable', async () => {
    signIn();
    stubGateway({
      [`GET ${CLAIM}`]: { status: 404, body: errorBody('CLEANING_CLAIM_NOT_FOUND', 'Introuvable.') },
    });
    render(<ClaimDetail id={CLAIM_ID} />);
    expect(
      await screen.findByText('Cette réclamation est introuvable, ou n’appartient pas au compte actif.'),
    ).toBeInTheDocument();
  });
});

/** Routes du tableau : frais, devis, visites, programmes actifs et leurs séances. */
function dashboardRoutes() {
  return {
    [`GET ${BASE}/requests?status=awaiting_visit_fee`]: {
      status: 200,
      body: list([summary('awaiting_visit_fee')]),
    },
    [`GET ${BASE}/requests?status=quote_sent`]: { status: 200, body: list([summary('quote_sent')]) },
    [`GET ${BASE}/requests?status=visit_scheduled`]: {
      status: 200,
      body: list([
        summary('visit_scheduled', {
          id: 'req-visit',
          number: 'DN-000124',
          nextVisitAt: '2026-11-26T08:00:00Z',
        }),
      ]),
    },
    [`GET ${BASE}/requests`]: { status: 200, body: list([]) },
    [`GET ${BASE}/programs`]: {
      status: 200,
      body: list([
        program({ status: 'in_progress' }),
        program({
          id: 'p-2',
          number: 'PN-000058',
          status: 'suspended',
          suspensionCauses: [{ cause: 'overdue_sessions', since: '2026-11-20T10:00:00Z', reason: null }],
        }),
        program({
          id: 'p-3',
          number: 'PN-000040',
          status: 'completed',
          lastSessionAt: '2026-10-05T07:00:00Z',
        }),
      ]),
    },
    [`GET ${BASE}/programs/${PROGRAM_ID}/sessions`]: {
      status: 200,
      body: list([
        completedSession(),
        session({
          id: 's-next',
          rank: 4,
          scheduledStart: '2026-11-30T07:00:00Z',
          scheduledEnd: '2026-11-30T11:00:00Z',
        }),
      ]),
    },
    [`GET ${BASE}/programs/p-2/sessions`]: {
      status: 200,
      body: list([
        completedSession({
          id: 's-late',
          programId: 'p-2',
          programNumber: 'PN-000058',
          paymentStatus: 'overdue',
        }),
      ]),
    },
  };
}

describe('tableau du Nettoyage', () => {
  it('à faire : séances à payer (retard d’abord), frais, devis, programme suspendu ; prochains rendez-vous', async () => {
    signIn();
    const { calls } = stubGateway(dashboardRoutes());
    render(<CleaningHome />);
    const todo = await screen.findByRole('region', { name: 'À faire' });
    await within(todo).findByText('Séance 3/12 en retard — PN-000058');
    const titles = [
      'Séance 3/12 en retard — PN-000058',
      'Séance 3/12 à payer — PN-000057',
      'Frais de visite — DN-000124',
      'Devis — DN-000125',
      'Programme PN-000058 suspendu',
    ];
    const items = within(todo)
      .getAllByRole('listitem')
      .map((item) => titles.find((title) => item.textContent?.includes(title)));
    expect(items).toEqual([
      'Séance 3/12 en retard — PN-000058',
      'Séance 3/12 à payer — PN-000057',
      'Frais de visite — DN-000124',
      'Devis — DN-000125',
      'Programme PN-000058 suspendu',
    ]);
    expect(within(todo).getAllByRole('link', { name: /Payer la séance/ })[1]).toHaveAttribute(
      'href',
      `/mon-espace/nettoyage/programmes/${PROGRAM_ID}/seances/${SESSION_ID}`,
    );
    const agenda = screen.getByRole('list', { name: 'Prochains rendez-vous du Nettoyage' });
    expect(
      within(agenda)
        .getAllByRole('listitem')
        .map((item) => item.textContent),
    ).toEqual([
      expect.stringContaining('Visite des lieux — DN-000124'),
      expect.stringContaining('Séance 4/12 — PN-000057'),
    ]);
    // Un appel par programme actif ; le programme terminé depuis longtemps n'est pas lu.
    expect(calls.filter((call) => call.path.endsWith('/sessions')).map((call) => call.path)).toEqual([
      `${BASE}/programs/${PROGRAM_ID}/sessions`,
      `${BASE}/programs/p-2/sessions`,
    ]);
    expect(screen.getByRole('tab', { name: 'Demandes', selected: true })).toBeInTheDocument();
  });

  it('onglets : chaque liste n’est lue qu’à l’ouverture, flèches du clavier', async () => {
    signIn();
    const { calls } = stubGateway({
      ...dashboardRoutes(),
      [`GET ${BASE}/claims`]: { status: 200, body: list([claim()]) },
    });
    render(<CleaningHome />);
    const requests = await screen.findByRole('tab', { name: 'Demandes' });
    await waitFor(() => expect(calls.some((call) => call.path === `${BASE}/claims`)).toBe(false));
    fireEvent.keyDown(requests, { key: 'ArrowRight' });
    fireEvent.keyDown(screen.getByRole('tab', { name: 'Programmes' }), { key: 'ArrowRight' });
    expect(screen.getByRole('tab', { name: 'Réclamations' })).toHaveAttribute('aria-selected', 'true');
    expect(await screen.findByRole('link', { name: 'Travail incomplet' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Toutes mes réclamations' })).toHaveAttribute(
      'href',
      '/mon-espace/nettoyage/reclamations',
    );
  });
});

describe('panneau « Nettoyage » de Mon espace', () => {
  it('reprend les séances à payer, sans lire les séances à venir', async () => {
    signIn();
    const { calls } = stubGateway(dashboardRoutes());
    render(<CleaningTodo />);
    expect(await screen.findByText('Séance 3/12 à payer — PN-000057')).toBeInTheDocument();
    expect(screen.getByText('Séance 3/12 en retard — PN-000058')).toBeInTheDocument();
    const read = calls.filter((call) => call.path.endsWith('/sessions'));
    expect(read.every((call) => call.query.get('to') === '2026-11-23T18:00:00.000Z')).toBe(true);
  });

  it('programme qui vient de se terminer : sa dernière séance à payer reste dans « À faire »', async () => {
    signIn();
    stubGateway({
      [`GET ${BASE}/requests`]: { status: 200, body: list([]) },
      [`GET ${BASE}/programs`]: {
        status: 200,
        body: list([program({ status: 'completed', lastSessionAt: '2026-11-23T07:00:00Z' })]),
      },
      [`GET ${BASE}/programs/${PROGRAM_ID}/sessions`]: {
        status: 200,
        body: list([completedSession({ rank: 12 })]),
      },
    });
    render(<CleaningTodo />);
    expect(await screen.findByText('Séance 12/12 à payer — PN-000057')).toBeInTheDocument();
  });

  it('rien à faire : message', async () => {
    signIn();
    stubGateway({
      [`GET ${BASE}/requests`]: { status: 200, body: list([]) },
      [`GET ${BASE}/programs`]: { status: 200, body: list([]) },
    });
    render(<CleaningTodo />);
    expect(await screen.findByText('Rien à faire pour le Nettoyage.')).toBeInTheDocument();
  });
});

describe('« Suivre ma demande »', () => {
  it('demandes et programmes en cours, prochaine étape et qui doit agir', async () => {
    signIn();
    stubGateway({
      [`GET ${BASE}/requests`]: {
        status: 200,
        body: list([
          summary('quote_sent'),
          summary('visit_done', { id: 'r-2', number: 'DN-000126' }),
          summary('accepted', { id: 'r-3', number: 'DN-000100' }),
        ]),
      },
      [`GET ${BASE}/programs`]: { status: 200, body: list([program({ status: 'in_progress' })]) },
    });
    render(<CleaningTracking />);
    const quote = (await screen.findByRole('link', { name: 'DN-000125 · Villa' })).closest('li')!;
    expect(quote).toHaveTextContent('Lire le devis, puis l’accepter ou le refuser.');
    expect(quote).toHaveTextContent('À vous d’agir');
    expect(screen.getByRole('link', { name: 'DN-000126 · Villa' }).closest('li')).toHaveTextContent(
      'KSP s’en occupe',
    );
    expect(screen.queryByRole('link', { name: 'DN-000100 · Villa' })).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'PN-000057 · Maison de Calavi' })).toBeInTheDocument();
  });
});
