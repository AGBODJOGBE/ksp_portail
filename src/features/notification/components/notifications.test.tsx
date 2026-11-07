import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { internalLink } from '@/features/notification/link';
import { NotificationBell } from './notification-bell';
import { NotificationCenter } from './notification-center';
import { NotificationPreferences } from './notification-preferences';

let search = '';
const push = vi.fn();
vi.mock('next/navigation', () => ({
  useSearchParams: () => new URLSearchParams(search),
  useRouter: () => ({ push, replace: vi.fn() }),
}));

const ID = '0192f1c4-7a2b-7c3d-8e4f-5a6b7c8d6001';

function notification(overrides: Record<string, unknown> = {}) {
  return {
    id: ID,
    templateCode: 'cleaning.quote_sent.customer',
    title: 'Votre devis de nettoyage — Vitres',
    body: 'Bonjour Koffi,\nVotre devis est prêt.',
    link: 'https://ksp.bj/mon-espace/nettoyage/demandes/0192f1c4-7a2b-7c3d-8e4f-5a6b7c8d1001',
    createdAt: '2026-11-05T09:30:00Z',
    readAt: null,
    ...overrides,
  };
}

/** `fetch` remplacé : une réponse par appel, dans l'ordre (la dernière est répétée). */
function stub(...responses: Array<{ status: number; body: unknown }>) {
  const calls: { url: URL; method: string; body: unknown }[] = [];
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: string | URL, init?: RequestInit) => {
      calls.push({
        url: new URL(String(input)),
        method: init?.method ?? 'GET',
        body: init?.body ? JSON.parse(String(init.body)) : undefined,
      });
      const response = responses.length > 1 ? responses.shift()! : responses[0]!;
      return new Response(JSON.stringify(response.body), {
        status: response.status,
        headers: { 'Content-Type': 'application/json' },
      });
    }),
  );
  return calls;
}

beforeEach(() => {
  search = '';
  push.mockReset();
});
afterEach(() => vi.unstubAllGlobals());

describe('lien d’une notification', () => {
  it('garde le chemin de Mon espace, ignore toute autre adresse', () => {
    expect(internalLink('https://ksp.bj/mon-espace/factures/12?x=1')).toBe('/mon-espace/factures/12?x=1');
    expect(internalLink('https://staging.ksp.bj/mon-espace')).toBe('/mon-espace');
    expect(internalLink('https://exemple.com/autre')).toBeNull();
    expect(internalLink('javascript:alert(1)')).toBeNull();
    expect(internalLink('https://ksp.bj/mon-espace-pirate')).toBeNull();
    expect(internalLink(null)).toBeNull();
  });
});

describe('Mes notifications', () => {
  it('liste les notifications, signale les non lues, ouvre la page concernée en la marquant lue', async () => {
    const calls = stub(
      {
        status: 200,
        body: {
          data: [
            notification(),
            notification({ id: 'b', title: 'Facture réglée', readAt: '2026-11-06T10:00:00Z', link: null }),
          ],
          nextCursor: null,
          unreadCount: 1,
        },
      },
      {
        status: 200,
        body: { notification: notification({ readAt: '2026-11-07T10:00:00Z' }), unreadCount: 0 },
      },
    );
    render(<NotificationCenter />);
    const first = await screen.findByRole('listitem', { name: 'Votre devis de nettoyage — Vitres' });
    expect(within(first).getByText('Non lue')).toBeInTheDocument();
    expect(screen.getByText('1 non lue')).toBeInTheDocument();
    const second = screen.getByRole('listitem', { name: 'Facture réglée' });
    expect(within(second).queryByRole('button', { name: 'Voir' })).toBeNull();

    fireEvent.click(within(first).getByRole('button', { name: 'Voir' }));
    expect(push).toHaveBeenCalledWith('/mon-espace/nettoyage/demandes/0192f1c4-7a2b-7c3d-8e4f-5a6b7c8d1001');
    await waitFor(() => expect(screen.getByText('Aucune non lue')).toBeInTheDocument());
    expect(calls[1]).toMatchObject({ method: 'POST' });
    expect(calls[1]!.url.pathname).toBe(`/api/v1/notification/notifications/${ID}/read`);
    expect(within(first).queryByText('Non lue')).toBeNull();
  });

  it('filtre des non lues lu dans l’adresse, tout marquer comme lu', async () => {
    search = 'filtre=non-lues';
    const calls = stub(
      { status: 200, body: { data: [notification()], nextCursor: null, unreadCount: 3 } },
      { status: 200, body: { marked: 3, unreadCount: 0 } },
    );
    render(<NotificationCenter />);
    await screen.findByText('3 non lues');
    expect(calls[0]!.url.searchParams.get('unread')).toBe('true');
    expect(screen.getByRole('link', { name: 'Non lues' })).toHaveAttribute('aria-current', 'page');
    fireEvent.click(screen.getByRole('button', { name: 'Tout marquer comme lu' }));
    expect(await screen.findByText('Toutes vos notifications sont marquées comme lues.')).toBeInTheDocument();
    expect(calls[1]!.url.pathname).toBe('/api/v1/notification/notifications/read-all');
  });

  it('liste vide, puis erreur affichée avec « Réessayer »', async () => {
    stub({ status: 200, body: { data: [], nextCursor: null, unreadCount: 0 } });
    const { unmount } = render(<NotificationCenter />);
    expect(await screen.findByText('Aucune notification pour le moment.')).toBeInTheDocument();
    unmount();
    stub({
      status: 503,
      body: {
        error: { code: 'NOTIFICATION_UNAVAILABLE', message: 'Service indisponible.', correlationId: 'c' },
      },
    });
    render(<NotificationCenter />);
    expect(await screen.findByRole('button', { name: 'Réessayer' })).toBeInTheDocument();
  });
});

describe('pastille et préférences', () => {
  it('pastille : nombre de non lues annoncé, lien vers la page', async () => {
    stub({ status: 200, body: { unreadCount: 4 } });
    render(<NotificationBell />);
    const link = await screen.findByRole('link', { name: 'Notifications — 4 notifications non lues' });
    expect(link).toHaveAttribute('href', '/mon-espace/notifications');
  });

  it('préférences : choix lus, modifiés et enregistrés ; avertissement sans aucun canal', async () => {
    const calls = stub(
      { status: 200, body: { whatsapp: true, email: true, updatedAt: null } },
      { status: 200, body: { whatsapp: false, email: false, updatedAt: '2026-11-07T10:00:00Z' } },
    );
    render(<NotificationPreferences />);
    const whatsapp = await screen.findByRole('checkbox', { name: 'Par WhatsApp' });
    expect(whatsapp).toBeChecked();
    fireEvent.click(whatsapp);
    fireEvent.click(screen.getByRole('checkbox', { name: /Par e-mail/ }));
    expect(screen.getByText(/Sans aucun canal/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Enregistrer mes choix' }));
    expect(await screen.findByText('Vos choix sont enregistrés.')).toBeInTheDocument();
    expect(calls[1]).toMatchObject({ method: 'PUT', body: { whatsapp: false, email: false } });
  });
});
