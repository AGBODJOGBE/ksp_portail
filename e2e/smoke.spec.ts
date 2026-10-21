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

/* ——— Pages métiers ——— */

const METIER_PAGES = [
  {
    path: '/recouvrement',
    links: {
      'Déposer un dossier': '/mon-espace',
      'Demander un conseil': '/contact?sujet=recouvrement-conseil',
    },
  },
  {
    path: '/nettoyage',
    links: { 'Simuler ma prestation': '#simulateur', 'Demander un devis': '/contact?sujet=nettoyage-devis' },
  },
  {
    path: '/immobilier',
    links: {
      'Préparer mon projet': '#demande-de-devis',
      'Prendre rendez-vous': '/contact?sujet=immobilier-rendez-vous',
    },
  },
  { path: '/livraison', links: { 'Nous contacter': '/contact?sujet=livraison' } },
  { path: '/impression', links: { 'Demander un devis': '/contact?sujet=impression-devis' } },
  { path: '/marketplace', links: { 'Devenir vendeur': '/contact?sujet=marketplace-vendeur' } },
] as const;

for (const { path, links } of METIER_PAGES) {
  test(`la page ${path} répond, a son titre et ses actions principales`, async ({ page }) => {
    const response = await page.goto(path);
    expect(response?.status()).toBe(200);
    await expect(page.getByRole('heading', { level: 1 })).toHaveCount(1);
    const hero = page.getByRole('main').getByRole('region').first();
    await expect(hero.getByRole('heading', { level: 1 })).toBeVisible();
    for (const [name, href] of Object.entries(links)) {
      await expect(hero.getByRole('link', { name: new RegExp(name) })).toHaveAttribute('href', href);
    }
  });
}

test('« Déposer un dossier » mène à Mon espace KSP', async ({ page }) => {
  await page.goto('/recouvrement');
  await page
    .getByRole('main')
    .getByRole('link', { name: /Déposer un dossier/ })
    .first()
    .click();
  await expect(page).toHaveURL(/\/mon-espace$/);
  await expect(page.getByRole('heading', { level: 1, name: /arrive bientôt/ })).toBeVisible();
});

test('« Commander une course » est affiché mais pas encore actif', async ({ page }) => {
  await page.goto('/livraison');
  await expect(page.getByRole('button', { name: 'Commander une course' })).toBeDisabled();
});

test('les liens vers KSP Print et KSP Shop pointent vers les sites de l’écosystème', async ({ page }) => {
  await page.goto('/impression');
  await expect(
    page
      .getByRole('main')
      .getByRole('link', { name: /Découvrir KSP Print/ })
      .first(),
  ).toHaveAttribute('href', /^https?:\/\//);
  await page.goto('/marketplace');
  await expect(
    page
      .getByRole('main')
      .getByRole('link', { name: /Découvrir KSP Shop/ })
      .first(),
  ).toHaveAttribute('href', /^https?:\/\//);
});

test('le simulateur de nettoyage se parcourt jusqu’au récapitulatif sans afficher de prix', async ({
  page,
}) => {
  await page.goto('/nettoyage');
  await page
    .getByRole('main')
    .getByRole('link', { name: /Simuler ma prestation/ })
    .first()
    .click();
  const form = page.getByRole('form', { name: 'Simulateur de prestation de nettoyage' });
  await expect(form).toBeInViewport();
  const submit = form.locator('button[type=submit]');
  for (let step = 0; step < 4; step++) {
    await form.locator('input[type=radio]').first().check();
    const amount = form.locator('input[type=text]');
    if (await amount.count()) await amount.fill('120');
    await submit.click();
  }
  await expect(form.getByRole('heading', { name: 'Votre demande' })).toBeFocused();
  await expect(form).toContainText('Estimation bientôt disponible');
  await expect(form).not.toContainText(/FCFA|F\s?CFA/);
  await expect(form.getByRole('link', { name: /Demander un devis/ })).toHaveAttribute(
    'href',
    '/contact?sujet=nettoyage-devis',
  );
});
