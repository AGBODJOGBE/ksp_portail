import { expect, test } from '@playwright/test';
import { fakeCleaning } from './support/cleaning';
import { mockGateway, VALID_CODE } from './support/gateway';

/**
 * Parcours client du Nettoyage contre une gateway simulée : demande de devis par lieu (lieu,
 * prestations et estimation, position, créneaux, connexion à l'envoi, confirmation, suivi du groupe),
 * puis acceptation d'un devis et mission.
 */

/** Date au format des champs de date, dans `days` jours. */
const inDays = (days: number) => new Date(Date.now() + days * 86_400_000).toISOString().slice(0, 10);

test.use({
  geolocation: { latitude: 6.3654, longitude: 2.4183, accuracy: 12 },
  permissions: ['geolocation'],
});

test('demande de devis par lieu : estimation, position, connexion à l’envoi, confirmation et suivi', async ({
  page,
}) => {
  const cleaning = fakeCleaning();
  const gateway = await mockGateway(page, { routes: cleaning.routes });
  const next = () => page.getByRole('button', { name: /^(Continuer|Vérifier ma demande)/ }).click();

  // L'ancienne demande à une prestation mène au nouveau parcours.
  await page.goto('/nettoyage/devis');
  await expect(page).toHaveURL(/\/nettoyage\/demande$/);

  // 1. Le lieu.
  await page.getByText('Maison', { exact: true }).click();
  await next();

  // 2. Les prestations, et l'estimation en direct.
  await page.getByText('Nettoyage de vitres', { exact: true }).first().click();
  await page.getByRole('textbox', { name: /^Nombre de fenêtres/ }).fill('12');
  await page.getByRole('group', { name: 'Accès aux fenêtres' }).getByText('Plain-pied').click();
  await page.getByRole('group', { name: 'À quelle fréquence ?' }).getByText('Une fois').click();
  const estimate = page.getByRole('region', { name: 'Votre estimation' });
  await expect(estimate.getByText(/33\s500\sF\sCFA – 43\s000\sF\sCFA/)).toBeVisible();
  await expect(estimate.getByText(/Estimation non contractuelle/)).toBeVisible();
  await next();

  // 3. L'adresse : position GPS au clic, commune en repli (pas encore de session), repère.
  await page.getByRole('button', { name: 'Me localiser' }).click();
  await expect(page.getByText('Position enregistrée, à environ 12 m près.')).toBeVisible();
  await page.getByRole('combobox', { name: 'Commune' }).selectOption('Cotonou');
  await page.getByRole('textbox', { name: 'Point de repère' }).fill('Portail vert après la pharmacie');

  // Un rafraîchissement ne perd rien.
  await page.reload();
  await expect(page.getByText('Nous avons repris votre demande là où vous l’aviez laissée.')).toBeVisible();
  await expect(page.getByRole('textbox', { name: 'Point de repère' })).toHaveValue(
    'Portail vert après la pharmacie',
  );
  await next();

  // 4. Les créneaux.
  await page.getByLabel('Date du créneau 1').fill(inDays(4));
  await next();

  // 5. Récapitulatif : connexion par téléphone dans le parcours, puis envoi.
  await expect(page.getByRole('button', { name: 'Envoyer ma demande' })).toBeDisabled();
  await page.getByRole('textbox', { name: 'Numéro' }).fill('01 97 00 00 45');
  await page.getByRole('button', { name: 'Recevoir mon code' }).click();
  await page.getByRole('textbox', { name: /Code reçu/ }).fill(VALID_CODE);
  await page.getByRole('button', { name: 'Valider' }).click();
  await page.getByRole('textbox', { name: 'Prénom' }).fill('Koffi');
  await page.getByRole('textbox', { name: 'Nom', exact: true }).fill('Adjovi');
  await page.getByRole('button', { name: 'Enregistrer et continuer' }).click();
  await expect(page.getByText('Connecté : Koffi Adjovi')).toBeVisible();
  await page.getByRole('button', { name: 'Envoyer ma demande' }).click();

  // 6. Confirmation, puis suivi du groupe.
  await expect(page.getByText('Demande envoyée')).toBeVisible();
  await expect(page).toHaveURL(/\/nettoyage\/demande\?groupe=[0-9a-f-]+$/);
  await expect(page.getByText('Visite des lieux', { exact: true })).toBeVisible();
  const sent = gateway.calls.find((call) => call.path === '/api/v1/cleaning/quote-request-groups');
  expect(sent?.body).toMatchObject({
    placeType: 'house',
    location: { latitude: 6.3654, longitude: 2.4183 },
    landmark: 'Portail vert après la pharmacie',
    items: [
      {
        serviceCode: 'window_cleaning',
        answers: { window_count: 12, access: 'ground_floor' },
        frequency: 'once',
      },
    ],
  });
  await page.getByRole('link', { name: /Suivre ma demande/ }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Demande de devis groupée' })).toBeVisible();
  await expect(page.getByText('Demande reçue')).toBeVisible();

  expect(cleaning.idempotencyKeys).toHaveLength(1);
  expect(cleaning.idempotencyKeys[0]).toMatch(/^[A-Za-z0-9_-]{8,100}$/);
  expect(gateway.forbiddenHeaders).toEqual([]);
});

test('accepter le devis d’une demande et voir la mission', async ({ page }) => {
  const cleaning = fakeCleaning();
  cleaning.seedRequest();
  cleaning.sendQuote();
  const gateway = await mockGateway(page, { routes: cleaning.routes, signedIn: true });

  await page.goto('/mon-espace/nettoyage/demandes/0192f1c4-7a2b-7c3d-8e4f-5a6b7c8d1001');
  await expect(page.getByRole('heading', { level: 1, name: 'Nettoyage de vitres' })).toBeVisible();
  await expect(page.getByText('Devis à étudier')).toBeVisible();
  await expect(page.getByText('Six pièces, accès facile.')).toBeVisible();
  await page.getByRole('button', { name: 'Accepter le devis' }).click();
  const accept = page.getByRole('form', { name: 'Accepter le devis' });
  await accept.getByRole('radio').first().check();
  await accept.getByRole('button', { name: 'Confirmer et réserver' }).click();

  await expect(page).toHaveURL(/\/mon-espace\/nettoyage\/missions\/[0-9a-f-]+\?reservation=confirmee$/);
  await expect(page.getByText(/Devis accepté : votre mission est réservée/)).toBeVisible();
  await expect(page.getByText('Planifiée')).toBeVisible();
  await expect(page.getByText('À régler')).toBeVisible();
  expect(cleaning.idempotencyKeys).toHaveLength(1);
  expect(gateway.forbiddenHeaders).toEqual([]);
});

test('« Mes prestations de nettoyage » demande une connexion', async ({ page }) => {
  await mockGateway(page, { routes: fakeCleaning().routes });
  await page.goto('/mon-espace/nettoyage/demandes');
  await expect(page).toHaveURL(/\/connexion\?retour=%2Fmon-espace%2Fnettoyage%2Fdemandes$/);
});

test('la page Nettoyage mène à la demande, lieu déjà choisi', async ({ page }) => {
  await mockGateway(page, { routes: fakeCleaning().routes });
  await page.goto('/nettoyage');
  await page.getByRole('link', { name: 'Commencer ma demande' }).click();
  await expect(page).toHaveURL(/\/nettoyage\/demande$/);
  await expect(page.getByRole('heading', { level: 2, name: 'Quel lieu faut-il nettoyer ?' })).toBeVisible();
});
