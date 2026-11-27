import { afterEach, describe, expect, it, vi } from 'vitest';
import { putToStorage } from './upload';

describe('envoi au stockage', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('le stockage injoignable alors que le téléphone est en ligne : message du stockage, erreur passagère', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')));
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(true);
    await expect(putToStorage('http://localhost:9000/x', {}, new Blob(['a']))).rejects.toMatchObject({
      status: 0,
      code: 'FILE_STORAGE_UNREACHABLE',
      message: expect.stringContaining('le stockage des fichiers ne répond pas'),
    });
  });

  it('le téléphone hors ligne : message de connexion', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')));
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false);
    await expect(putToStorage('http://localhost:9000/x', {}, new Blob(['a']))).rejects.toMatchObject({
      status: 0,
      code: 'NETWORK_ERROR',
    });
  });
});
