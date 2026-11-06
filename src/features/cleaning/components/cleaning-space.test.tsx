import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
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
import { CleaningSpace } from './cleaning-space';
import { MissionDetail } from './mission-detail';
import { RequestDetail } from './request-detail';

const push = vi.fn();
const search = '';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push, replace: vi.fn() }),
  usePathname: () => '/mon-espace/nettoyage/demandes',
  useSearchParams: () => new URLSearchParams(search),
}));

const SERVICES_ROUTE = 'GET /api/v1/cleaning/services';
const REQUESTS = '/api/v1/cleaning/quote-requests';

const PERSONAL = { type: 'individual', organizationId: null, organizationName: null };
const BUSINESS = {
  type: 'business',
  organizationId: '0192f1c4-7a2b-7c3d-8e4f-5a6b7c8d0000',
  organizationName: 'SARL Bénin Propre',
};
const BUSINESS_OWNED = { customerKind: 'business', organizationId: BUSINESS.organizationId };

function signIn(activeContext: typeof PERSONAL | typeof BUSINESS = PERSONAL) {
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
    activeContext,
  });
}

const plain = (text: string | null) => (text ?? '').replace(/\s/g, ' ');

beforeEach(() => {
  push.mockReset();
  resetServicesCache();
  signIn();
});
afterEach(() => {
  vi.unstubAllGlobals();
  session.clear();
});

describe('Mes prestations de nettoyage', () => {
  it('liste demandes et missions du compte personnel, avec pagination par curseur et états vides', async () => {
    const { calls } = stubGateway({
      [SERVICES_ROUTE]: { status: 200, body: SERVICES },
      [`GET ${REQUESTS}`]: [
        {
          status: 200,
          body: {
            data: Array.from({ length: 10 }, (_, index) => quoteRequest({ id: `perso-${index}` })),
            nextCursor: '0192f1c4-7a2b-7c3d-8e4f-5a6b7c8d1fff',
          },
        },
        {
          status: 200,
          body: {
            data: [
              quoteRequest({ id: 'perso-suite', status: 'quote_sent' }),
              quoteRequest({ id: 'entreprise', status: 'expired', ...BUSINESS_OWNED }),
            ],
            nextCursor: null,
          },
        },
      ],
      'GET /api/v1/cleaning/missions': { status: 200, body: { data: [], nextCursor: null } },
    });
    render(<CleaningSpace />);

    expect((await screen.findAllByText('Demande reçue')).length).toBe(10);
    expect(screen.getByText(/Aucune mission pour le moment/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Afficher plus' }));
    expect(await screen.findByText('Devis à étudier')).toBeInTheDocument();
    // Demande d'entreprise : hors du compte personnel.
    expect(screen.queryByText('Devis expiré')).not.toBeInTheDocument();
    expect(screen.queryByText('Entreprise')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Afficher plus' })).not.toBeInTheDocument();

    const pages = calls.filter((call) => call.method === 'GET' && call.path === REQUESTS);
    expect(pages.map((call) => call.query)).toEqual([
      { limit: '10' },
      { limit: '10', cursor: '0192f1c4-7a2b-7c3d-8e4f-5a6b7c8d1fff' },
    ]);
  });

  it('contexte entreprise : seulement ses demandes et missions, relues au changement de contexte', async () => {
    const { calls } = stubGateway({
      [SERVICES_ROUTE]: { status: 200, body: SERVICES },
      [`GET ${REQUESTS}`]: { status: 200, body: { data: [quoteRequest()], nextCursor: null } },
      'GET /api/v1/cleaning/missions': [
        { status: 200, body: { data: [], nextCursor: null } },
        { status: 200, body: { data: [mission({ id: 'perso' })], nextCursor: 'curseur-2' } },
        {
          status: 200,
          body: {
            data: [mission({ id: 'entreprise', status: 'in_progress', ...BUSINESS_OWNED })],
            nextCursor: null,
          },
        },
      ],
    });
    render(<CleaningSpace />);
    expect(await screen.findByText('Demande reçue')).toBeInTheDocument();

    act(() =>
      session.switchContext({
        accessToken: 'jeton-entreprise',
        accessTokenExpiresAt: '2099-01-01T00:15:00Z',
        activeContext: BUSINESS,
      }),
    );

    // Les deux listes sont relues ; la page suivante des missions est lue d'elle-même.
    expect(
      await screen.findByText('Aucune demande de devis au nom de cette entreprise.'),
    ).toBeInTheDocument();
    expect(await screen.findByText('En cours')).toBeInTheDocument();
    expect(screen.queryByText('Demande reçue')).not.toBeInTheDocument();
    const missions = calls.filter((call) => call.path === '/api/v1/cleaning/missions');
    expect(missions.map((call) => call.headers.Authorization)).toEqual([
      'Bearer jeton-acces',
      'Bearer jeton-entreprise',
      'Bearer jeton-entreprise',
    ]);
  });

  it('accepte un devis : créneau, paiement, clé d’idempotence, puis la mission', async () => {
    const { calls } = stubGateway({
      [SERVICES_ROUTE]: { status: 200, body: SERVICES },
      [`GET ${REQUESTS}/${REQUEST_ID}`]: {
        status: 200,
        body: quoteRequest({ status: 'quote_sent', quote: QUOTE }),
      },
      [`POST ${REQUESTS}/${REQUEST_ID}/accept`]: {
        status: 200,
        body: {
          request: quoteRequest({ status: 'accepted', quote: QUOTE, missionId: MISSION_ID }),
          mission: mission(),
        },
      },
    });
    render(<RequestDetail id={REQUEST_ID} />);

    // Sous-total et total d'un passage unique : même montant.
    const amounts = await screen.findAllByText(/^34 000/);
    expect(amounts.map((amount) => plain(amount.textContent))).toContain('34 000 F CFA');
    expect(screen.getByText(/Valable jusqu’au 4 novembre 2099 à 09:00/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Accepter le devis' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Confirmer et réserver' }));
    expect(await screen.findByText('Choisissez un créneau.')).toBeInTheDocument();

    fireEvent.click(screen.getByLabelText('vendredi 6 novembre 2099, de 13:00 à 17:00'));
    fireEvent.click(screen.getByLabelText(/^Totalité/));
    fireEvent.click(screen.getByRole('button', { name: 'Confirmer et réserver' }));

    await waitFor(() =>
      expect(push).toHaveBeenCalledWith(`/mon-espace/nettoyage/missions/${MISSION_ID}?reservation=confirmee`),
    );
    const accept = calls.find((call) => call.path.endsWith('/accept'));
    expect(accept?.body).toEqual({
      slotStart: '2099-11-06T12:00:00Z',
      paymentPlan: { option: 'full', timing: 'before', method: 'cash' },
    });
    expect(accept?.headers['Idempotency-Key']).toMatch(/^[A-Za-z0-9_-]{8,100}$/);
  });

  it('plan de paiement refusé (`details.field` = paymentPlan) : message près du paiement', async () => {
    stubGateway({
      [SERVICES_ROUTE]: { status: 200, body: SERVICES },
      [`GET ${REQUESTS}/${REQUEST_ID}`]: {
        status: 200,
        body: quoteRequest({ status: 'quote_sent', quote: QUOTE }),
      },
      [`POST ${REQUESTS}/${REQUEST_ID}/accept`]: {
        status: 400,
        body: errorBody('CLEANING_VALIDATION_FAILED', 'Choisissez votre façon de payer.', {
          field: 'paymentPlan',
        }),
      },
    });
    render(<RequestDetail id={REQUEST_ID} />);
    fireEvent.click(await screen.findByRole('button', { name: 'Accepter le devis' }));
    fireEvent.click(await screen.findByLabelText('vendredi 6 novembre 2099, de 13:00 à 17:00'));
    fireEvent.click(screen.getByRole('button', { name: 'Confirmer et réserver' }));
    const payment = await screen.findByRole('group', { name: 'Votre paiement' });
    expect(await within(payment).findByText('Choisissez votre façon de payer.')).toBeInTheDocument();
  });

  it('montre la visite planifiée et ce qui se passe ensuite', async () => {
    stubGateway({
      [SERVICES_ROUTE]: { status: 200, body: SERVICES },
      [`GET ${REQUESTS}/${REQUEST_ID}`]: {
        status: 200,
        body: quoteRequest({
          status: 'visit_scheduled',
          requestedTeamSize: 3,
          visit: {
            id: '0192f1c4-7a2b-7c3d-8e4f-5a6b7c8d2001',
            status: 'scheduled',
            scheduledAt: '2099-11-03T09:00:00Z',
            agentId: '0192f1c4-7a2b-7c3d-8e4f-5a6b7c8d0002',
            report: null,
            completedAt: null,
          },
        }),
      },
    });
    render(<RequestDetail id={REQUEST_ID} />);
    expect(await screen.findByText('Visite planifiée')).toBeInTheDocument();
    expect(
      screen.getByText(/Un agent KSP visitera les lieux le 3 novembre 2099 à 10:00/),
    ).toBeInTheDocument();
    expect(screen.getByText('Prévue le 3 novembre 2099 à 10:00')).toBeInTheDocument();
    expect(screen.getByText('3 agents')).toBeInTheDocument();
    expect(screen.getByText('2 agents')).toBeInTheDocument();
  });

  it('une entreprise ne choisit pas de paiement : facture mensuelle', async () => {
    const { calls } = stubGateway({
      [SERVICES_ROUTE]: { status: 200, body: SERVICES },
      [`GET ${REQUESTS}/${REQUEST_ID}`]: {
        status: 200,
        body: quoteRequest({ status: 'quote_sent', customerKind: 'business', daysPerWeek: 5, quote: QUOTE }),
      },
      [`POST ${REQUESTS}/${REQUEST_ID}/accept`]: {
        status: 200,
        body: { request: quoteRequest({ status: 'accepted', quote: QUOTE }), mission: mission() },
      },
    });
    render(<RequestDetail id={REQUEST_ID} />);
    expect(await screen.findByText('5 jours par semaine')).toBeInTheDocument();
    // Pas d'acompte pour une entreprise.
    expect(screen.queryByText('Acompte (30 %)')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Accepter le devis' }));
    expect((await screen.findAllByText(/se règle par une facture mensuelle/)).length).toBeGreaterThan(0);
    expect(screen.queryByLabelText(/^Totalité/)).not.toBeInTheDocument();
    fireEvent.click(screen.getByLabelText('jeudi 5 novembre 2099, de 08:00 à 12:00'));
    fireEvent.click(screen.getByRole('button', { name: 'Confirmer et réserver' }));
    await waitFor(() => expect(push).toHaveBeenCalled());
    // `paymentPlan` facultatif depuis le contrat (#19) : il n'est pas envoyé pour une entreprise.
    expect(calls.find((call) => call.path.endsWith('/accept'))?.body).toEqual({
      slotStart: '2099-11-05T07:00:00Z',
    });
  });

  it('compte entreprise suspendu par KSP : l’acceptation du devis est refusée avec un message clair', async () => {
    stubGateway({
      [SERVICES_ROUTE]: { status: 200, body: SERVICES },
      [`GET ${REQUESTS}/${REQUEST_ID}`]: {
        status: 200,
        body: quoteRequest({ status: 'quote_sent', ...BUSINESS_OWNED, quote: QUOTE }),
      },
      [`POST ${REQUESTS}/${REQUEST_ID}/accept`]: {
        status: 422,
        body: errorBody('CLEANING_ORGANIZATION_SUSPENDED', 'Organisation suspendue.'),
      },
    });
    render(<RequestDetail id={REQUEST_ID} />);
    fireEvent.click(await screen.findByRole('button', { name: 'Accepter le devis' }));
    fireEvent.click(await screen.findByLabelText('jeudi 5 novembre 2099, de 08:00 à 12:00'));
    fireEvent.click(screen.getByRole('button', { name: 'Confirmer et réserver' }));
    expect(
      await screen.findByText(
        'Votre compte entreprise est suspendu par KSP : ce devis ne peut pas être accepté avant sa réactivation. Contactez KSP pour en savoir plus.',
      ),
    ).toBeInTheDocument();
    expect(push).not.toHaveBeenCalled();
  });

  it('devis expiré pendant la lecture : message de la gateway, demande relue, plus d’acceptation', async () => {
    stubGateway({
      [SERVICES_ROUTE]: { status: 200, body: SERVICES },
      [`GET ${REQUESTS}/${REQUEST_ID}`]: [
        { status: 200, body: quoteRequest({ status: 'quote_sent', quote: QUOTE }) },
        { status: 200, body: quoteRequest({ status: 'expired', quote: QUOTE }) },
      ],
      [`POST ${REQUESTS}/${REQUEST_ID}/accept`]: {
        status: 422,
        body: errorBody('CLEANING_QUOTE_EXPIRED', 'Ce devis a expiré.'),
      },
    });
    render(<RequestDetail id={REQUEST_ID} />);
    fireEvent.click(await screen.findByRole('button', { name: 'Accepter le devis' }));
    fireEvent.click(await screen.findByLabelText('jeudi 5 novembre 2099, de 08:00 à 12:00'));
    fireEvent.click(screen.getByRole('button', { name: 'Confirmer et réserver' }));

    expect(await screen.findByText('Ce devis a expiré.')).toBeInTheDocument();
    expect(await screen.findByText('Devis expiré')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Accepter le devis' })).not.toBeInTheDocument();
  });

  it('refuse un devis avec un motif facultatif, et signale un conflit 409', async () => {
    const { calls } = stubGateway({
      [SERVICES_ROUTE]: { status: 200, body: SERVICES },
      [`GET ${REQUESTS}/${REQUEST_ID}`]: {
        status: 200,
        body: quoteRequest({ status: 'quote_sent', quote: QUOTE }),
      },
      [`POST ${REQUESTS}/${REQUEST_ID}/decline`]: [
        { status: 409, body: errorBody('CLEANING_CONCURRENT_UPDATE', 'La demande vient de changer.') },
        { status: 200, body: quoteRequest({ status: 'declined', quote: QUOTE, closingReason: 'Budget.' }) },
      ],
    });
    render(<RequestDetail id={REQUEST_ID} />);
    fireEvent.click(await screen.findByRole('button', { name: 'Refuser le devis' }));
    fireEvent.change(screen.getByLabelText('Motif (facultatif)'), { target: { value: 'Budget.' } });
    fireEvent.click(screen.getByRole('button', { name: 'Confirmer le refus' }));
    expect(
      await screen.findByText(/La demande vient de changer\. La demande vient d’être modifiée/),
    ).toBeInTheDocument();

    fireEvent.click(await screen.findByRole('button', { name: 'Refuser le devis' }));
    fireEvent.click(screen.getByRole('button', { name: 'Confirmer le refus' }));
    expect(await screen.findByText('Devis refusé')).toBeInTheDocument();
    const declines = calls.filter((call) => call.path.endsWith('/decline'));
    expect(declines[0]?.body).toEqual({ reason: 'Budget.' });
    // Le motif saisi est gardé pour le nouvel essai.
    expect(declines[1]?.body).toEqual({ reason: 'Budget.' });
  });

  it('demande introuvable : message, sans « Réessayer »', async () => {
    stubGateway({
      [SERVICES_ROUTE]: { status: 200, body: SERVICES },
      [`GET ${REQUESTS}/${REQUEST_ID}`]: {
        status: 404,
        body: errorBody('CLEANING_REQUEST_NOT_FOUND', 'Demande introuvable.'),
      },
    });
    render(<RequestDetail id={REQUEST_ID} />);
    expect(await screen.findByText(/Cet élément est introuvable/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Réessayer' })).not.toBeInTheDocument();
  });

  it('mission d’entreprise suspendue pour impayés : état, passages annulés, facture mensuelle', async () => {
    stubGateway({
      [SERVICES_ROUTE]: { status: 200, body: SERVICES },
      [`GET ${REQUESTS}/${REQUEST_ID}`]: {
        status: 200,
        body: quoteRequest({ status: 'accepted', customerKind: 'business' }),
      },
      [`GET /api/v1/cleaning/missions/${MISSION_ID}`]: {
        status: 200,
        body: mission({
          ...BUSINESS_OWNED,
          status: 'to_schedule',
          suspension: {
            cause: 'unpaid_invoices',
            causes: ['unpaid_invoices'],
            since: '2026-12-11T09:00:00Z',
            unpaidCount: 2,
          },
          interventions: [
            {
              ...mission().interventions[0],
              status: 'cancelled',
              cancellationCause: 'suspension',
              agents: [],
            },
          ],
        }),
      },
    });
    render(<MissionDetail id={MISSION_ID} />);
    expect(
      await screen.findByText(/Service suspendu depuis le 11 décembre 2026 : 2 factures impayées/),
    ).toBeInTheDocument();
    expect(screen.getByText('Suspendue (impayés)')).toBeInTheDocument();
    expect(screen.queryByText('À planifier')).not.toBeInTheDocument();
    expect(screen.getAllByRole('link', { name: 'Voir mes factures' })[0]).toHaveAttribute(
      'href',
      '/mon-espace/factures',
    );
    expect(
      screen.getByText(/Contrat d’entreprise : la prestation est réglée par une facture mensuelle/),
    ).toBeInTheDocument();
    expect(screen.queryByText('Acompte reçu')).not.toBeInTheDocument();
    const passages = screen.getByRole('region', { name: 'Passages' });
    expect(within(passages).getByText('jeudi 5 novembre 2099, 08:00')).toBeInTheDocument();
    expect(within(passages).getByText('Annulé pendant la suspension du service')).toBeInTheDocument();
  });

  it('compte entreprise suspendu par KSP (ADR-030) : texte juste, sans « 0 impayé »', async () => {
    stubGateway({
      [SERVICES_ROUTE]: { status: 200, body: SERVICES },
      [`GET /api/v1/cleaning/missions/${MISSION_ID}`]: {
        status: 200,
        body: mission({
          ...BUSINESS_OWNED,
          status: 'to_schedule',
          suspension: {
            cause: 'organization_suspended',
            causes: ['organization_suspended'],
            since: '2026-12-11T09:00:00Z',
            unpaidCount: 0,
          },
        }),
      },
    });
    render(<MissionDetail id={MISSION_ID} />);
    const notice = await screen.findByText(/Service suspendu depuis le 11 décembre 2026/);
    expect(notice).toHaveTextContent(
      'Votre compte entreprise est suspendu par KSP : le service reprendra à sa réactivation.',
    );
    expect(notice.textContent).not.toMatch(/\b0\b|impayé/);
    expect(screen.getByText('Suspendue (compte entreprise)')).toBeInTheDocument();
  });

  it('causes cumulées : impayés et compte entreprise suspendu', async () => {
    stubGateway({
      [SERVICES_ROUTE]: { status: 200, body: SERVICES },
      [`GET /api/v1/cleaning/missions/${MISSION_ID}`]: {
        status: 200,
        body: mission({
          ...BUSINESS_OWNED,
          status: 'to_schedule',
          suspension: {
            cause: 'unpaid_invoices',
            causes: ['unpaid_invoices', 'organization_suspended'],
            since: '2026-12-11T09:00:00Z',
            unpaidCount: 1,
          },
        }),
      },
    });
    render(<MissionDetail id={MISSION_ID} />);
    expect(
      await screen.findByText(
        /pour deux raisons : votre compte entreprise est suspendu par KSP, et il reste 1 facture impayée\. Le service reprendra quand les deux seront levées/,
      ),
    ).toBeInTheDocument();
    expect(screen.getByText('Suspendue (compte entreprise et impayés)')).toBeInTheDocument();
    expect(screen.getAllByRole('link', { name: 'Voir mes factures' }).length).toBeGreaterThan(0);
  });

  it('mission d’un particulier : option de paiement, liste de contrôle, reprise après suspension', async () => {
    const base = mission().interventions[0]!;
    stubGateway({
      [SERVICES_ROUTE]: { status: 200, body: SERVICES },
      [`GET ${REQUESTS}/${REQUEST_ID}`]: { status: 200, body: quoteRequest({ status: 'accepted' }) },
      [`GET /api/v1/cleaning/missions/${MISSION_ID}`]: {
        status: 200,
        body: mission({
          recurrence: { period: 'week', visitsPerPeriod: 1, durationMonths: 2 },
          plannedInterventions: 8,
          interventions: [
            { ...base, id: 'a', status: 'cancelled', cancellationCause: 'suspension' },
            {
              ...base,
              id: 'b',
              checklist: [
                { code: 'arrival', label: 'Arrivée sur place et accueil du client', done: true },
                { code: 'floors', label: 'Sols', done: false },
              ],
            },
          ],
        }),
      },
    });
    render(<MissionDetail id={MISSION_ID} />);
    expect(await screen.findByText('Acompte reçu')).toBeInTheDocument();
    expect(screen.getByText('Acompte, avant la prestation, espèces')).toBeInTheDocument();
    expect(screen.getByText(/Le service a repris/)).toBeInTheDocument();
    expect(screen.getByText('1 passage par semaine, pendant 2 mois')).toBeInTheDocument();
    expect(screen.getByText('Liste de contrôle : 1 sur 2')).toBeInTheDocument();
    expect(screen.getAllByText(/Awa B\./).length).toBeGreaterThan(0);
    // Acompte reçu : le solde se paie en ligne ; son montant (calculé par KSP) est sur la page de paiement.
    expect(
      await screen.findByRole('button', { name: 'Payer le solde par Mobile Money' }),
    ).toBeInTheDocument();
    expect(screen.getByText(/Le montant restant dû est calculé par KSP/)).toBeInTheDocument();
  });

  it('mission d’un particulier, acompte attendu : paiement en ligne de l’acompte (ADR-031)', async () => {
    const { calls } = stubGateway({
      [SERVICES_ROUTE]: { status: 200, body: SERVICES },
      [`GET /api/v1/cleaning/missions/${MISSION_ID}`]: {
        status: 200,
        body: mission({
          payment: {
            ...mission().payment,
            status: 'due',
            paid: { amount: 0, currency: 'XOF' },
            payments: [],
          },
        }),
      },
      'POST /api/v1/payment/payments': {
        status: 422,
        body: errorBody('PAYMENT_NOTHING_DUE', 'Il n’y a rien à payer pour le moment.'),
      },
    });
    render(<MissionDetail id={MISSION_ID} />);
    const pay = await screen.findByRole('button', { name: 'Payer l’acompte par Mobile Money' });
    expect(screen.getByText(/Montant à payer/)).toHaveTextContent(/10\s200\sF\sCFA/);
    fireEvent.click(pay);
    expect(await screen.findByText(/Ce montant est déjà réglé/)).toBeInTheDocument();
    const create = calls.find((call) => call.method === 'POST');
    expect(create?.body).toEqual({ subjectType: 'cleaning_mission', subjectId: MISSION_ID, part: 'deposit' });
    expect(create?.headers['Idempotency-Key']).toBeTruthy();
    // Refus « rien à payer » : la mission est relue.
    await waitFor(() =>
      expect(calls.filter((call) => call.path === `/api/v1/cleaning/missions/${MISSION_ID}`)).toHaveLength(2),
    );
  });

  it('mission d’entreprise : pas de paiement en ligne (facture mensuelle)', async () => {
    stubGateway({
      [SERVICES_ROUTE]: { status: 200, body: SERVICES },
      [`GET /api/v1/cleaning/missions/${MISSION_ID}`]: {
        status: 200,
        body: mission({ ...BUSINESS_OWNED, payment: { ...mission().payment, status: 'due' } }),
      },
    });
    render(<MissionDetail id={MISSION_ID} />);
    expect(await screen.findByText(/Contrat d’entreprise/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /par Mobile Money/ })).not.toBeInTheDocument();
  });
});

describe('Détail d’une demande : réponses lisibles (ADR-037)', () => {
  const field = (code: string, label: string, display: string) => ({
    code,
    label,
    type: 'number',
    value: 0,
    display,
    unitLabel: null,
  });

  function renderRequest(overrides: Record<string, unknown>) {
    stubGateway({
      [SERVICES_ROUTE]: { status: 200, body: SERVICES },
      [`GET ${REQUESTS}/${REQUEST_ID}`]: { status: 200, body: quoteRequest(overrides) },
    });
    render(<RequestDetail id={REQUEST_ID} />);
  }

  it('affiche `answerSummary` tel quel : libellé et valeur, options, fréquence', async () => {
    renderRequest({
      answers: { surface: 120 },
      answerSummary: {
        fields: [field('surface', 'Superficie', '120 m²'), field('dirt', 'Niveau de saleté', 'Très sale')],
        options: [
          { optionCode: 'windows', label: 'Vitres', fields: [field('count', 'Nombre de fenêtres', '6')] },
          { optionCode: 'furniture', label: 'Mobilier', fields: [] },
        ],
        frequency: { code: 'weekly', label: 'Toutes les semaines' },
      },
    });
    expect(await screen.findByText('Superficie : 120 m²')).toBeInTheDocument();
    expect(screen.getByText('Niveau de saleté : Très sale')).toBeInTheDocument();
    expect(screen.getByText('Vitres (Nombre de fenêtres : 6)')).toBeInTheDocument();
    expect(screen.getByText('Mobilier')).toBeInTheDocument();
    expect(screen.getByText('Toutes les semaines')).toBeInTheDocument();
    // Aucun code brut des réponses.
    expect(screen.queryByText(/surface/)).toBeNull();
  });

  it('demande à l’ancien format : le résumé du service (« Type de locaux », « Quantité »)', async () => {
    renderRequest({
      answerSummary: {
        fields: [
          field('premisesType', 'Type de locaux', 'Maison'),
          field('quantity', 'Quantité', '6 pièces'),
        ],
        options: [],
        frequency: null,
      },
    });
    expect(await screen.findByText('Type de locaux : Maison')).toBeInTheDocument();
    expect(screen.getByText('Quantité : 6 pièces')).toBeInTheDocument();
    expect(screen.queryByText('Fréquence')).toBeNull();
  });

  it('sans résumé ni réponses lisibles : repli explicite, jamais de valeurs brutes', async () => {
    renderRequest({ answerSummary: null });
    expect(
      await screen.findByText('Le détail de vos réponses n’est pas disponible pour cette demande.'),
    ).toBeInTheDocument();
    expect(screen.queryByText('house')).toBeNull();
  });
});
