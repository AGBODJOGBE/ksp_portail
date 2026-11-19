import { fireEvent, render, screen, within } from '@testing-library/react';
import { session } from '@/lib/api';
import { resetServicesCache } from '@/features/cleaning/api';
import {
  MISSION_ID,
  QUOTE,
  REQUEST_ID,
  SERVICES,
  WEEKLY_DATES,
  WEEKLY_SCHEDULE,
  errorBody,
  mission,
  quoteRequest,
  stubGateway,
} from '@/features/cleaning/fake-gateway.test-utils';
import { MissionDetail } from './mission-detail';
import { RequestDetail } from './request-detail';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  usePathname: () => '/mon-espace/nettoyage/missions',
  useSearchParams: () => new URLSearchParams(''),
}));

const SERVICES_ROUTE = 'GET /api/v1/cleaning/services';
const MISSION_ROUTE = `GET /api/v1/cleaning/missions/${MISSION_ID}`;
const ORGANIZATION_ID = '0192f1c4-7a2b-7c3d-8e4f-5a6b7c8d0000';
const PASSAGE = mission().interventions[0]!;

function signIn(organizationId: string | null = null) {
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
    activeContext: organizationId
      ? { type: 'business', organizationId, organizationName: 'SARL Bénin Propre' }
      : { type: 'individual', organizationId: null, organizationName: null },
  });
}

/** Mission récurrente avec plan : 2 passages faits, 1 planifié, 1 à replanifier, 1 reporté avec motif. */
function plannedMission(overrides: Record<string, unknown> = {}) {
  const at = (date: string) => `${date}T07:00:00Z`;
  return mission({
    schedule: WEEKLY_SCHEDULE,
    scheduledDates: WEEKLY_DATES,
    recurrence: { period: 'week', visitsPerPeriod: 3, durationMonths: 12 },
    chosenSlot: { start: at('2026-11-11'), end: at('2026-11-11').replace('07:', '09:') },
    plannedInterventions: 157,
    completedInterventions: 2,
    interventions: [
      {
        ...PASSAGE,
        id: 'p1',
        status: 'completed',
        scheduledStart: at('2026-11-11'),
        completedAt: at('2026-11-11'),
      },
      {
        ...PASSAGE,
        id: 'p2',
        status: 'completed',
        scheduledStart: at('2026-11-14'),
        completedAt: at('2026-11-14'),
        beforePhotoFileIds: ['f1'],
        afterPhotoFileIds: ['f2'],
      },
      {
        ...PASSAGE,
        id: 'p3',
        status: 'cancelled',
        scheduledStart: at('2026-11-16'),
        cancellationCause: 'manual',
        toReschedule: true,
        changeReason: 'Agent indisponible ce jour-là.',
      },
      { ...PASSAGE, id: 'p4', scheduledStart: at('2026-11-21'), changeReason: 'Demande du client.' },
    ],
    ...overrides,
  });
}

const photo = (fileId: string, kind: string, url: string | null) => ({
  fileId,
  kind,
  fileName: `${kind}.jpg`,
  contentType: 'image/jpeg',
  sizeBytes: 1000,
  uploadedAt: '2026-11-14T08:05:00Z',
  downloadUrl: url,
  downloadExpiresAt: url ? '2099-11-14T08:10:00Z' : null,
});

beforeEach(() => {
  // Le calendrier distingue les dates passées : « aujourd'hui » est fixé au 12 novembre 2026.
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date('2026-11-12T10:00:00Z'));
  resetServicesCache();
  signIn();
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  session.clear();
});

describe('Mission avec un plan de passages (ADR-052, 053)', () => {
  it('résume le plan à la place de la régularité, et montre le calendrier faits / planifiés / à planifier', async () => {
    stubGateway({
      [SERVICES_ROUTE]: { status: 200, body: SERVICES },
      [MISSION_ROUTE]: { status: 200, body: plannedMission() },
    });
    render(<MissionDetail id={MISSION_ID} />);
    const panel = await screen.findByRole('region', { name: 'Plan des passages' });
    const summary =
      '157 passages, chaque lundi, mercredi et samedi, du 11 nov. 2026 au 10 nov. 2027, à 08:00';
    expect(within(panel).getByText(summary)).toBeInTheDocument();
    // Réservation : le plan remplace l'ancienne récurrence, le créneau est le premier passage.
    const booking = screen.getByRole('region', { name: 'Réservation' });
    expect(within(booking).getByText(summary)).toBeInTheDocument();
    expect(within(booking).queryByText(/par semaine, pendant/)).not.toBeInTheDocument();
    expect(within(booking).getByText('Premier passage')).toBeInTheDocument();
    // Progression de la gateway et calendrier : ouvert sur le premier mois qui n'est pas tout fait.
    expect(within(panel).getByRole('progressbar', { name: 'Passages faits' })).toHaveAttribute(
      'aria-valuetext',
      '2 sur 157',
    );
    const calendar = within(panel).getByRole('region', { name: 'Calendrier des passages' });
    expect(within(calendar).getByText('novembre 2026')).toBeInTheDocument();
    expect(within(calendar).getByText('mercredi 11 novembre 2026 : Fait')).toBeInTheDocument();
    expect(within(calendar).getByText('samedi 21 novembre 2026 : Planifié')).toBeInTheDocument();
    expect(within(calendar).getByText('lundi 16 novembre 2026 : À planifier')).toBeInTheDocument();
    // Légende : 2 faits, 1 planifié, 154 à planifier.
    expect(within(calendar).getByText('Fait').parentElement).toHaveTextContent('Fait 2');
    expect(within(calendar).getByText('À planifier').parentElement).toHaveTextContent('À planifier 154');
    expect(within(calendar).getByRole('button', { name: 'Mois précédent' })).toBeDisabled();
    fireEvent.click(within(calendar).getByRole('button', { name: 'Mois suivant' }));
    expect(within(calendar).getByText('décembre 2026')).toBeInTheDocument();
  });

  it('passage annulé pour être replanifié : « À replanifier », jamais « Annulé », avec le motif ; motif d’un report', async () => {
    stubGateway({
      [SERVICES_ROUTE]: { status: 200, body: SERVICES },
      [MISSION_ROUTE]: { status: 200, body: plannedMission() },
    });
    render(<MissionDetail id={MISSION_ID} />);
    const passages = await screen.findByRole('region', { name: 'Passages' });
    const items = within(passages)
      .getAllByRole('listitem')
      .filter((item) => item.parentElement?.tagName === 'OL');
    const third = items[2]!;
    expect(within(third).getByText('À replanifier')).toBeInTheDocument();
    expect(within(third).queryByText('Annulé')).not.toBeInTheDocument();
    expect(within(third).getByText('Motif : Agent indisponible ce jour-là.')).toBeInTheDocument();
    expect(within(items[3]!).getByText('Motif du report : Demande du client.')).toBeInTheDocument();
  });

  it('photos avant et après : chargées à l’ouverture, erreur avec « Réessayer », adresse expirée redemandée', async () => {
    const { calls } = stubGateway({
      [SERVICES_ROUTE]: { status: 200, body: SERVICES },
      [MISSION_ROUTE]: { status: 200, body: plannedMission() },
      'GET /api/v1/cleaning/interventions/p2/photos': [
        { status: 503, body: errorBody('GATEWAY_SERVICE_UNAVAILABLE', 'Service indisponible.') },
        {
          status: 200,
          body: { data: [photo('f1', 'before', 'https://files.ksp.bj/a?sig=1'), photo('f2', 'after', null)] },
        },
        {
          status: 200,
          body: { data: [photo('f1', 'before', 'https://files.ksp.bj/a?sig=2'), photo('f2', 'after', null)] },
        },
      ],
    });
    render(<MissionDetail id={MISSION_ID} />);
    const photosRoute = (call: { path: string }) => call.path.endsWith('/photos');
    const show = await screen.findByRole('button', { name: 'Voir les photos avant et après (2)' });
    // Rien n'est lu avant l'ouverture.
    expect(calls.filter(photosRoute)).toHaveLength(0);
    fireEvent.click(show);
    expect(await screen.findByText(/Les photos n’ont pas pu être chargées/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Réessayer' }));
    const image = await screen.findByRole('img', { name: 'Photo avant le passage du 14 novembre 2026' });
    expect(image).toHaveAttribute('src', 'https://files.ksp.bj/a?sig=1');
    expect(screen.getByText('Photo indisponible pour le moment')).toBeInTheDocument();
    // Adresse expirée : l'image ne se charge plus, la liste est redemandée (une fois).
    fireEvent.error(image);
    expect(await screen.findByRole('img', { name: /Photo avant/ })).toHaveAttribute(
      'src',
      'https://files.ksp.bj/a?sig=2',
    );
    expect(calls.filter(photosRoute)).toHaveLength(3);
    // Fermée puis rouverte : relue, jamais gardée.
    fireEvent.click(screen.getByRole('button', { name: 'Masquer les photos' }));
    fireEvent.click(screen.getByRole('button', { name: 'Voir les photos avant et après (2)' }));
    await screen.findByRole('img', { name: /Photo avant/ });
    expect(calls.filter(photosRoute)).toHaveLength(4);
  });

  it('photos : passage sans photo lisible, état vide', async () => {
    stubGateway({
      [SERVICES_ROUTE]: { status: 200, body: SERVICES },
      [MISSION_ROUTE]: { status: 200, body: plannedMission() },
      'GET /api/v1/cleaning/interventions/p2/photos': { status: 200, body: { data: [] } },
    });
    render(<MissionDetail id={MISSION_ID} />);
    fireEvent.click(await screen.findByRole('button', { name: /Voir les photos/ }));
    expect(await screen.findByText('Aucune photo pour ce passage.')).toBeInTheDocument();
  });

  it('mission récurrente commencée : « Arrêter la suite », passages faits dus, trop-payé au portefeuille', async () => {
    stubGateway({
      [SERVICES_ROUTE]: { status: 200, body: SERVICES },
      [MISSION_ROUTE]: { status: 200, body: plannedMission() },
      [`POST /api/v1/cleaning/missions/${MISSION_ID}/cancel`]: {
        status: 200,
        body: plannedMission({ status: 'cancelled' }),
      },
    });
    render(<MissionDetail id={MISSION_ID} />);
    fireEvent.click(await screen.findByRole('button', { name: 'Arrêter la suite' }));
    const form = screen.getByRole('form', { name: 'Arrêter la suite de la mission' });
    expect(form).toHaveTextContent('Les 2 passages déjà faits restent dus');
    expect(form).toHaveTextContent('la différence est créditée dans votre portefeuille KSP');
    // Aucun montant calculé par le portail.
    expect(form).not.toHaveTextContent('F CFA');
    fireEvent.click(within(form).getByRole('button', { name: 'Confirmer l’arrêt' }));
    expect(await screen.findByText(/La suite de la mission est annulée/)).toBeInTheDocument();
  });

  it('mission pas encore commencée : annulation gratuite tant qu’aucun passage n’est planifié', async () => {
    stubGateway({
      [SERVICES_ROUTE]: { status: 200, body: SERVICES },
      [MISSION_ROUTE]: { status: 200, body: mission({ status: 'to_schedule', interventions: [] }) },
    });
    render(<MissionDetail id={MISSION_ID} />);
    fireEvent.click(await screen.findByRole('button', { name: 'Annuler la mission' }));
    expect(screen.getByRole('form', { name: 'Annuler la mission' })).toHaveTextContent(
      'Sans frais tant qu’aucun passage n’est planifié',
    );
  });

  it('paiement « avant » non payé : aucun passage ne commence avant l’acompte', async () => {
    stubGateway({
      [SERVICES_ROUTE]: { status: 200, body: SERVICES },
      [MISSION_ROUTE]: {
        status: 200,
        body: mission({
          payment: {
            ...mission().payment,
            status: 'due',
            paid: { amount: 0, currency: 'XOF' },
            payments: [],
            depositDue: { amount: 10200, currency: 'XOF' },
          },
        }),
      },
      'GET /api/v1/wallet/me': {
        status: 200,
        body: { prepaid: { balance: { amount: 0, currency: 'XOF' }, lastEntryAt: null } },
      },
    });
    render(<MissionDetail id={MISSION_ID} />);
    const next = await screen.findByRole('region', { name: 'Prochaine étape' });
    expect(next).toHaveTextContent(/aucun passage ne commence tant que 10\s200\sF\sCFA n’est pas payé/);
  });

  it('membre lecteur d’une entreprise : ni annulation ni paiement, message clair', async () => {
    signIn(ORGANIZATION_ID);
    stubGateway({
      [SERVICES_ROUTE]: { status: 200, body: SERVICES },
      [MISSION_ROUTE]: {
        status: 200,
        body: plannedMission({ customerKind: 'business', organizationId: ORGANIZATION_ID }),
      },
      [`GET /api/v1/identity/organizations/${ORGANIZATION_ID}`]: {
        status: 200,
        body: { role: 'org_viewer' },
      },
    });
    render(<MissionDetail id={MISSION_ID} />);
    expect(await screen.findByText(/Vous êtes en lecture seule dans cette entreprise/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Arrêter la suite' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Annuler la mission' })).not.toBeInTheDocument();
  });

  it('membre d’une entreprise : l’arrêt de la suite parle de la facture au prorata', async () => {
    signIn(ORGANIZATION_ID);
    stubGateway({
      [SERVICES_ROUTE]: { status: 200, body: SERVICES },
      [MISSION_ROUTE]: {
        status: 200,
        body: plannedMission({ customerKind: 'business', organizationId: ORGANIZATION_ID }),
      },
      [`GET /api/v1/identity/organizations/${ORGANIZATION_ID}`]: {
        status: 200,
        body: { role: 'org_member' },
      },
    });
    render(<MissionDetail id={MISSION_ID} />);
    fireEvent.click(await screen.findByRole('button', { name: 'Arrêter la suite' }));
    expect(screen.getByRole('form', { name: 'Arrêter la suite de la mission' })).toHaveTextContent(
      'le mois en cours est facturé au prorata',
    );
  });
});

describe('Devis avec un plan de passages', () => {
  it('le créneau proposé est le premier passage ; le calendrier donne les dates du devis', async () => {
    const planned = {
      ...QUOTE,
      interventionCount: 157,
      proposedSlots: [{ start: '2099-11-11T07:00:00Z', end: '2099-11-11T09:00:00Z' }],
      schedule: WEEKLY_SCHEDULE,
      scheduledDates: WEEKLY_DATES,
    };
    stubGateway({
      [SERVICES_ROUTE]: { status: 200, body: SERVICES },
      [`GET /api/v1/cleaning/quote-requests/${REQUEST_ID}`]: {
        status: 200,
        body: quoteRequest({
          status: 'quote_sent',
          quote: planned,
          schedule: WEEKLY_SCHEDULE,
          scheduledDates: WEEKLY_DATES,
          recurrence: { period: 'week', visitsPerPeriod: 3, durationMonths: 12 },
        }),
      },
    });
    render(<RequestDetail id={REQUEST_ID} />);
    const quote = await screen.findByRole('region', { name: 'Devis' });
    expect(within(quote).getByText('Premier passage')).toBeInTheDocument();
    expect(within(quote).getByText(/Le créneau proposé est votre premier passage/)).toBeInTheDocument();
    expect(within(quote).getByText(/^157 passages, chaque lundi/)).toBeInTheDocument();
    expect(within(quote).getByRole('region', { name: 'Calendrier des passages' })).toBeInTheDocument();
    // Le besoin résume le plan de la demande, sans l'ancienne récurrence.
    expect(screen.getByRole('region', { name: 'Votre besoin' })).not.toHaveTextContent(
      'par semaine, pendant',
    );
    // Le plan de la demande n'est pas répété : celui du devis compte.
    expect(screen.getAllByRole('region', { name: 'Plan des passages' })).toHaveLength(1);
    // Paiement « avant » choisi par défaut : le passage ne démarre qu'après l'acompte.
    fireEvent.click(within(quote).getByRole('button', { name: 'Accepter le devis' }));
    // Formulaire chargé à la demande (`lazy`) : son premier chargement peut être lent.
    expect(
      await screen.findByText(
        /aucun passage ne commence tant que 10\s200\sF\sCFA n’est pas payé/,
        {},
        { timeout: 4000 },
      ),
    ).toBeInTheDocument();
  });

  it('membre lecteur : le devis se lit, sans accepter ni refuser', async () => {
    signIn(ORGANIZATION_ID);
    stubGateway({
      [SERVICES_ROUTE]: { status: 200, body: SERVICES },
      [`GET /api/v1/cleaning/quote-requests/${REQUEST_ID}`]: {
        status: 200,
        body: quoteRequest({
          status: 'quote_sent',
          quote: QUOTE,
          customerKind: 'business',
          organizationId: ORGANIZATION_ID,
        }),
      },
      [`GET /api/v1/identity/organizations/${ORGANIZATION_ID}`]: {
        status: 200,
        body: { role: 'org_viewer' },
      },
    });
    render(<RequestDetail id={REQUEST_ID} />);
    expect(await screen.findByText(/Vous êtes en lecture seule/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Accepter le devis' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Refuser le devis' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Annuler la demande' })).not.toBeInTheDocument();
  });

  it('refus 403 `AUTH_FORBIDDEN` de la gateway : message, sans casser l’écran', async () => {
    signIn(ORGANIZATION_ID);
    stubGateway({
      [SERVICES_ROUTE]: { status: 200, body: SERVICES },
      [`GET /api/v1/cleaning/quote-requests/${REQUEST_ID}`]: {
        status: 200,
        body: quoteRequest({
          status: 'quote_sent',
          quote: QUOTE,
          customerKind: 'business',
          organizationId: ORGANIZATION_ID,
        }),
      },
      // Rôle illisible : le portail laisse agir, la gateway reste juge.
      [`GET /api/v1/identity/organizations/${ORGANIZATION_ID}`]: {
        status: 503,
        body: errorBody('X', 'Indisponible.'),
      },
      [`POST /api/v1/cleaning/quote-requests/${REQUEST_ID}/decline`]: {
        status: 403,
        body: errorBody('AUTH_FORBIDDEN', 'Action réservée.'),
      },
    });
    render(<RequestDetail id={REQUEST_ID} />);
    fireEvent.click(await screen.findByRole('button', { name: 'Refuser le devis' }));
    fireEvent.click(screen.getByRole('button', { name: 'Confirmer le refus' }));
    expect(await screen.findByText(/Vous êtes en lecture seule dans cette entreprise/)).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Devis' })).toBeInTheDocument();
  });
});
