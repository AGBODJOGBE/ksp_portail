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

test('l’en-tête donne accès aux six métiers', async ({ page }, testInfo) => {
  await page.goto('/');
  const isMobile = testInfo.project.name === 'mobile';
  await page.getByRole('button', { name: isMobile ? 'Ouvrir le menu' : 'Nos métiers' }).click();
  const panel = page.locator(isMobile ? '#menu-mobile' : '#menu-metiers');
  await expect(panel).toBeVisible();
  for (const label of ['Recouvrement', 'Immobilier clés en main', 'Nettoyage et assainissement']) {
    await expect(panel.getByRole('link', { name: new RegExp(label) })).toBeVisible();
  }
  await page.keyboard.press('Escape');
  await expect(panel).toBeHidden();
});

test('« Mon espace KSP » mène à la page d’attente', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('banner').getByRole('link', { name: 'Mon espace KSP' }).first().click();
  await expect(page).toHaveURL(/\/mon-espace$/);
  await expect(page.getByRole('heading', { level: 1, name: /arrive bientôt/ })).toBeVisible();
});

test('la page de charte n’existe pas en production', async ({ request }) => {
  const response = await request.get('/charte');
  expect(response.status()).toBe(404);
});

test('l’accueil présente les six métiers et y conduit depuis la promesse', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('link', { name: 'Découvrir nos métiers' }).click();
  const metiers = page.getByRole('region', { name: 'Six métiers, un seul groupe' });
  await expect(metiers).toBeInViewport();
  await expect(metiers.getByRole('link')).toHaveCount(6);
});
