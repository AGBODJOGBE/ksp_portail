import { fireEvent, render, screen, within } from '@testing-library/react';
import { resetServicesCache } from '@/features/cleaning/api';
import { nettoyageContent } from '@/features/cleaning/content';
import {
  SERVICES,
  SIMULATION,
  UNPRICED,
  ZONES,
  errorBody,
  stubGateway,
} from '@/features/cleaning/fake-gateway.test-utils';
import { CleaningSimulator } from './cleaning-simulator';

const SERVICES_ROUTE = 'GET /api/v1/cleaning/services';
const SIMULATE = 'POST /api/v1/cleaning/simulations';
/** L'écran d'estimation est chargé à la demande : marge pour une machine chargée. */
const LAZY = { timeout: 5000 };

const next = () => fireEvent.click(screen.getByRole('button', { name: /Continuer|Voir le récapitulatif/ }));
const plain = (text: string | null) => (text ?? '').replace(/\s/g, ' ');

function renderSimulator(zones: typeof ZONES.data | null = ZONES.data) {
  return render(
    <CleaningSimulator
      content={nettoyageContent.simulator.form}
      zones={zones}
      whatsappNumber="22900000000"
    />,
  );
}

async function answer(service: string, commune = 'Abomey-Calavi') {
  // Le libellé contient aussi la description de la prestation.
  fireEvent.click(await screen.findByLabelText(new RegExp(`^${service}`)));
  next();
  fireEvent.click(screen.getByLabelText('Maison ou villa'));
  next();
  fireEvent.change(screen.getByRole('textbox'), { target: { value: '6' } });
  next();
  if (service === 'Nettoyage à domicile') {
    fireEvent.click(screen.getByLabelText('Vitres'));
    next();
  }
  fireEvent.click(screen.getByLabelText(commune));
  next();
  fireEvent.click(screen.getByLabelText('Une seule fois'));
  next();
}

beforeEach(() => resetServicesCache());
afterEach(() => vi.unstubAllGlobals());

describe('simulateur du Nettoyage branché sur la gateway', { timeout: 15_000 }, () => {
  it('propose les prestations du catalogue puis affiche la fourchette et le détail', async () => {
    const { calls } = stubGateway({
      [SERVICES_ROUTE]: { status: 200, body: SERVICES },
      [SIMULATE]: { status: 200, body: SIMULATION },
    });
    renderSimulator();
    expect(screen.getByRole('status')).toHaveTextContent('Chargement des prestations…');

    await answer('Nettoyage à domicile');

    const estimate = await screen.findByText(/^Entre /, {}, LAZY);
    expect(plain(estimate.textContent)).toBe('Entre 33 500 FCFA et 43 000 FCFA');
    expect(screen.getByText(/Estimation non contractuelle/)).toBeInTheDocument();
    expect(screen.getByText('Équipe recommandée : 2 agents.')).toBeInTheDocument();
    expect(screen.getByText('Une visite des lieux, obligatoire, précède le devis.')).toBeInTheDocument();

    const simulate = calls.find((call) => call.path === '/api/v1/cleaning/simulations');
    expect(simulate?.body).toEqual({
      serviceCode: 'home_cleaning',
      premisesType: 'house',
      quantity: 6,
      options: ['windows'],
      commune: 'Abomey-Calavi',
      frequency: 'once',
    });
    // Route publique : aucun jeton envoyé.
    expect(simulate?.headers.Authorization).toBeUndefined();

    const link = screen.getByRole('link', { name: /Demander un devis/ });
    expect(link).toHaveAttribute(
      'href',
      '/nettoyage/devis?prestation=home_cleaning&locaux=house&quantite=6&options=windows&commune=Abomey-Calavi&frequence=once',
    );
  });

  it('annonce un prix bientôt disponible quand la prestation n’a pas de prix', async () => {
    stubGateway({
      [SERVICES_ROUTE]: { status: 200, body: SERVICES },
      [SIMULATE]: { status: 200, body: UNPRICED },
    });
    renderSimulator();
    await answer('Désinsectisation');
    expect(await screen.findByText('Prix bientôt disponible', {}, LAZY)).toBeInTheDocument();
    expect(screen.getByText(/demandez un devis, KSP vous répondra/)).toBeInTheDocument();
    expect(screen.queryByText(/^Entre /)).not.toBeInTheDocument();
  });

  it('signale une commune hors zone, sans proposer de devis', async () => {
    stubGateway({
      [SERVICES_ROUTE]: { status: 200, body: SERVICES },
      [SIMULATE]: { status: 200, body: { ...SIMULATION, covered: false } },
    });
    renderSimulator();
    await answer('Nettoyage à domicile', 'Cotonou');
    expect(
      await screen.findByText('Nous n’intervenons pas encore dans votre commune', {}, LAZY),
    ).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /Demander un devis/ })).not.toBeInTheDocument();
  });

  it('ne demande aucune estimation pour « Autre commune »', async () => {
    const { calls } = stubGateway({ [SERVICES_ROUTE]: { status: 200, body: SERVICES } });
    renderSimulator();
    await answer('Nettoyage à domicile', 'Autre commune');
    expect(
      await screen.findByText('Nous n’intervenons pas encore dans votre commune', {}, LAZY),
    ).toBeInTheDocument();
    expect(calls.some((call) => call.path.endsWith('/simulations'))).toBe(false);
  });

  it('relit les zones dans le navigateur si la page ne les a pas reçues du serveur', async () => {
    const { calls } = stubGateway({
      [SERVICES_ROUTE]: { status: 200, body: SERVICES },
      'GET /api/v1/cleaning/zones': [
        { status: 503, body: errorBody('GATEWAY_UNAVAILABLE', 'Service momentanément indisponible.') },
        { status: 200, body: { data: [{ code: 'ouidah', commune: 'Ouidah' }] } },
      ],
    });
    renderSimulator(null);
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Impossible de charger les communes desservies. Service momentanément indisponible.',
    );
    fireEvent.click(screen.getByRole('button', { name: 'Réessayer' }));
    fireEvent.click(await screen.findByLabelText(/^Nettoyage à domicile/));
    next();
    fireEvent.click(screen.getByLabelText('Maison ou villa'));
    next();
    fireEvent.change(screen.getByRole('textbox'), { target: { value: '6' } });
    next();
    next();
    expect(screen.getByLabelText('Ouidah')).toBeInTheDocument();
    expect(screen.getByText('KSP Nettoyage intervient aujourd’hui à Ouidah.')).toBeInTheDocument();
    expect(calls.filter((call) => call.path.endsWith('/zones'))).toHaveLength(2);
    expect(calls.find((call) => call.path.endsWith('/zones'))?.headers.Authorization).toBeUndefined();
  });

  it('affiche le message de la gateway et permet de réessayer', async () => {
    stubGateway({
      [SERVICES_ROUTE]: [
        { status: 503, body: errorBody('GATEWAY_UNAVAILABLE', 'Service momentanément indisponible.') },
        { status: 200, body: SERVICES },
      ],
    });
    renderSimulator();
    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent(
      'Impossible de charger les prestations. Service momentanément indisponible.',
    );
    fireEvent.click(screen.getByRole('button', { name: 'Réessayer' }));
    const form = await screen.findByRole('form', { name: 'Simulateur de prestation de nettoyage' });
    expect(within(form).getByLabelText(/^Nettoyage à domicile/)).toBeInTheDocument();
  });
});
