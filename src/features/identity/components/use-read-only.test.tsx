import { act, renderHook, waitFor } from '@testing-library/react';
import { session } from '@/lib/api';
import { sessionBody, stubGateway } from '@/features/identity/fake-gateway.test-utils';
import { useReadOnly } from './use-read-only';

const ORG_ID = '0192f1c4-7a2b-7c3d-8e4f-5a6b7c8d0a01';
const OTHER_ID = '0192f1c4-7a2b-7c3d-8e4f-5a6b7c8d0a02';
const ORG = (id: string) => `GET /api/v1/identity/organizations/${id}`;

function enter(organizationId: string) {
  session.switchContext({
    accessToken: `jeton-${organizationId}`,
    accessTokenExpiresAt: '2099-01-01T00:15:00Z',
    activeContext: { type: 'business', organizationId, organizationName: 'SARL Bénin Propre' },
  });
}

beforeEach(() => {
  session.set(sessionBody({ profileIncomplete: false }) as Parameters<typeof session.set>[0]);
});
afterEach(() => {
  session.clear();
  vi.unstubAllGlobals();
});

describe('droits dans l’organisation active (hook commun au portefeuille et au Nettoyage)', () => {
  it('compte personnel : jamais en lecture seule, rien n’est demandé', () => {
    const { calls } = stubGateway({});
    const { result } = renderHook(() => useReadOnly());
    expect(result.current).toBe(false);
    expect(calls).toHaveLength(0);
  });

  it('membre lecteur : lecture seule ; membre : actions permises', async () => {
    const { calls } = stubGateway({
      [ORG(ORG_ID)]: { status: 200, body: { role: 'org_viewer' } },
      [ORG(OTHER_ID)]: { status: 200, body: { role: 'org_member' } },
    });
    enter(ORG_ID);
    const { result } = renderHook(() => useReadOnly());
    await waitFor(() => expect(result.current).toBe(true));

    // Changement de contexte : le rôle est relu pour la nouvelle organisation.
    act(() => enter(OTHER_ID));
    expect(result.current).toBe(false);
    await waitFor(() =>
      expect(calls.map((call) => call.path)).toContain(`/api/v1/identity/organizations/${OTHER_ID}`),
    );
    expect(result.current).toBe(false);
  });

  it('rôle illisible : la gateway reste juge, rien n’est masqué', async () => {
    const { calls } = stubGateway({
      [ORG(ORG_ID)]: { status: 503, body: { error: { code: 'X', message: 'panne', details: {} } } },
    });
    enter(ORG_ID);
    const { result } = renderHook(() => useReadOnly());
    await waitFor(() => expect(calls.length).toBeGreaterThan(0));
    expect(result.current).toBe(false);
  });
});
