import { expect, test } from '@playwright/test';
import { fakeCleaning } from './support/cleaning';
import { mockGateway, VALID_CODE } from './support/gateway';

/**
 * Parcours client du Nettoyage contre une gateway simulée : simuler, se connecter, demander un devis,
 * voir la demande, accepter le devis (après la visite des lieux), voir la mission.
 */

/** Date au format des champs de date, dans `days` jours. */
const inDays = (days: number) => new Date(Date.now() + days * 86_400_000).toISOString().slice(0, 10);

test('simuler, se connecter, demander un devis, accepter le devis et voir la mission', async ({ page }) => {
  const cleaning = fakeCleaning();
  const gateway = await mockGateway(page, { routes: cleaning.routes });

  // 1. Simulation, sans compte.
  await page.goto('/nettoyage#simulateur');
  const simulator = page.getByRole('form', { name: 'Simulateur de prestation de nettoyage' });
  const next = () => simulator.getByRole('button', { name: /Continuer|Voir le récapitulatif/ }).click();
  await simulator.getByLabel(/^Nettoyage à domicile/).check();
  await next();
  await simulator.getByLabel('Maison ou villa').check();
  await next();
  await simulator.getByRole('textbox', { name: 'Nombre de pièces' }).fill('6');
  await next();
  await simulator.getByLabel('Vitres').check();
  await next();
  await simulator.getByLabel('Abomey-Calavi').check();
  await next();
  await simulator.getByLabel('Une seule fois').check();
  await next();
  await expect(simulator.getByText(/Entre 33\s500\sFCFA et 43\s000\sFCFA/)).toBeVisible();
  await expect(simulator.getByText(/Estimation non contractuelle/)).toBeVisible();

  // 2. Demande de devis : connexion d'abord, puis retour avec la simulation.
  await simulator.getByRole('link', { name: /Demander un devis/ }).click();
  await expect(page).toHaveURL(/\/connexion\?retour=%2Fnettoyage%2Fdevis%3Fprestation%3Dhome_cleaning/);
  await page.getByRole('textbox', { name: 'Numéro' }).fill('01 97 00 00 45');
  await page.getByRole('button', { name: 'Recevoir mon code' }).click();
  await page.getByRole('textbox', { name: /Code reçu/ }).fill(VALID_CODE);
  await page.getByRole('button', { name: 'Valider' }).click();
  await page.getByRole('textbox', { name: 'Prénom' }).fill('Koffi');
  await page.getByRole('textbox', { name: 'Nom', exact: true }).fill('Adjovi');
  await page.getByRole('button', { name: 'Enregistrer et continuer' }).click();

  await expect(page).toHaveURL(/\/nettoyage\/devis\?prestation=home_cleaning/);
  await expect(page.getByRole('heading', { level: 1, name: 'Demander un devis de nettoyage' })).toBeVisible();
  await expect(page.getByText(/Une visite des lieux est obligatoire avant tout devis/)).toBeVisible();
  await expect(page.getByText('Compte personnel')).toBeVisible();
  await expect(page.getByText('6 pièces')).toBeVisible();
  await page.getByLabel(/Adresse d’intervention/).fill('Lot 12, quartier Zogbadjè');
  await page.getByLabel('Date du créneau 1').fill(inDays(4));
  await page.getByRole('button', { name: 'Envoyer ma demande' }).click();
  await expect(page.getByText('Demande envoyée')).toBeVisible();

  // 3. La demande dans « Mes prestations de nettoyage ».
  await page.getByRole('link', { name: 'Voir ma demande' }).click();
  await expect(page).toHaveURL(/\/mon-espace\/nettoyage\/demandes\/[0-9a-f-]+$/);
  await expect(page.getByRole('heading', { level: 1, name: 'Nettoyage à domicile' })).toBeVisible();
  await expect(page.getByText('Demande reçue')).toBeVisible();

  // 4. Visite faite, devis envoyé : le client l'accepte.
  cleaning.sendQuote();
  await page.reload();
  await expect(page.getByText('Devis à étudier')).toBeVisible();
  await expect(page.getByText('Six pièces, accès facile.')).toBeVisible();
  await page.getByRole('button', { name: 'Accepter le devis' }).click();
  const accept = page.getByRole('form', { name: 'Accepter le devis' });
  await accept.getByRole('radio').first().check();
  await accept.getByRole('button', { name: 'Confirmer et réserver' }).click();

  // 5. La mission.
  await expect(page).toHaveURL(/\/mon-espace\/nettoyage\/missions\/[0-9a-f-]+$/);
  await expect(page.getByText('Planifiée')).toBeVisible();
  await expect(page.getByText('À régler')).toBeVisible();

  // Une clé d'idempotence par envoi, et seulement des en-têtes acceptés par la gateway.
  expect(cleaning.idempotencyKeys).toHaveLength(2);
  for (const key of cleaning.idempotencyKeys) expect(key).toMatch(/^[A-Za-z0-9_-]{8,100}$/);
  expect(gateway.forbiddenHeaders).toEqual([]);
});

test('« Mes prestations de nettoyage » demande une connexion', async ({ page }) => {
  await mockGateway(page, { routes: fakeCleaning().routes });
  await page.goto('/mon-espace/nettoyage/demandes');
  await expect(page).toHaveURL(/\/connexion\?retour=%2Fmon-espace%2Fnettoyage%2Fdemandes$/);
});

test('le simulateur annonce une panne de la gateway et permet de réessayer', async ({ page }) => {
  let failures = 1;
  const cleaning = fakeCleaning();
  await mockGateway(page, {
    routes: (request) => {
      if (request.path === '/api/v1/cleaning/services' && failures > 0) {
        failures -= 1;
        return {
          status: 503,
          body: {
            error: {
              code: 'GATEWAY_UNAVAILABLE',
              message: 'Service momentanément indisponible. Réessayez dans quelques instants.',
              details: {},
              correlationId: '0192f1c4-7a2b-7c3d-8e4f-5a6b7c8d9e12',
            },
          },
        };
      }
      return cleaning.routes(request);
    },
  });
  await page.goto('/nettoyage#simulateur');
  await expect(
    page.getByText(/Impossible de charger les prestations\. Service momentanément indisponible/),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Réessayer' }).click();
  const simulator = page.getByRole('form', { name: 'Simulateur de prestation de nettoyage' });
  await expect(simulator.getByLabel(/^Nettoyage à domicile/)).toBeVisible();
});
