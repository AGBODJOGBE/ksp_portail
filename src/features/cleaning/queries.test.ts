// @vitest-environment node
import { getServedZones, ZONES_REVALIDATE_SECONDS, ZONES_TAG } from './queries';

const ZONES = {
  data: [
    { code: 'abomey-calavi', commune: 'Abomey-Calavi' },
    { code: 'cotonou', commune: 'Cotonou' },
  ],
};

function stubFetch(response: () => Promise<Response>) {
  const fetchMock = vi.fn(response);
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

afterEach(() => vi.unstubAllGlobals());

describe('zones desservies lues par le serveur', () => {
  it('lit la route publique, sans cookie ni jeton, avec revalidation', async () => {
    const fetchMock = stubFetch(async () => Response.json(ZONES));
    await expect(getServedZones()).resolves.toEqual(ZONES.data);
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit & { next?: unknown }];
    expect(new URL(url).pathname).toBe('/api/v1/cleaning/zones');
    expect(init.credentials).toBe('omit');
    expect((init.headers as Record<string, string>).Authorization).toBeUndefined();
    expect(init.next).toEqual({ revalidate: ZONES_REVALIDATE_SECONDS, tags: [ZONES_TAG] });
  });

  it('rend `null` si la gateway ne répond pas ou répond hors contrat : la page reste construite', async () => {
    stubFetch(async () => {
      throw new TypeError('fetch failed');
    });
    await expect(getServedZones()).resolves.toBeNull();
    stubFetch(async () => Response.json({ data: [{ code: 'cotonou' }] }));
    await expect(getServedZones()).resolves.toBeNull();
  });
});
