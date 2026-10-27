import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
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
import { QuoteRequestPanel } from './quote-request-form';
import { RequestDetail } from './request-detail';

const push = vi.fn();
let search = '';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push, replace: vi.fn() }),
  usePathname: () => '/nettoyage/devis',
  useSearchParams: () => new URLSearchParams(search),
}));

const SERVICES_ROUTE = 'GET /api/v1/cleaning/services';
const REQUESTS = '/api/v1/cleaning/quote-requests';
const DRAFT =
  'prestation=home_cleaning&locaux=house&quantite=6&options=windows&commune=Abomey-Calavi&frequence=once';

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
      preferredLanguage: 'fr',
      createdAt: '2026-10-21T09:00:00Z',
    },
    profileIncomplete: false,
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

describe('demande de devis', () => {
  function fill() {
    fireEvent.change(screen.getByLabelText(/Adresse d’intervention/), {
      target: { value: 'Lot 12, Zogbadjè' },
    });
    fireEvent.change(screen.getByLabelText('Date du créneau 1'), { target: { value: '2099-11-05' } });
  }

  it('reprend la simulation, annonce la visite et envoie une clé d’idempotence réutilisée au renvoi', async () => {
    search = DRAFT;
    const { calls } = stubGateway({
      [SERVICES_ROUTE]: { status: 200, body: SERVICES },
      [`POST ${REQUESTS}`]: [
        { status: 503, body: errorBody('GATEWAY_UNAVAILABLE', 'Service momentanément indisponible.') },
        { status: 200, body: quoteRequest() },
      ],
    });
    render(<QuoteRequestPanel />);

    expect(await screen.findByText('Nettoyage à domicile')).toBeInTheDocument();
    expect(screen.getByText('6 pièces')).toBeInTheDocument();
    expect(screen.getByText(/Une visite des lieux est prévue avant le devis/)).toBeInTheDocument();

    fill();
    fireEvent.click(screen.getByRole('button', { name: 'Envoyer ma demande' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Service momentanément indisponible.');

    fireEvent.click(screen.getByRole('button', { name: 'Envoyer ma demande' }));
    expect(await screen.findByText('Demande envoyée')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Voir ma demande' })).toHaveAttribute(
      'href',
      `/mon-espace/nettoyage/demandes/${REQUEST_ID}`,
    );

    const sent = calls.filter((call) => call.method === 'POST' && call.path === REQUESTS);
    expect(sent).toHaveLength(2);
    const key = sent[0]?.headers['Idempotency-Key'];
    expect(key).toMatch(/^[A-Za-z0-9_-]{8,100}$/);
    expect(sent[1]?.headers['Idempotency-Key']).toBe(key);
    expect(sent[0]?.headers.Authorization).toBe('Bearer jeton-acces');
    expect(sent[0]?.body).toEqual({
      serviceCode: 'home_cleaning',
      premisesType: 'house',
      quantity: 6,
      options: ['windows'],
      commune: 'Abomey-Calavi',
      address: 'Lot 12, Zogbadjè',
      preferredSlots: [{ start: '2099-11-05T07:00:00.000Z', end: '2099-11-05T11:00:00.000Z' }],
    });
  });

  it('demande les jours d’intervention d’une entreprise et montre le refus hors zone', async () => {
    search = DRAFT;
    const { calls } = stubGateway({
      [SERVICES_ROUTE]: { status: 200, body: SERVICES },
      [`POST ${REQUESTS}`]: {
        status: 422,
        body: errorBody('CLEANING_ZONE_NOT_COVERED', 'Nous n’intervenons pas encore à Abomey-Calavi.', {
          commune: 'Abomey-Calavi',
        }),
      },
    });
    render(<QuoteRequestPanel />);
    fireEvent.click(await screen.findByLabelText('Pour une entreprise'));
    fireEvent.change(screen.getByLabelText(/Jours d’intervention par semaine/), { target: { value: '5' } });
    fill();
    fireEvent.click(screen.getByRole('button', { name: 'Envoyer ma demande' }));

    expect(await screen.findByText('Nous n’intervenons pas encore à Abomey-Calavi.')).toBeInTheDocument();
    expect(screen.getByLabelText('Commune')).toHaveFocus();
    const sent = calls.find((call) => call.method === 'POST');
    expect(sent?.body).toMatchObject({ daysPerWeek: 5 });
  });

  it('bloque l’envoi pour une autre commune', async () => {
    search = DRAFT.replace('Abomey-Calavi', 'Parakou');
    stubGateway({ [SERVICES_ROUTE]: { status: 200, body: SERVICES } });
    render(<QuoteRequestPanel />);
    expect(await screen.findByText(/Nous n’intervenons pas encore dans votre commune/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Envoyer ma demande' })).toBeDisabled();
  });

  it('renvoie au simulateur sans simulation dans l’adresse', () => {
    search = '';
    stubGateway({ [SERVICES_ROUTE]: { status: 200, body: SERVICES } });
    render(<QuoteRequestPanel />);
    expect(screen.getByRole('link', { name: 'Aller au simulateur' })).toHaveAttribute(
      'href',
      '/nettoyage#simulateur',
    );
  });
});

describe('Mes prestations de nettoyage', () => {
  it('liste demandes et missions, avec pagination par curseur et états vides', async () => {
    const { calls } = stubGateway({
      [SERVICES_ROUTE]: { status: 200, body: SERVICES },
      [`GET ${REQUESTS}`]: [
        { status: 200, body: { data: [quoteRequest()], nextCursor: '0192f1c4-7a2b-7c3d-8e4f-5a6b7c8d1fff' } },
        {
          status: 200,
          body: { data: [quoteRequest({ id: 'autre', status: 'quote_sent' })], nextCursor: null },
        },
      ],
      'GET /api/v1/cleaning/missions': { status: 200, body: { data: [], nextCursor: null } },
    });
    render(<CleaningSpace />);

    expect(await screen.findByText('Demande reçue')).toBeInTheDocument();
    expect(screen.getByText(/Aucune mission pour le moment/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Afficher plus' }));
    expect(await screen.findByText('Devis à étudier')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Afficher plus' })).not.toBeInTheDocument();

    const pages = calls.filter((call) => call.method === 'GET' && call.path === REQUESTS);
    expect(pages.map((call) => call.query)).toEqual([
      { limit: '10' },
      { limit: '10', cursor: '0192f1c4-7a2b-7c3d-8e4f-5a6b7c8d1fff' },
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
    expect(amounts.map((amount) => plain(amount.textContent))).toContain('34 000 FCFA');
    expect(screen.getByText(/Valable jusqu’au 4 novembre 2099 à 09:00/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Accepter le devis' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Confirmer et réserver' }));
    expect(await screen.findByText('Choisissez un créneau.')).toBeInTheDocument();

    fireEvent.click(screen.getByLabelText('vendredi 6 novembre 2099, de 13:00 à 17:00'));
    fireEvent.click(screen.getByLabelText(/^Totalité/));
    fireEvent.click(screen.getByRole('button', { name: 'Confirmer et réserver' }));

    await waitFor(() => expect(push).toHaveBeenCalledWith(`/mon-espace/nettoyage/missions/${MISSION_ID}`));
    const accept = calls.find((call) => call.path.endsWith('/accept'));
    expect(accept?.body).toEqual({
      slotStart: '2099-11-06T12:00:00Z',
      paymentPlan: { option: 'full', timing: 'before', method: 'cash' },
    });
    expect(accept?.headers['Idempotency-Key']).toMatch(/^[A-Za-z0-9_-]{8,100}$/);
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
    fireEvent.click(screen.getByRole('button', { name: 'Accepter le devis' }));
    expect(await screen.findByText(/se règle par une facture mensuelle/)).toBeInTheDocument();
    expect(screen.queryByLabelText(/^Totalité/)).not.toBeInTheDocument();
    fireEvent.click(screen.getByLabelText('jeudi 5 novembre 2099, de 08:00 à 12:00'));
    fireEvent.click(screen.getByRole('button', { name: 'Confirmer et réserver' }));
    await waitFor(() => expect(push).toHaveBeenCalled());
    expect(calls.find((call) => call.path.endsWith('/accept'))?.body).toMatchObject({
      paymentPlan: { option: 'full', timing: 'after', method: 'cash' },
    });
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

  it('détaille une mission : passages, paiement et suspension pour impayés', async () => {
    stubGateway({
      [SERVICES_ROUTE]: { status: 200, body: SERVICES },
      [`GET /api/v1/cleaning/missions/${MISSION_ID}`]: {
        status: 200,
        body: mission({
          status: 'on_hold',
          suspension: { cause: 'unpaid_invoices', since: '2026-12-11T09:00:00Z', unpaidCount: 2 },
        }),
      },
    });
    render(<MissionDetail id={MISSION_ID} />);
    expect(
      await screen.findByText(/Service suspendu depuis le 11 décembre 2026 : 2 factures impayées/),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Voir mes factures' })).toHaveAttribute(
      'href',
      '/mon-espace/factures',
    );
    expect(screen.getByText('Acompte reçu')).toBeInTheDocument();
    const passages = screen.getByRole('region', { name: 'Passages' });
    expect(within(passages).getByText('jeudi 5 novembre 2099, 08:00')).toBeInTheDocument();
    expect(within(passages).getByText(/Awa B\./)).toBeInTheDocument();
  });
});
