import { expect, test } from '@playwright/test';
import { mockGateway } from './support/gateway';

/** Centre de notifications (ADR-039) et page Contact, contre une gateway simulée. */

const NOTIFICATION_ID = '0192f1c4-7a2b-7c3d-8e4f-5a6b7c8d6001';
const REQUEST_ID = '0192f1c4-7a2b-7c3d-8e4f-5a6b7c8d1001';

test('pastille de Mon espace, liste, marquer lu, préférences', async ({ page }) => {
  let unread = 2;
  let preferences = { whatsapp: true, email: true, updatedAt: null as string | null };
  const notification = (id: string, title: string, readAt: string | null) => ({
    id,
    templateCode: 'cleaning.quote_sent.customer',
    title,
    body: 'Bonjour Koffi,\nVotre devis est prêt.',
    link: `https://ksp.bj/mon-espace/nettoyage/demandes/${REQUEST_ID}`,
    createdAt: '2026-11-05T09:30:00Z',
    readAt,
  });
  const gateway = await mockGateway(page, {
    signedIn: true,
    routes: ({ method, path, body, authorized }) => {
      if (!path.startsWith('/api/v1/notification/')) return undefined;
      if (!authorized)
        return { status: 401, body: { error: { code: 'GATEWAY_TOKEN_MISSING', message: 'Non' } } };
      if (method === 'GET' && path === '/api/v1/notification/notifications/unread-count')
        return { status: 200, body: { unreadCount: unread } };
      if (method === 'GET' && path === '/api/v1/notification/notifications')
        return {
          status: 200,
          body: {
            data: [
              notification(NOTIFICATION_ID, 'Votre devis de nettoyage — Vitres', unread === 2 ? null : 'x'),
              notification(
                '0192f1c4-7a2b-7c3d-8e4f-5a6b7c8d6002',
                'Visite planifiée',
                unread > 0 ? null : 'x',
              ),
            ],
            nextCursor: null,
            unreadCount: unread,
          },
        };
      if (method === 'POST' && path === `/api/v1/notification/notifications/${NOTIFICATION_ID}/read`) {
        unread = 1;
        return {
          status: 200,
          body: {
            notification: notification(NOTIFICATION_ID, 'Votre devis', '2026-11-07T10:00:00Z'),
            unreadCount: 1,
          },
        };
      }
      if (method === 'POST' && path === '/api/v1/notification/notifications/read-all') {
        const marked = unread;
        unread = 0;
        return { status: 200, body: { marked, unreadCount: 0 } };
      }
      if (path === '/api/v1/notification/preferences') {
        if (method === 'PUT')
          preferences = { ...(body as typeof preferences), updatedAt: '2026-11-07T10:00:00Z' };
        return { status: 200, body: preferences };
      }
      return undefined;
    },
  });

  await page.goto('/mon-espace');
  const bell = page.getByRole('link', { name: 'Notifications — 2 notifications non lues' });
  await expect(bell).toBeVisible();
  await bell.click();

  await expect(page.getByRole('heading', { level: 1, name: 'Mes notifications' })).toBeVisible();
  await expect(page.getByText('2 non lues')).toBeVisible();
  const first = page.getByRole('listitem', { name: 'Votre devis de nettoyage — Vitres' });
  await first.getByRole('button', { name: 'Marquer comme lue' }).click();
  await expect(page.getByText('1 non lue', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Tout marquer comme lu' }).click();
  await expect(page.getByText('Toutes vos notifications sont marquées comme lues.')).toBeVisible();

  await page.getByRole('checkbox', { name: 'Par WhatsApp' }).uncheck();
  await page.getByRole('button', { name: 'Enregistrer mes choix' }).click();
  await expect(page.getByText('Vos choix sont enregistrés.')).toBeVisible();
  expect(gateway.calls).toContainEqual({
    method: 'PUT',
    path: '/api/v1/notification/preferences',
    body: { whatsapp: false, email: true },
  });
  expect(gateway.forbiddenHeaders).toEqual([]);
});

test('page Contact : sujet prérempli depuis un lien « support », sans compte', async ({ page }) => {
  await page.goto('/contact?sujet=paiement');
  await expect(page.getByRole('heading', { level: 1, name: 'Contacter KSP' })).toBeVisible();
  await expect(page.getByText('Paiement en ligne — vérification par le support')).toBeVisible();
  const whatsapp = page.getByRole('link', { name: /Écrire sur WhatsApp/ });
  await expect(whatsapp).toHaveAttribute('href', /wa\.me\/\d+\?text=.*Paiement/);
  await expect(page.getByRole('link', { name: 'Appeler' })).toHaveAttribute('href', /^tel:\+/);
  await expect(page).toHaveTitle(/Contacter KSP/);
});
