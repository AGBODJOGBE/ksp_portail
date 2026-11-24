import { render, screen } from '@testing-library/react';
import { ApiError, isBackendPending } from '@/lib/api';
import { usePagedList } from '@/lib/use-paged-list';
import { useResource } from '@/lib/use-resource';
import { type BackendNeed, BackendPending } from './backend-pending';

const NEEDS: BackendNeed[] = [
  {
    method: 'GET',
    path: '/api/v1/billing/preferences',
    purpose: 'Lire le réglage du prélèvement automatique des factures sur le portefeuille.',
  },
  {
    method: 'PATCH',
    path: '/api/v1/billing/preferences',
    purpose: 'Activer ou couper le prélèvement automatique (administrateur de l’entreprise).',
  },
];

const notServed = () => new ApiError(404, 'GATEWAY_ROUTE_NOT_FOUND', "Cette adresse n'existe pas.");

function Pending() {
  return (
    <BackendPending id="preferences" title="Préférences de facturation" needs={NEEDS}>
      Vous pourrez bientôt faire régler vos factures automatiquement par le portefeuille de l’entreprise.
    </BackendPending>
  );
}

// Le motif d'une section : elle appelle sa route ; route en attente → BackendPending ; sinon l'écran normal.
function PreferencesSection({ load }: { load: () => Promise<{ channel: string }> }) {
  const { state } = useResource(load);
  if (state.status === 'loading') return <p role="status">Chargement…</p>;
  if (state.status === 'error') {
    if (isBackendPending(state.error)) return <Pending />;
    return <p role="alert">{state.error instanceof ApiError ? state.error.message : 'Erreur'}</p>;
  }
  return <p>Paiement préféré : {state.data.channel}</p>;
}

function MembersSection({ load }: { load: () => Promise<{ data: string[]; nextCursor: null }> }) {
  const list = usePagedList(load);
  if (list.pending) return <Pending />;
  if (list.loading) return <p role="status">Chargement…</p>;
  if (list.error) return <p role="alert">{list.error}</p>;
  return (
    <ul aria-label="Membres">
      {list.items.map((item) => (
        <li key={item}>{item}</li>
      ))}
    </ul>
  );
}

const pendingPreferences = () => Promise.reject(notServed());
const notImplementedPreferences = () =>
  Promise.reject(new ApiError(501, 'BILLING_NOT_IMPLEMENTED', 'Pas encore disponible.'));
const deliveredPreferences = () => Promise.resolve({ channel: 'Mobile Money' });
const failingPreferences = () =>
  Promise.reject(new ApiError(503, 'BILLING_UNAVAILABLE', 'Service indisponible.'));
const pendingMembers = () => Promise.reject(notServed());
const deliveredMembers = () => Promise.resolve({ data: ['Koffi Adjovi'], nextCursor: null });

afterEach(() => vi.unstubAllEnvs());

describe('section en attente du backend', () => {
  it('dit « Bientôt disponible » au client et, hors production, ce que le back doit fournir', () => {
    render(<Pending />);
    const section = screen.getByRole('region', { name: 'Préférences de facturation' });
    expect(section).toHaveTextContent('Bientôt disponible');
    expect(section).toHaveTextContent(
      'Vous pourrez bientôt faire régler vos factures automatiquement par le portefeuille de l’entreprise.',
    );
    expect(screen.getByText('Ce que le back doit fournir')).toBeInTheDocument();
    const routes = screen.getAllByRole('listitem');
    expect(routes).toHaveLength(2);
    expect(routes[0]).toHaveTextContent('GET /api/v1/billing/preferences');
    expect(routes[0]).toHaveTextContent(
      'Lire le réglage du prélèvement automatique des factures sur le portefeuille.',
    );
    expect(routes[1]).toHaveTextContent('PATCH /api/v1/billing/preferences');
  });

  it('en production, aucune route ni aucun détail technique n’est affiché', () => {
    vi.stubEnv('NODE_ENV', 'production');
    const { container } = render(<Pending />);
    const section = screen.getByRole('region', { name: 'Préférences de facturation' });
    expect(section).toHaveTextContent('Bientôt disponible');
    expect(section).toHaveTextContent(
      'Vous pourrez bientôt faire régler vos factures automatiquement par le portefeuille de l’entreprise.',
    );
    expect(screen.queryByText('Ce que le back doit fournir')).toBeNull();
    expect(screen.queryAllByRole('listitem')).toHaveLength(0);
    expect(container.querySelector('[data-backend-needs]')).toBeNull();
    expect(container.textContent).not.toMatch(/\/api\/|GET|PATCH/);
  });

  it('la section affiche BackendPending tant que la route n’est pas servie (404 ou 501)', async () => {
    const { unmount } = render(<PreferencesSection load={pendingPreferences} />);
    expect(await screen.findByRole('region', { name: 'Préférences de facturation' })).toBeInTheDocument();
    expect(screen.queryByRole('alert')).toBeNull();
    unmount();

    render(<PreferencesSection load={notImplementedPreferences} />);
    expect(await screen.findByRole('region', { name: 'Préférences de facturation' })).toBeInTheDocument();
  });

  it('elle s’active seule dès que la route est livrée, et garde ses vraies erreurs', async () => {
    const { unmount } = render(<PreferencesSection load={deliveredPreferences} />);
    expect(await screen.findByText('Paiement préféré : Mobile Money')).toBeInTheDocument();
    expect(screen.queryByText('Bientôt disponible')).toBeNull();
    unmount();

    render(<PreferencesSection load={failingPreferences} />);
    expect(await screen.findByRole('alert')).toHaveTextContent('Service indisponible.');
    expect(screen.queryByText('Bientôt disponible')).toBeNull();
  });

  it('une liste paginée signale aussi la route en attente (`pending`)', async () => {
    const { unmount } = render(<MembersSection load={pendingMembers} />);
    expect(await screen.findByRole('region', { name: 'Préférences de facturation' })).toBeInTheDocument();
    unmount();

    render(<MembersSection load={deliveredMembers} />);
    expect(await screen.findByRole('list', { name: 'Membres' })).toHaveTextContent('Koffi Adjovi');
  });
});
