import { expect, test } from '@playwright/test';
import { mockGateway } from './support/gateway';

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

test('l’en-tête donne accès aux six métiers par « Nos services »', async ({ page }, testInfo) => {
  await page.goto('/');
  const banner = page.getByRole('banner');
  if (testInfo.project.name === 'mobile') {
    // Téléphone : « Nos services » est dans le menu plein écran, qui se ferme avec Échap.
    const openMenu = banner.getByRole('button', { name: 'Ouvrir le menu' });
    const panel = page.locator('#menu-mobile');
    await openMenu.click();
    await expect(panel).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(panel).toBeHidden();
    await openMenu.click();
    await panel.getByRole('link', { name: 'Nos services' }).click();
  } else {
    await banner.getByRole('link', { name: 'Nos services' }).click();
  }
  await expect(page).toHaveURL(/\/services$/);
  await expect(page.getByRole('heading', { level: 1, name: 'Tous nos services' })).toBeVisible();
  // Les six métiers sont les catégories de « Tous nos services ».
  const categories = page.getByRole('navigation', { name: 'Catégories de services' });
  for (const [label, id] of [
    ['Recouvrement', 'recouvrement'],
    ['Nettoyage', 'nettoyage'],
    ['Immobilier', 'immobilier'],
    ['Impression', 'impression'],
    ['Marketplace', 'marketplace'],
    ['Livraison', 'livraison'],
  ]) {
    await expect(categories.getByRole('link', { name: label, exact: true })).toHaveAttribute(
      'href',
      `/services?categorie=${id}`,
    );
  }
});

test('« Se connecter » mène à la connexion par téléphone', async ({ page }) => {
  await mockGateway(page);
  await page.goto('/');
  await page.getByRole('banner').getByRole('link', { name: 'Se connecter' }).first().click();
  await expect(page).toHaveURL(/\/connexion$/);
  await expect(page.getByRole('heading', { level: 1, name: 'Se connecter', exact: true })).toBeVisible();
  await expect(page.getByRole('textbox', { name: 'Numéro' })).toBeVisible();
});

test('la page de charte n’existe pas en production', async ({ request }) => {
  const response = await request.get('/charte');
  expect(response.status()).toBe(404);
});

test('l’accueil présente les six métiers et y conduit depuis « Être guidé »', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('link', { name: 'Être guidé' }).click();
  const besoins = page.getByRole('region', { name: /Dites-nous ce qu’il vous faut/ });
  await expect(besoins).toBeInViewport();
  // Une carte par métier, chacune vers son service.
  const cartes = besoins.getByRole('listitem').getByRole('link');
  await expect(cartes).toHaveCount(6);
  for (const href of [
    '/nettoyage',
    '/recouvrement',
    '/immobilier',
    '/impression',
    '/marketplace',
    '/livraison',
  ]) {
    await expect(besoins.locator(`a[href="${href}"]`)).toHaveCount(1);
  }
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
    links: { 'Simuler un prix': '#simulateur', 'Demander un devis': '/nettoyage/demande' },
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

test('« Déposer un dossier » mène à Mon espace KSP, qui demande la connexion', async ({ page }) => {
  await mockGateway(page);
  await page.goto('/recouvrement');
  await page
    .getByRole('main')
    .getByRole('link', { name: /Déposer un dossier/ })
    .first()
    .click();
  await expect(page).toHaveURL(/\/connexion\?retour=%2Fmon-espace$/);
  await expect(page.getByRole('heading', { level: 1, name: 'Se connecter', exact: true })).toBeVisible();
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

/* ——— Nettoyage v2 : adresses ——— */

test('Nettoyage : l’ancien formulaire de devis mène à la demande (307)', async ({ request }) => {
  const response = await request.get('/nettoyage/devis', { maxRedirects: 0 });
  expect(response.status()).toBe(307);
  expect(new URL(response.headers().location ?? '', 'http://localhost').pathname).toBe('/nettoyage/demande');
  expect((await request.get('/nettoyage/demande')).status()).toBe(200);
  expect((await request.get('/conditions/nettoyage/cg-2026-11')).status()).toBe(200);
  expect((await request.get('/conditions/nettoyage/cg-1900-01')).status()).toBe(404);
});

test('Nettoyage : les adresses des notifications répondent, même pour un dossier introuvable', async ({
  page,
}) => {
  const missing = (code: string) => ({
    status: 404,
    body: { error: { code, message: 'Introuvable.', details: {}, correlationId: 'c-1' } },
  });
  await mockGateway(page, {
    signedIn: true,
    routes: ({ path }) => {
      if (path.startsWith('/api/v1/cleaning/programs/')) return missing('CLEANING_PROGRAM_NOT_FOUND');
      if (path.startsWith('/api/v1/cleaning/sessions/')) return missing('CLEANING_SESSION_NOT_FOUND');
      if (path.startsWith('/api/v1/cleaning/claims/')) return missing('CLEANING_CLAIM_NOT_FOUND');
      return undefined;
    },
  });
  for (const path of [
    '/mon-espace/nettoyage/programmes/0192f1c4-7a2b-7c3d-8e4f-5a6b7c8d1002',
    '/mon-espace/nettoyage/programmes/0192f1c4-7a2b-7c3d-8e4f-5a6b7c8d1002/seances/s-1',
    '/mon-espace/nettoyage/programmes/0192f1c4-7a2b-7c3d-8e4f-5a6b7c8d1002/commander-a-nouveau',
    '/mon-espace/nettoyage/reclamations/0192f1c4-7a2b-7c3d-8e4f-5a6b7c8d1003',
    '/mon-espace/nettoyage/seances/0192f1c4-7a2b-7c3d-8e4f-5a6b7c8d1004',
  ]) {
    const response = await page.goto(path);
    expect(response?.status()).toBe(200);
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await expect(page.getByText(/est introuvable, ou n’appartient pas au compte actif/)).toBeVisible();
  }
});
