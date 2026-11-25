import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import {
  DISPUTE_ID,
  EVIDENCE_FILE_ID,
  LINK_TOKEN,
  PAYMENT_URL,
  PLAN_ID,
  RECEIPT_ID,
  SESSION_TOKEN,
  UPLOAD_ID,
  access,
  codeSent,
  debtorCaseBody,
  debtorSession,
  dispute,
  offer,
  plan,
} from '@/features/recovery/debtor-fixtures.test-utils';
import { errorBody, stubGateway, xof } from '@/features/recovery/fixtures.test-utils';
import { debtorWindow } from './debtor-parts';
import { DebtorSpace } from './debtor-space';

type Reply = { status: number; body?: unknown };

const D = '/api/v1/recovery/debtor';
const ACCESS = `${D}/access/${LINK_TOKEN}`;

function routes(extra: Record<string, Reply | Reply[]> = {}) {
  return {
    [`GET ${ACCESS}`]: { status: 200, body: access() },
    [`POST ${ACCESS}/code`]: { status: 200, body: codeSent() },
    [`POST ${ACCESS}/verify`]: { status: 200, body: debtorSession() },
    [`GET ${D}/case`]: { status: 200, body: debtorCaseBody() },
    ...extra,
  };
}

/** Onglet ouvert par un paiement ou un document (remplace `window.open`). */
function fakeTab() {
  const tab = { opener: {} as unknown, location: { href: '' }, close: vi.fn() };
  vi.spyOn(debtorWindow, 'open').mockReturnValue(tab as unknown as Window);
  return tab;
}

async function requestCode() {
  fireEvent.click(await screen.findByRole('button', { name: 'Recevoir mon code' }));
  return screen.findByLabelText(/Code à 6 chiffres/);
}

async function enterCode(code = '482913') {
  const field = await screen.findByLabelText(/Code à 6 chiffres/);
  fireEvent.change(field, { target: { value: code } });
  fireEvent.click(screen.getByRole('button', { name: 'Ouvrir mon espace' }));
}

/** Accès, code, puis situation. */
async function openSpace(extra: Record<string, Reply | Reply[]> = {}) {
  const gateway = stubGateway(routes(extra));
  render(<DebtorSpace token={LINK_TOKEN} />);
  await requestCode();
  await enterCode();
  await screen.findByRole('heading', { level: 1, name: 'Votre situation' });
  return gateway;
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  vi.useRealTimers();
});

describe('espace du débiteur : accès par le lien (D1, D2)', () => {
  it('lien mal formé : introuvable, sans appel', async () => {
    const { calls } = stubGateway({});
    render(<DebtorSpace token="court" />);
    expect(await screen.findByRole('heading', { name: 'Ce lien n’est plus valable' })).toBeInTheDocument();
    expect(calls).toHaveLength(0);
  });

  it('lien inconnu ou expiré (404) : message neutre, sans connexion', async () => {
    stubGateway({
      [`GET ${ACCESS}`]: {
        status: 404,
        body: errorBody('RECOVERY_DEBTOR_LINK_INVALID', 'Ce lien est introuvable.'),
      },
    });
    render(<DebtorSpace token={LINK_TOKEN} />);
    expect(await screen.findByRole('heading', { name: 'Ce lien n’est plus valable' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Recevoir mon code' })).not.toBeInTheDocument();
  });

  it('service indisponible (503) : message, puis « Réessayer » relit le lien', async () => {
    stubGateway({
      [`GET ${ACCESS}`]: [
        { status: 503, body: errorBody('RECOVERY_UNAVAILABLE', 'Indisponible.') },
        { status: 200, body: access() },
      ],
    });
    render(<DebtorSpace token={LINK_TOKEN} />);
    expect(await screen.findByText(/Le service est momentanément indisponible/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Réessayer' }));
    expect(await screen.findByRole('button', { name: 'Recevoir mon code' })).toBeInTheDocument();
  });

  it('accueil, code, situation : session dans son en-tête, jamais de jeton de compte, rien de stocké', async () => {
    const { calls } = await openSpace();

    const accueil = calls.find((call) => call.path === ACCESS);
    expect(accueil?.method).toBe('GET');
    expect(calls.find((call) => call.path === `${ACCESS}/verify`)?.body).toEqual({ code: '482913' });
    const situation = calls.find((call) => call.path === `${D}/case`);
    expect(situation?.headers['X-Debtor-Session']).toBe(SESSION_TOKEN);
    // Aucun jeton de compte KSP, sur aucune route ; la session ne part qu'après le code.
    expect(calls.every((call) => !('Authorization' in call.headers))).toBe(true);
    expect(
      calls.filter((call) => call.path.startsWith(ACCESS)).every((call) => !call.headers['X-Debtor-Session']),
    ).toBe(true);

    expect(screen.getByText(/135\s000/, { selector: 'p' })).toBeInTheDocument();
    expect(screen.getByText('Session ouverte jusqu’à 10:30')).toBeInTheDocument();
    expect(screen.getByText('Pour le compte de Pharmacie du Port')).toBeInTheDocument();
    expect(screen.getByText('FA-2026-014, FA-2026-015')).toBeInTheDocument();
    // Ni le jeton ni la session dans la page ou dans le navigateur.
    expect(document.body.innerHTML).not.toContain(SESSION_TOKEN);
    expect(document.body.innerHTML).not.toContain(LINK_TOKEN);
    expect(window.sessionStorage.length + window.localStorage.length).toBe(0);
  });

  it('accueil : créancier, coordonnée masquée, validité, puis canal et heure du code', async () => {
    stubGateway(routes());
    render(<DebtorSpace token={LINK_TOKEN} />);
    expect(await screen.findByText('Pharmacie du Port')).toBeInTheDocument();
    expect(screen.getByText(/KSP vous contacte pour le compte de/)).toBeInTheDocument();
    expect(screen.getByText('+229 •• •• 45')).toBeInTheDocument();
    const field = await requestCode();
    expect(field).toHaveAttribute('autocomplete', 'one-time-code');
    expect(field).toHaveAttribute('inputmode', 'numeric');
    expect(
      screen.getByText('Code envoyé par WhatsApp au +229 •• •• 45. Il est valable jusqu’à 10:10.'),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Nouveau code dans \d+ s/ })).toBeDisabled();
  });

  it('code faux (essais restants), code expiré, puis blocage d’une heure', async () => {
    stubGateway(
      routes({
        [`POST ${ACCESS}/verify`]: [
          {
            status: 400,
            body: errorBody('RECOVERY_DEBTOR_CODE_INVALID', 'Le code est incorrect.', { attemptsLeft: 4 }),
          },
          { status: 422, body: errorBody('RECOVERY_DEBTOR_CODE_EXPIRED', 'Aucun code valable.') },
          {
            status: 429,
            body: errorBody('RECOVERY_DEBTOR_LOCKED', 'Bloqué.', { retryAfterSeconds: 3600 }),
          },
        ],
      }),
    );
    render(<DebtorSpace token={LINK_TOKEN} />);
    await requestCode();

    await enterCode('111111');
    expect(await screen.findByText('Ce code est incorrect. Il vous reste 4 essais.')).toBeInTheDocument();
    expect(screen.getByLabelText(/Code à 6 chiffres/)).toHaveValue('');

    await enterCode('222222');
    expect(
      await screen.findByText('Ce code n’est plus valable : demandez un nouveau code.'),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Recevoir un nouveau code' })).toBeEnabled();

    await enterCode('333333');
    expect(await screen.findByText('Accès bloqué pendant une heure')).toBeInTheDocument();
    expect(screen.queryByLabelText(/Code à 6 chiffres/)).not.toBeInTheDocument();
  });

  it('code incomplet : refusé sans appel', async () => {
    const { calls } = stubGateway(routes());
    render(<DebtorSpace token={LINK_TOKEN} />);
    await requestCode();
    await enterCode('123');
    expect(await screen.findByText('Saisissez les 6 chiffres du code.')).toBeInTheDocument();
    expect(calls.some((call) => call.path.endsWith('/verify'))).toBe(false);
  });

  it('code déjà envoyé il y a moins d’une minute : saisie directe et compte à rebours', async () => {
    stubGateway(
      routes({
        [`POST ${ACCESS}/code`]: {
          status: 429,
          body: errorBody('RECOVERY_DEBTOR_CODE_TOO_SOON', 'Un code vient de vous être envoyé.', {
            retryAfterSeconds: 40,
          }),
        },
      }),
    );
    render(<DebtorSpace token={LINK_TOKEN} />);
    await requestCode();
    expect(screen.getByText(/Un code vient déjà de vous être envoyé au \+229 •• •• 45/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Nouveau code dans 4\d s/ })).toBeDisabled();
  });

  it('blocage à la demande du code : message, aucune saisie', async () => {
    stubGateway(
      routes({
        [`POST ${ACCESS}/code`]: {
          status: 429,
          body: errorBody('RECOVERY_DEBTOR_LOCKED', 'Bloqué.', { retryAfterSeconds: 1800 }),
        },
      }),
    );
    render(<DebtorSpace token={LINK_TOKEN} />);
    fireEvent.click(await screen.findByRole('button', { name: 'Recevoir mon code' }));
    expect(await screen.findByText('Accès bloqué pendant une heure')).toBeInTheDocument();
    expect(screen.queryByLabelText(/Code à 6 chiffres/)).not.toBeInTheDocument();
  });
});

describe('espace du débiteur : situation (D3) et session', () => {
  it('situation pas encore servie (501) : « Bientôt disponible »', async () => {
    stubGateway(
      routes({
        [`GET ${D}/case`]: { status: 501, body: errorBody('RECOVERY_NOT_IMPLEMENTED', 'Pas encore.') },
      }),
    );
    render(<DebtorSpace token={LINK_TOKEN} />);
    await requestCode();
    await enterCode();
    expect(await screen.findByText('Bientôt disponible')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Terminer' })).toBeInTheDocument();
  });

  it('session expirée (401) : retour au code avec un message clair, la session est oubliée', async () => {
    stubGateway(
      routes({
        [`GET ${D}/case`]: {
          status: 401,
          body: errorBody('RECOVERY_DEBTOR_SESSION_INVALID', 'Votre session a expiré.'),
        },
      }),
    );
    render(<DebtorSpace token={LINK_TOKEN} />);
    await requestCode();
    await enterCode();
    // L'écran du code est remonté avec le message : il remplace celui où le code a été saisi.
    expect(
      await screen.findByText('Votre session est terminée. Pour continuer, demandez un nouveau code.'),
    ).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 1, name: 'Saisissez votre code' })).toHaveFocus();
    expect(screen.getByRole('button', { name: 'Recevoir un nouveau code' })).toBeInTheDocument();
    expect(screen.queryByLabelText(/Code à 6 chiffres/)).not.toBeInTheDocument();
  });

  it('suspendue : explication, ni « Payer » ni contestation, rappel possible', async () => {
    await openSpace({
      [`GET ${D}/case`]: {
        status: 200,
        body: debtorCaseBody({ status: 'suspended', disputes: [dispute()] }),
      },
    });
    expect(screen.getByText(/Votre contestation est en cours d’examen/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Payer' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Contester cette dette/ })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Être rappelé/ })).toBeInTheDocument();
    expect(screen.getByText('En attente de la réponse du créancier')).toBeInTheDocument();
  });

  it('échéancier envoyé à la signature : état, échéances, renvoi du lien', async () => {
    const { calls } = await openSpace({
      [`GET ${D}/case`]: { status: 200, body: debtorCaseBody({ plan: plan() }) },
      [`POST ${D}/payment-plans/${PLAN_ID}/signature`]: {
        status: 200,
        body: { signatureExpiresAt: '2099-11-28T09:00:00Z' },
      },
    });
    expect(screen.getByText(/Un lien de signature vous a été envoyé par message/)).toBeInTheDocument();
    expect(screen.getByText('Échéance 3')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Renvoyer le lien de signature' }));
    expect(await screen.findByText(/Nouveau lien envoyé/)).toBeInTheDocument();
    expect(calls.find((call) => call.path.endsWith('/signature'))?.headers['X-Debtor-Session']).toBe(
      SESSION_TOKEN,
    );
  });

  it('documents et reçus : adresse redemandée à chaque clic, ouverte dans un nouvel onglet', async () => {
    const tab = fakeTab();
    const { calls } = await openSpace({
      [`GET ${D}/documents/${EVIDENCE_FILE_ID}/download-url`]: {
        status: 200,
        body: { url: 'https://stockage.test/facture.pdf', expiresAt: '2099-11-25T09:05:00Z' },
      },
      [`GET ${D}/documents/${RECEIPT_ID}/download-url`]: {
        status: 200,
        body: { url: 'https://stockage.test/recu.pdf', expiresAt: '2099-11-25T09:05:00Z' },
      },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Ouvrir Facture FA-2026-014' }));
    await waitFor(() => expect(tab.location.href).toBe('https://stockage.test/facture.pdf'));
    expect(tab.opener).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: /Reçu du paiement du 10 novembre 2026/ }));
    await waitFor(() => expect(tab.location.href).toBe('https://stockage.test/recu.pdf'));
    expect(calls.filter((call) => call.path.endsWith('/download-url'))).toHaveLength(2);
  });

  it('terminer (D9) : session fermée, puis « Rouvrir » redemande un code', async () => {
    const { calls } = await openSpace({
      [`POST ${D}/session/end`]: { status: 200, body: { endedAt: '2026-11-25T09:20:00Z' } },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Terminer' }));
    expect(await screen.findByText('Session fermée')).toBeInTheDocument();
    expect(calls.find((call) => call.path === `${D}/session/end`)?.headers['X-Debtor-Session']).toBe(
      SESSION_TOKEN,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Rouvrir mon espace' }));
    expect(await screen.findByRole('button', { name: 'Recevoir mon code' })).toBeInTheDocument();
  });
});

describe('espace du débiteur : payer (D4)', () => {
  it('la totalité : clé d’idempotence, page de paiement dans un nouvel onglet', async () => {
    const tab = fakeTab();
    const { calls } = await openSpace({
      [`POST ${D}/payments`]: {
        status: 200,
        body: { paymentUrl: PAYMENT_URL, amount: xof(135000), expiresAt: '2099-11-28T09:00:00Z' },
      },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Payer' }));
    expect(await screen.findByRole('heading', { level: 1, name: 'Payer' })).toHaveFocus();
    fireEvent.click(screen.getByRole('button', { name: /^Payer 135/ }));
    expect(await screen.findByText('Page de paiement ouverte')).toBeInTheDocument();
    expect(tab.location.href).toBe(PAYMENT_URL);
    expect(tab.opener).toBeNull();
    const payment = calls.find((call) => call.path === `${D}/payments`);
    expect(payment?.body).toEqual({ amount: xof(135000) });
    expect(payment?.headers['Idempotency-Key']).toMatch(/^[A-Za-z0-9_-]{8,100}$/);
    expect(payment?.headers['X-Debtor-Session']).toBe(SESSION_TOKEN);
  });

  it('montant libre au-delà du dû : refusé sans appel ; refus de recovery près du champ', async () => {
    const tab = fakeTab();
    const { calls } = await openSpace({
      [`POST ${D}/payments`]: {
        status: 422,
        body: errorBody(
          'RECOVERY_PAYMENT_AMOUNT_INVALID',
          'Le montant doit être compris entre 1 FCFA et le montant dû.',
          {
            due: xof(135000),
          },
        ),
      },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Payer' }));
    fireEvent.click(await screen.findByRole('radio', { name: /Un autre montant/ }));
    fireEvent.change(screen.getByLabelText(/Montant en F CFA/), { target: { value: '200 000' } });
    fireEvent.click(screen.getByRole('button', { name: /^Payer 200/ }));
    expect(await screen.findByText(/Le montant ne peut pas dépasser 135/)).toBeInTheDocument();
    expect(calls.some((call) => call.path === `${D}/payments`)).toBe(false);

    fireEvent.change(screen.getByLabelText(/Montant en F CFA/), { target: { value: '50000' } });
    fireEvent.click(screen.getByRole('button', { name: /^Payer 50/ }));
    expect(await screen.findByText(/Le montant doit être compris entre 1 FCFA/)).toBeInTheDocument();
    expect(calls.find((call) => call.path === `${D}/payments`)?.body).toEqual({ amount: xof(50000) });
    expect(tab.close).toHaveBeenCalled();
  });

  it('limite de débit (429) : délai annoncé', async () => {
    fakeTab();
    await openSpace({
      [`POST ${D}/payments`]: {
        status: 429,
        body: errorBody('GATEWAY_RATE_LIMITED', 'Trop de requêtes.', { retryAfterSeconds: 30 }),
      },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Payer' }));
    fireEvent.click(await screen.findByRole('button', { name: /^Payer 135/ }));
    expect(
      await screen.findByText('Trop de demandes en peu de temps. Réessayez dans 30 s.'),
    ).toBeInTheDocument();
  });

  it('remise proposée : payée avec son identifiant', async () => {
    fakeTab();
    const { calls } = await openSpace({
      [`GET ${D}/case`]: { status: 200, body: debtorCaseBody({ settlementOffer: offer() }) },
      [`POST ${D}/payments`]: {
        status: 200,
        body: { paymentUrl: PAYMENT_URL, amount: xof(120000), expiresAt: '2099-11-28T09:00:00Z' },
      },
    });
    expect(screen.getByText('Offre de remise')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Payer avec la remise' }));
    expect(await screen.findByRole('radio', { name: /Avec la remise/ })).toBeChecked();
    fireEvent.click(screen.getByRole('button', { name: /^Payer 120/ }));
    await screen.findByText('Page de paiement ouverte');
    expect(calls.find((call) => call.path === `${D}/payments`)?.body).toEqual({
      amount: xof(120000),
      settlementId: offer().id,
    });
  });

  it('paiement en cours : « Reprendre » ouvre sa page dans un nouvel onglet', async () => {
    await openSpace({
      [`GET ${D}/case`]: { status: 200, body: debtorCaseBody({ pendingPaymentUrl: PAYMENT_URL }) },
    });
    const resume = screen.getByRole('link', { name: /Reprendre le paiement en cours/ });
    expect(resume).toHaveAttribute('href', PAYMENT_URL);
    expect(resume).toHaveAttribute('target', '_blank');
    expect(resume).toHaveAttribute('rel', 'noopener noreferrer');
  });

  it('route pas encore servie (501) : « Bientôt disponible » à la place du formulaire', async () => {
    const tab = fakeTab();
    await openSpace({
      [`POST ${D}/payments`]: { status: 501, body: errorBody('RECOVERY_NOT_IMPLEMENTED', 'Pas encore.') },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Payer' }));
    fireEvent.click(await screen.findByRole('button', { name: /^Payer 135/ }));
    expect(await screen.findByText('Bientôt disponible')).toBeInTheDocument();
    expect(tab.close).toHaveBeenCalled();
  });

  it('session expirée pendant le paiement : retour au code', async () => {
    fakeTab();
    await openSpace({
      [`POST ${D}/payments`]: {
        status: 401,
        body: errorBody('RECOVERY_DEBTOR_SESSION_INVALID', 'Votre session a expiré.'),
      },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Payer' }));
    fireEvent.click(await screen.findByRole('button', { name: /^Payer 135/ }));
    expect(await screen.findByText(/Votre session est terminée/)).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 1, name: 'Saisissez votre code' })).toBeInTheDocument();
  });
});

describe('espace du débiteur : échéancier (D5)', () => {
  it('simulation en direct, proposition dans le barème, lien de signature', async () => {
    const { calls } = await openSpace({
      [`POST ${D}/payment-plans/simulate`]: {
        status: 200,
        body: { installments: plan().installments, total: xof(135000), withinScale: true, violations: [] },
      },
      [`POST ${D}/payment-plans`]: { status: 200, body: plan() },
    });
    fireEvent.click(screen.getByRole('button', { name: /Proposer un échéancier/ }));
    expect(await screen.findByText('Conditions acceptées par le créancier')).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText(/Premier versement \(F CFA\)/), { target: { value: '35000' } });
    fireEvent.change(screen.getByLabelText('Date du premier versement'), { target: { value: '2099-12-01' } });
    fireEvent.change(screen.getByLabelText(/Nombre d’échéances/), { target: { value: '2' } });
    expect(
      await screen.findByText(/Dans les conditions du créancier/, {}, { timeout: 3000 }),
    ).toBeInTheDocument();
    expect(calls.find((call) => call.path.endsWith('/simulate'))?.body).toEqual({
      terms: { firstAmount: xof(35000), firstDueDate: '2099-12-01', rhythm: 'monthly', installmentsCount: 2 },
    });

    fireEvent.click(screen.getByRole('button', { name: 'Proposer cet échéancier' }));
    expect(await screen.findByText('Échéancier accepté : signature à faire')).toBeInTheDocument();
    const proposal = calls.find((call) => call.method === 'POST' && call.path === `${D}/payment-plans`);
    expect(proposal?.headers['Idempotency-Key']).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Renvoyer le lien de signature' })).toBeInTheDocument();
  });

  it('hors barème : écarts listés, proposition transmise au chargé', async () => {
    await openSpace({
      [`POST ${D}/payment-plans/simulate`]: {
        status: 200,
        body: {
          installments: plan().installments,
          total: xof(135000),
          withinScale: false,
          violations: ['duration'],
        },
      },
      [`POST ${D}/payment-plans`]: {
        status: 200,
        body: plan({ withinScale: false, violations: ['duration'], documentId: null }),
      },
    });
    fireEvent.click(screen.getByRole('button', { name: /Proposer un échéancier/ }));
    fireEvent.change(await screen.findByLabelText(/Premier versement \(F CFA\)/), {
      target: { value: '5000' },
    });
    fireEvent.change(screen.getByLabelText('Date du premier versement'), { target: { value: '2099-12-01' } });
    fireEvent.change(screen.getByLabelText(/Nombre d’échéances/), { target: { value: '30' } });
    expect(
      await screen.findByText(
        'La durée totale dépasse celle acceptée par le créancier.',
        {},
        { timeout: 3000 },
      ),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Proposer cet échéancier' }));
    expect(await screen.findByText('Proposition transmise')).toBeInTheDocument();
  });

  it('champs manquants : refusés sans appel', async () => {
    const { calls } = await openSpace();
    fireEvent.click(screen.getByRole('button', { name: /Proposer un échéancier/ }));
    fireEvent.click(await screen.findByRole('button', { name: 'Proposer cet échéancier' }));
    expect(await screen.findByText('Saisissez le montant du premier versement.')).toBeInTheDocument();
    expect(calls.some((call) => call.path.startsWith(`${D}/payment-plans`))).toBe(false);
  });
});

describe('espace du débiteur : contester (D6)', () => {
  it('motif, texte et une pièce envoyée par le dépôt du débiteur', async () => {
    const { calls } = await openSpace({
      [`POST ${D}/uploads`]: {
        status: 200,
        body: {
          fileId: UPLOAD_ID,
          uploadUrl: 'https://stockage.test/depot',
          uploadExpiresAt: '2099-11-25T09:20:00Z',
          uploadHeaders: { 'Content-Type': 'application/pdf' },
        },
      },
      [`POST ${D}/uploads/${UPLOAD_ID}/complete`]: {
        status: 200,
        body: { fileId: UPLOAD_ID, status: 'available' },
      },
      [`POST ${D}/disputes`]: { status: 200, body: dispute({ fileIds: [UPLOAD_ID] }) },
    });
    fireEvent.click(screen.getByRole('button', { name: /Contester cette dette/ }));
    await screen.findByRole('heading', { level: 1, name: 'Contester cette dette' });

    fireEvent.click(screen.getByRole('button', { name: 'Envoyer ma contestation' }));
    expect(await screen.findByText('Choisissez un motif.')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('radio', { name: /J’ai déjà payé/ }));
    fireEvent.change(screen.getByLabelText(/Expliquez votre situation/), {
      target: { value: 'Facture déjà réglée par virement le 12 octobre.' },
    });
    const file = new File(['%PDF-1.4'], 'recu-virement.pdf', { type: 'application/pdf' });
    fireEvent.change(screen.getByLabelText(/Ajouter des pièces/), { target: { files: [file] } });
    expect(await screen.findByText('recu-virement.pdf')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Envoyer ma contestation' }));
    expect(await screen.findByText('Contestation enregistrée')).toBeInTheDocument();

    const declared = calls.find((call) => call.path === `${D}/uploads`);
    expect(declared?.body).toEqual({
      fileName: 'recu-virement.pdf',
      contentType: 'application/pdf',
      sizeBytes: 8,
    });
    // Envoi direct au stockage : seulement les en-têtes signés, ni session ni jeton.
    const put = calls.find((call) => call.method === 'PUT');
    expect(put?.headers).toEqual({ 'Content-Type': 'application/pdf' });
    const sent = calls.find((call) => call.path === `${D}/disputes`);
    expect(sent?.body).toEqual({
      reason: 'already_paid',
      text: 'Facture déjà réglée par virement le 12 octobre.',
      fileIds: [UPLOAD_ID],
    });
    expect(sent?.headers['Idempotency-Key']).toBeTruthy();
    expect(screen.getByText(/Le créancier doit répondre avant le 5 décembre 2026/)).toBeInTheDocument();
    void DISPUTE_ID;
  });

  it('texte trop court ; pièce refusée à la confirmation', async () => {
    await openSpace({
      [`POST ${D}/uploads`]: {
        status: 200,
        body: {
          fileId: UPLOAD_ID,
          uploadUrl: 'https://stockage.test/depot',
          uploadExpiresAt: '2099-11-25T09:20:00Z',
          uploadHeaders: {},
        },
      },
      [`POST ${D}/uploads/${UPLOAD_ID}/complete`]: {
        status: 200,
        body: { fileId: UPLOAD_ID, status: 'rejected' },
      },
    });
    fireEvent.click(screen.getByRole('button', { name: /Contester cette dette/ }));
    fireEvent.click(await screen.findByRole('radio', { name: /Autre motif/ }));
    fireEvent.change(screen.getByLabelText(/Expliquez votre situation/), { target: { value: 'Non.' } });
    fireEvent.click(screen.getByRole('button', { name: 'Envoyer ma contestation' }));
    expect(await screen.findByText('Écrivez au moins 10 caractères.')).toBeInTheDocument();

    const file = new File(['x'], 'photo.png', { type: 'image/png' });
    fireEvent.change(screen.getByLabelText(/Ajouter des pièces/), { target: { files: [file] } });
    expect(await screen.findByText(/photo\.png : Fichier refusé/)).toBeInTheDocument();
  });
});

describe('espace du débiteur : être rappelé (D7)', () => {
  it('jour et créneau à l’heure du Bénin, envoyés en UTC', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-11-25T08:00:00Z'));
    const { calls } = await openSpace({
      [`POST ${D}/callbacks`]: { status: 200, body: { requestedAt: '2026-11-25T08:00:01Z' } },
    });
    fireEvent.click(screen.getByRole('button', { name: /Être rappelé/ }));
    const day = await screen.findByLabelText('Jour');
    expect(within(day).queryByRole('option', { name: /dimanche 29 novembre/ })).not.toBeInTheDocument();
    fireEvent.change(day, { target: { value: '2026-11-26' } });
    fireEvent.click(screen.getByRole('radio', { name: '8 h – 10 h' }));
    fireEvent.click(screen.getByRole('button', { name: 'Demander à être rappelé' }));
    expect(await screen.findByText('Rappel demandé')).toBeInTheDocument();
    expect(screen.getByText(/jeudi 26 novembre 2026, entre 8 h et 10 h/)).toBeInTheDocument();
    expect(calls.find((call) => call.path === `${D}/callbacks`)?.body).toEqual({
      preferredFrom: '2026-11-26T07:00:00.000Z',
      preferredTo: '2026-11-26T09:00:00.000Z',
    });
  });

  it('rappel déjà prévu : message de recovery', async () => {
    await openSpace({
      [`POST ${D}/callbacks`]: {
        status: 422,
        body: errorBody(
          'RECOVERY_INVALID_TRANSITION',
          'Un rappel est déjà prévu : le chargé vous appellera.',
        ),
      },
    });
    fireEvent.click(screen.getByRole('button', { name: /Être rappelé/ }));
    const day = await screen.findByLabelText('Jour');
    const option = within(day).getAllByRole('option')[2] as HTMLOptionElement;
    fireEvent.change(day, { target: { value: option.value } });
    fireEvent.click(screen.getAllByRole('radio')[0]!);
    fireEvent.click(screen.getByRole('button', { name: 'Demander à être rappelé' }));
    expect(
      await screen.findByText('Un rappel est déjà prévu : le chargé vous appellera.'),
    ).toBeInTheDocument();
  });
});
