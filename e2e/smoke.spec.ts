import { expect, test } from '@playwright/test';

test('la page d’accueil s’affiche avec son titre', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  await expect(page).toHaveTitle(/KSP/);
});

test('les pages légales sont accessibles depuis le pied de page', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('contentinfo').getByRole('link', { name: 'Mentions légales' }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Mentions légales' })).toBeVisible();
});

test('une page inconnue renvoie la page 404', async ({ page }) => {
  const response = await page.goto('/page-qui-n-existe-pas');
  expect(response?.status()).toBe(404);
  await expect(page.getByRole('heading', { name: 'Page introuvable' })).toBeVisible();
});

test('la sonde de santé répond', async ({ request }) => {
  const response = await request.get('/api/health');
  expect(response.ok()).toBeTruthy();
  expect(await response.json()).toMatchObject({ status: 'ok', site: 'portail' });
});
