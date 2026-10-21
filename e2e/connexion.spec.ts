import { expect, type Page, test } from '@playwright/test';
import { mockGateway, VALID_CODE } from './support/gateway';

/** Parcours de connexion par téléphone, contre une gateway simulée (interception des requêtes). */

const accountLink = (page: Page, name: string) =>
  page.getByRole('banner').getByRole('link', { name }).first();

async function askCode(page: Page) {
  await page.getByRole('textbox', { name: 'Numéro' }).fill('01 97 00 00 45');
  await page.getByRole('button', { name: 'Recevoir mon code' }).click();
}

test('numéro, code, profil, Mon espace, puis déconnexion', async ({ page }) => {
  const gateway = await mockGateway(page);

  // Mon espace sans session : direction la connexion, avec retour prévu.
  await page.goto('/mon-espace');
  await expect(page).toHaveURL(/\/connexion\?retour=%2Fmon-espace$/);
  await expect(page.getByRole('heading', { level: 1, name: 'Se connecter' })).toBeVisible();
  await expect(page.getByRole('textbox', { name: 'Indicatif' })).toHaveValue('+229');

  await askCode(page);
  await expect(page.getByRole('heading', { level: 1, name: 'Saisissez votre code' })).toBeVisible();
  await expect(page.getByText('Nous avons envoyé un code par WhatsApp au +229********45.')).toBeVisible();
  const code = page.getByRole('textbox', { name: /Code reçu/ });
  await expect(code).toBeFocused();
  await expect(code).toHaveAttribute('autocomplete', 'one-time-code');
  await expect(page.getByRole('button', { name: /Renvoyer le code dans/ })).toBeDisabled();

  await code.fill(VALID_CODE);
  await page.getByRole('button', { name: 'Valider' }).click();

  await expect(page.getByRole('heading', { level: 1, name: 'Complétez votre profil' })).toBeVisible();
  await page.getByRole('textbox', { name: 'Prénom' }).fill('Koffi');
  await page.getByRole('textbox', { name: 'Nom', exact: true }).fill('Adjovi');
  await page.getByRole('button', { name: 'Enregistrer et continuer' }).click();

  await expect(page).toHaveURL(/\/mon-espace$/);
  await expect(page.getByRole('heading', { level: 1, name: 'Bonjour Koffi' })).toBeVisible();
  await expect(accountLink(page, 'Mon espace KSP')).toBeVisible();

  // Aucun jeton dans le stockage du navigateur.
  const stored = await page.evaluate(() => JSON.stringify({ ...localStorage, ...sessionStorage }));
  expect(stored).not.toContain('jeton');

  // Rechargement : jeton perdu (mémoire), session reprise en silence par le renouvellement.
  await page.reload();
  await expect(page.getByRole('heading', { level: 1, name: 'Bonjour Koffi' })).toBeVisible();

  await page.getByRole('button', { name: 'Se déconnecter' }).click();
  await expect(page).toHaveURL(/\/$/);
  await expect(accountLink(page, 'Se connecter')).toBeVisible();
  expect(gateway.calls.some((call) => call.path === '/api/v1/identity/logout')).toBe(true);

  // Plus de session : Mon espace renvoie à la connexion.
  await page.goto('/mon-espace');
  await expect(page).toHaveURL(/\/connexion\?retour=%2Fmon-espace$/);

  // Le navigateur n'envoie que des en-têtes acceptés par la politique CORS de la gateway.
  expect(gateway.forbiddenHeaders).toEqual([]);
});

test('un code incorrect est signalé avec les essais restants', async ({ page }) => {
  await mockGateway(page);
  await page.goto('/connexion');
  await askCode(page);

  const code = page.getByRole('textbox', { name: /Code reçu/ });
  await code.fill('000000');
  await page.getByRole('button', { name: 'Valider' }).click();

  await expect(page.getByText('Le code est incorrect. Il vous reste 4 essais.')).toBeVisible();
  await expect(code).toHaveAttribute('aria-invalid', 'true');
  await expect(code).toBeFocused();
});

test('la limite de demandes atteinte est annoncée et bloque un nouvel envoi', async ({ page }) => {
  await mockGateway(page, {
    requestOtp: {
      status: 429,
      body: {
        error: {
          code: 'IDENTITY_OTP_RATE_LIMITED',
          message: 'Trop de codes demandés, réessayez plus tard.',
          details: { retryAfterSeconds: 45 },
          correlationId: '0192f1c4-7a2b-7c3d-8e4f-5a6b7c8d9e12',
        },
      },
    },
  });
  await page.goto('/connexion');
  await askCode(page);

  await expect(page.getByRole('main').getByRole('alert')).toContainText(
    'Trop de codes demandés, réessayez plus tard.',
  );
  await expect(page.getByText(/Nouvel essai possible dans \d+ s\./)).toBeVisible();
  await expect(page.getByRole('button', { name: 'Recevoir mon code' })).toBeDisabled();
});

test('une session encore valide ouvre directement la page demandée, jamais un autre site', async ({
  page,
}) => {
  await mockGateway(page, { signedIn: true });
  await page.goto('/connexion?retour=https%3A%2F%2Fautre-site.example');
  await expect(page).toHaveURL(/\/mon-espace$/);
  await expect(page.getByRole('heading', { level: 1, name: 'Bonjour Koffi' })).toBeVisible();
});
