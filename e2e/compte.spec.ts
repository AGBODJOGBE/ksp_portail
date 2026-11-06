import { expect, test } from '@playwright/test';
import { mockGateway, VALID_CODE } from './support/gateway';

/** Suppression du compte (ADR-036), contre une gateway simulée qui applique la session restreinte. */

test('demander la suppression, se reconnecter pendant le délai, puis l’annuler', async ({ page }) => {
  const gateway = await mockGateway(page, { signedIn: true });

  await page.goto('/mon-espace/compte');
  await expect(page.getByRole('heading', { level: 1, name: 'Mon compte' })).toBeVisible();
  await expect(page.getByText(/gelé pendant 30 jours/)).toBeVisible();
  await page.getByRole('button', { name: 'Supprimer mon compte' }).click();
  await expect(
    page.getByRole('heading', { name: 'Confirmer la suppression de votre compte ?' }),
  ).toBeFocused();
  await page.getByRole('button', { name: 'Oui, supprimer mon compte' }).click();

  // Sessions fermées : date prévue et façon d'annuler.
  await expect(
    page.getByRole('heading', { level: 1, name: /Suppression de votre compte prévue le .*5 décembre 2026/ }),
  ).toBeVisible();
  await page.getByRole('link', { name: 'Se reconnecter' }).click();

  await page.getByRole('textbox', { name: 'Numéro' }).fill('01 97 00 00 45');
  await page.getByRole('button', { name: 'Recevoir mon code' }).click();
  await page.getByRole('textbox', { name: /Code reçu/ }).fill(VALID_CODE);
  await page.getByRole('button', { name: 'Valider' }).click();

  // Session restreinte : la page dédiée, jamais une erreur 403.
  await expect(page).toHaveURL(/\/mon-espace\/compte$/);
  await expect(
    page.getByRole('heading', { level: 1, name: /Suppression prévue le .*5 décembre 2026/ }),
  ).toBeVisible();
  await page.goto('/mon-espace/factures');
  await expect(
    page.getByRole('heading', { level: 1, name: /Suppression prévue le .*5 décembre 2026/ }),
  ).toBeVisible();

  await page.getByRole('button', { name: 'Annuler la suppression' }).click();
  await expect(page.getByText('Suppression annulée : votre compte est de nouveau actif.')).toBeVisible();
  await page.getByRole('button', { name: 'Continuer' }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Mes factures' })).toBeVisible();

  expect(gateway.deniedWhilePending).toEqual([]);
  expect(gateway.forbiddenHeaders).toEqual([]);
});
