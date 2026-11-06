import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { session } from '@/lib/api';
import { resetServicesCache } from '@/features/cleaning/api';
import {
  CATALOG,
  GROUP_ID,
  ZONES,
  errorBody,
  estimateResponse,
  requestGroup,
  stubGateway,
} from '@/features/cleaning/fake-gateway.test-utils';
import { DRAFT_KEY, emptyDraft } from '@/features/cleaning/journey';
import type { PlaceCatalog } from '@/features/cleaning/schemas';
import { CleaningJourney } from './journey';
import { parseCoordinates } from './journey-address';
import { ReviewStep } from './journey-review';

// La carte (Leaflet) ne se charge pas dans jsdom : l'écran doit le dire et garder la saisie des coordonnées.
vi.mock('leaflet', () => {
  throw new Error('Leaflet indisponible dans les tests');
});

const replace = vi.fn();
let search = '';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace }),
  usePathname: () => '/nettoyage/demande',
  useSearchParams: () => new URLSearchParams(search),
}));

/** Étapes chargées à la demande et estimation après une pause : marge pour une machine chargée. */
const LAZY = { timeout: 5000 };
const plain = (text: string | null) => (text ?? '').replace(/\s/g, ' ');
const next = () => fireEvent.click(screen.getByRole('button', { name: /^(Continuer|Vérifier ma demande)/ }));
const inDays = (days: number) => new Date(Date.now() + days * 86_400_000).toISOString().slice(0, 10);

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
      emailVerified: false,
      preferredLanguage: 'fr',
      createdAt: '2026-10-21T09:00:00Z',
    },
    profileIncomplete: false,
    activeContext: { type: 'individual', organizationId: null, organizationName: null },
  });
}

function stubGeolocation() {
  const getCurrentPosition = vi.fn((success: PositionCallback) =>
    success({
      coords: { latitude: 6.36541234, longitude: 2.41834567, accuracy: 12.4 },
    } as GeolocationPosition),
  );
  vi.stubGlobal('navigator', { ...navigator, geolocation: { getCurrentPosition } });
  return getCurrentPosition;
}

function renderJourney() {
  return render(<CleaningJourney catalog={CATALOG as PlaceCatalog} zones={ZONES.data} />);
}

beforeEach(() => {
  search = '';
  replace.mockReset();
  resetServicesCache();
  window.sessionStorage.clear();
});
afterEach(() => {
  vi.unstubAllGlobals();
  session.clear();
});

describe('demande de devis par lieu', () => {
  it('parcours complet : lieu, prestations et estimation, adresse, créneaux, connexion à l’envoi, confirmation', async () => {
    const gateway = stubGateway({
      'POST /api/v1/cleaning/estimates': (body) => ({
        status: 200,
        body: estimateResponse(body as Parameters<typeof estimateResponse>[0]),
      }),
      'POST /api/v1/identity/token/refresh': {
        status: 401,
        body: errorBody('IDENTITY_REFRESH_TOKEN_INVALID', 'Session expirée.'),
      },
      'POST /api/v1/cleaning/locations/resolve': {
        status: 200,
        body: {
          latitude: 6.365412,
          longitude: 2.418346,
          commune: 'Cotonou',
          zoneCode: 'cotonou',
          served: true,
          displayAddress: 'Fidjrossè, Cotonou',
          provider: 'nominatim',
        },
      },
      'POST /api/v1/cleaning/quote-request-groups': { status: 200, body: requestGroup() },
    });
    stubGeolocation();
    renderJourney();

    // 1. Le lieu : continuer sans choix signale l'erreur près des cartes.
    next();
    expect(screen.getByText('Choisissez un type de lieu.')).toBeInTheDocument();
    fireEvent.click(screen.getByLabelText(/^Maison/));
    next();

    // 2. Les prestations : formulaire du catalogue, estimation en direct (montants de la gateway).
    fireEvent.click(await screen.findByLabelText(/^Nettoyage de maison/, {}, LAZY));
    fireEvent.click(screen.getByLabelText(/^Nettoyage de vitres/));
    next();
    expect(screen.getByText('Vérifiez les champs signalés.')).toBeInTheDocument();
    await vi.waitFor(() =>
      expect(document.activeElement).toBe(screen.getByRole('textbox', { name: /^Superficie/ })),
    );
    fireEvent.change(screen.getByRole('textbox', { name: /^Superficie/ }), { target: { value: '180' } });
    const condition = screen.getByRole('group', { name: 'État de la maison' });
    fireEvent.click(within(condition).getByLabelText('Normal'));
    fireEvent.click(
      within(screen.getAllByRole('group', { name: 'À quelle fréquence ?' })[0]!).getByLabelText('Une fois'),
    );
    const windows = screen.getAllByRole('textbox', { name: /^Nombre de fenêtres/ });
    fireEvent.change(windows[0]!, { target: { value: '10' } });
    const estimate = screen.getByRole('region', { name: 'Votre estimation' });
    await within(estimate).findByText(/45\s000/, {}, LAZY);
    expect(plain(estimate.textContent)).toContain('Prix sur devis');
    expect(plain(estimate.textContent)).toContain('Estimation non contractuelle');
    expect(plain(estimate.textContent)).toContain('Estimation indicative');
    const estimateCall = gateway.calls.findLast((call) => call.path === '/api/v1/cleaning/estimates');
    expect(estimateCall?.body).toEqual({
      placeType: 'house',
      items: [
        {
          serviceCode: 'house_cleaning',
          answers: { surface: 180, condition: 'normal' },
          options: [],
          frequency: 'once',
        },
        { serviceCode: 'window_cleaning', answers: { window_count: 10 }, options: [] },
      ],
    });
    next();

    // 3. L'adresse : position (permission au clic), commune en repli sans session, repère.
    fireEvent.click(await screen.findByRole('button', { name: 'Me localiser' }, LAZY));
    expect(await screen.findByText('Position enregistrée, à environ 12 m près.')).toBeInTheDocument();
    expect(await screen.findByText(/confirmée par votre position au moment de l’envoi/)).toBeInTheDocument();
    fireEvent.change(screen.getByRole('combobox', { name: 'Commune' }), { target: { value: 'Cotonou' } });
    fireEvent.change(screen.getByRole('textbox', { name: 'Point de repère' }), {
      target: { value: 'Portail vert' },
    });
    next();

    // 4. Les créneaux.
    fireEvent.change(await screen.findByLabelText('Date du créneau 1', {}, LAZY), {
      target: { value: inDays(5) },
    });
    next();

    // 5. Récapitulatif : la connexion est demandée ici, la saisie est gardée dans l'onglet.
    expect(await screen.findByRole('button', { name: 'Recevoir mon code' }, LAZY)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Envoyer ma demande' })).toBeDisabled();
    expect(JSON.parse(window.sessionStorage.getItem(DRAFT_KEY) ?? '{}')).toMatchObject({ step: 4 });
    act(() => signIn());
    expect(await screen.findByText('Connecté : Koffi Adjovi')).toBeInTheDocument();
    // Connecté : la commune de la position est retrouvée avant l'envoi.
    await vi.waitFor(() =>
      expect(gateway.calls.some((call) => call.path === '/api/v1/cleaning/locations/resolve')).toBe(true),
    );
    fireEvent.click(screen.getByRole('button', { name: 'Envoyer ma demande' }));

    // 6. Envoi : clé d'idempotence, coordonnées dans le corps, brouillon vidé, confirmation.
    await vi.waitFor(() =>
      expect(replace).toHaveBeenCalledWith(`/nettoyage/demande?groupe=${GROUP_ID}`, { scroll: true }),
    );
    const sent = gateway.calls.find((call) => call.path === '/api/v1/cleaning/quote-request-groups');
    expect(sent?.headers['Idempotency-Key']).toMatch(/^[A-Za-z0-9_-]{8,100}$/);
    expect(sent?.body).toMatchObject({
      placeType: 'house',
      location: { latitude: 6.365412, longitude: 2.418346, accuracyMeters: 12 },
      landmark: 'Portail vert',
      commune: 'Cotonou',
    });
    const resolve = gateway.calls.find((call) => call.path === '/api/v1/cleaning/locations/resolve');
    expect(resolve?.body).toEqual({ latitude: 6.365412, longitude: 2.418346 });
    expect(window.sessionStorage.getItem(DRAFT_KEY)).toBeNull();
  }, 20_000);

  it('reprend un brouillon après un rafraîchissement, et « Recommencer » le vide', async () => {
    stubGateway({});
    window.sessionStorage.setItem(
      DRAFT_KEY,
      JSON.stringify({
        version: 1,
        step: 3,
        placeType: 'house',
        services: ['window_cleaning'],
        answers: { window_cleaning: { fields: {}, options: {}, frequency: '' } },
        address: { location: null, resolved: null, commune: '', district: '', landmark: '' },
        slots: [{ date: '', period: 'morning' }],
        comment: '',
      }),
    );
    renderJourney();
    // Prestation incomplète : reprise à l'étape 2.
    expect(
      screen.getByText('Nous avons repris votre demande là où vous l’aviez laissée.'),
    ).toBeInTheDocument();
    expect(
      await screen.findByRole('heading', { level: 2, name: 'De quoi avez-vous besoin ?' }),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Recommencer' }));
    expect(
      screen.getByRole('heading', { level: 2, name: 'Quel lieu faut-il nettoyer ?' }),
    ).toBeInTheDocument();
    expect(window.sessionStorage.getItem(DRAFT_KEY)).toContain('"step":0');
  });

  it('commence au lieu choisi sur la page Nettoyage (`?lieu=`)', async () => {
    stubGateway({});
    search = 'lieu=apartment';
    renderJourney();
    expect(
      await screen.findByRole('heading', { level: 2, name: 'De quoi avez-vous besoin ?' }, LAZY),
    ).toBeInTheDocument();
    expect(screen.getByLabelText(/^Nettoyage de vitres/)).toBeInTheDocument();
    expect(screen.queryByLabelText(/^Nettoyage de maison/)).not.toBeInTheDocument();
  });

  it('annonce une panne du catalogue et permet de réessayer', async () => {
    stubGateway({
      'GET /api/v1/cleaning/catalog': [
        { status: 503, body: errorBody('GATEWAY_UNAVAILABLE', 'Service momentanément indisponible.') },
        { status: 200, body: CATALOG },
      ],
    });
    render(<CleaningJourney catalog={null} zones={ZONES.data} />);
    expect(
      await screen.findByText(/Impossible de charger les prestations\. Service momentanément indisponible/),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Réessayer' }));
    expect(await screen.findByLabelText(/^Maison/)).toBeInTheDocument();
  });

  it('relit la confirmation par son numéro après un rafraîchissement', async () => {
    signIn();
    stubGateway({
      [`GET /api/v1/cleaning/quote-request-groups/${GROUP_ID}`]: { status: 200, body: requestGroup() },
    });
    search = `groupe=${GROUP_ID}`;
    renderJourney();
    expect(await screen.findByText('Demande envoyée', {}, LAZY)).toBeInTheDocument();
    expect(screen.getByText(GROUP_ID)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Suivre ma demande/ })).toHaveAttribute(
      'href',
      `/mon-espace/nettoyage/demandes/groupes/${GROUP_ID}`,
    );
    expect(
      screen.getAllByText(/Visite des lieux|Devis|Acceptation|Planification/).length,
    ).toBeGreaterThanOrEqual(4);
  });

  it('place le lieu par ses coordonnées quand la carte ne se charge pas', async () => {
    stubGateway({
      'POST /api/v1/identity/token/refresh': {
        status: 401,
        body: errorBody('IDENTITY_REFRESH_TOKEN_INVALID', 'Session expirée.'),
      },
    });
    window.sessionStorage.setItem(
      DRAFT_KEY,
      JSON.stringify({
        version: 1,
        step: 2,
        placeType: 'house',
        services: ['window_cleaning'],
        answers: { window_cleaning: { fields: { window_count: '4' }, options: {}, frequency: '' } },
        address: { location: null, resolved: null, commune: '', district: '', landmark: '' },
        slots: [{ date: '', period: 'morning' }],
        comment: '',
      }),
    );
    renderJourney();
    fireEvent.click(await screen.findByRole('button', { name: 'Placer sur la carte' }, LAZY));
    expect(await screen.findByText(/La carte n’a pas pu être chargée/, {}, LAZY)).toBeInTheDocument();
    fireEvent.change(screen.getByRole('textbox', { name: 'Latitude' }), { target: { value: '200' } });
    fireEvent.change(screen.getByRole('textbox', { name: 'Longitude' }), { target: { value: '2.4183' } });
    fireEvent.click(screen.getByRole('button', { name: 'Placer le repère' }));
    expect(screen.getByText(/Coordonnées invalides/)).toBeInTheDocument();
    fireEvent.change(screen.getByRole('textbox', { name: 'Latitude' }), { target: { value: '6,3654' } });
    fireEvent.click(screen.getByRole('button', { name: 'Placer le repère' }));
    expect(screen.getByText('Repère placé sur la carte.')).toBeInTheDocument();
    expect(JSON.parse(window.sessionStorage.getItem(DRAFT_KEY) ?? '{}').address.location).toEqual({
      latitude: 6.3654,
      longitude: 2.4183,
    });
  });

  it('lit des coordonnées en degrés décimaux, virgule ou point', () => {
    expect(parseCoordinates(' 6.3654 ', '2,4183')).toEqual({ latitude: 6.3654, longitude: 2.4183 });
    expect(parseCoordinates('\u22126.5', '-181')).toBeNull();
    expect(parseCoordinates('abc', '2')).toBeNull();
    expect(parseCoordinates('', '')).toBeNull();
  });
});

describe('récapitulatif avec un compte en cours de suppression (ADR-036)', () => {
  it('ne propose pas l’envoi : la suppression est à annuler d’abord', async () => {
    const { calls } = stubGateway({});
    signIn();
    const current = session.get()!;
    session.set({ ...current, user: { ...current.user, status: 'deletion_pending' } });
    render(
      <ReviewStep
        draft={emptyDraft('house')}
        catalog={CATALOG as PlaceCatalog}
        zones={ZONES.data}
        update={vi.fn()}
        errors={{}}
        clearError={vi.fn()}
        goTo={vi.fn()}
        onSent={vi.fn()}
      />,
    );
    expect(await screen.findByText(/Votre compte est en cours de suppression/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Gérer la suppression de mon compte' })).toHaveAttribute(
      'href',
      '/mon-espace/compte',
    );
    expect(screen.getByRole('button', { name: 'Envoyer ma demande' })).toBeDisabled();
    expect(calls.filter((call) => call.method !== 'POST' || !call.path.endsWith('/estimates'))).toEqual([]);
  });
});
