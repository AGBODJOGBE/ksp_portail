import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { session } from '@/lib/api';
import {
  CASE_ID,
  DECISION_ID,
  ORG_ID,
  OTHER_ID,
  activeCase,
  decision,
  decisionPage,
  disputePayload,
  errorBody,
  fileRoutes,
  page,
  quotePayload,
  sessionBody,
  stubGateway,
  summary,
  wallet,
  xof,
} from '@/features/recovery/fixtures.test-utils';
import { DecisionDetail } from './decision-detail';
import { DecisionList } from './decision-list';
import { RecoveryTodo } from './recovery-todo';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  usePathname: () => '/mon-espace/recouvrement/decisions',
  useSearchParams: () => new URLSearchParams(),
}));

const DECISIONS = '/api/v1/recovery/decisions';
const ANSWER = `${DECISIONS}/${DECISION_ID}`;

function signIn(role?: string) {
  session.set(sessionBody() as Parameters<typeof session.set>[0]);
  if (role) {
    session.switchContext({
      accessToken: 'jeton-org',
      accessTokenExpiresAt: '2099-01-01T00:15:00Z',
      activeContext: { type: 'business', organizationId: ORG_ID, organizationName: 'SARL Créances' },
    });
  }
}

beforeEach(() => signIn());
afterEach(() => {
  session.clear();
  vi.unstubAllGlobals();
});

/** Décision en attente retrouvée dans la liste (pas de lecture par identifiant au contrat). */
const pending = (value: unknown) => ({
  [`GET ${DECISIONS}?status=pending`]: { status: 200, body: decisionPage([value]) },
});

describe('liste des décisions', () => {
  it('en attente d’abord, la plus proche échéance en tête, conséquence d’une absence de réponse ; puis les passées', async () => {
    const { calls } = stubGateway({
      [`GET ${DECISIONS}?status=pending`]: {
        status: 200,
        body: decisionPage([
          decision({ id: OTHER_ID, kind: 'settlement_discount', expiresAt: '2026-12-05T09:00:00Z' }),
          decision({ kind: 'bailiff_escalation', expiresAt: '2026-11-28T09:00:00Z' }),
        ]),
      },
      [`GET ${DECISIONS}`]: {
        status: 200,
        body: decisionPage([
          decision({ status: 'approved', answeredAt: '2026-11-20T10:00:00Z', id: 'ancienne' }),
          decision({ kind: 'settlement_discount', id: OTHER_ID }),
        ]),
      },
    });
    render(<DecisionList />);
    const waiting = await screen.findByRole('region', { name: 'En attente de votre réponse' });
    const cards = within(waiting).getAllByRole('listitem');
    expect(cards[0]).toHaveTextContent('Passage à l’huissier');
    expect(cards[0]).toHaveTextContent('le dossier est clos, comme abandonné par vous');
    expect(cards[1]).toHaveTextContent('Remise pour paiement immédiat');
    expect(cards[1]).toHaveTextContent('la remise est refusée');
    expect(within(cards[0]!).getByRole('link', { name: 'Passage à l’huissier' })).toHaveAttribute(
      'href',
      `/mon-espace/recouvrement/decisions/${DECISION_ID}`,
    );
    const past = screen.getByRole('region', { name: 'Décisions passées' });
    expect(within(past).getAllByRole('listitem')).toHaveLength(1);
    expect(within(past).getByText('Acceptée')).toBeInTheDocument();
    expect(calls.map((call) => call.query.get('limit'))).toEqual(['100', '100']);
  });

  it('route pas encore servie (501) : « Bientôt disponible »', async () => {
    stubGateway({
      [`GET ${DECISIONS}`]: { status: 501, body: errorBody('RECOVERY_NOT_IMPLEMENTED', 'pas encore') },
    });
    render(<DecisionList />);
    expect(await screen.findByText('Bientôt disponible')).toBeInTheDocument();
  });

  it('aucune décision', async () => {
    stubGateway({ [`GET ${DECISIONS}`]: { status: 200, body: decisionPage([]) } });
    render(<DecisionList />);
    expect(await screen.findByText('Aucune décision n’attend votre réponse.')).toBeInTheDocument();
    expect(screen.getByText('Aucune décision passée.')).toBeInTheDocument();
  });
});

describe('page d’une décision', () => {
  it('échéancier hors barème : contenu, accord avec commentaire et clé d’idempotence, message gardé', async () => {
    const { calls } = stubGateway({
      ...pending(decision()),
      [`POST ${ANSWER}`]: {
        status: 200,
        body: {
          decision: decision({ status: 'approved', answeredAt: '2026-11-25T10:00:00Z' }),
          case: activeCase(),
        },
      },
    });
    render(<DecisionDetail id={DECISION_ID} />);
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Échéancier hors barème' }),
    ).toBeInTheDocument();
    expect(screen.getByText('Durée plus longue que celle de votre barème')).toBeInTheDocument();
    expect(screen.getByText(/9 échéances, chaque mois/)).toBeInTheDocument();
    expect(
      screen.getByText(/Sans réponse avant le 27 novembre 2026 à 10:00, l’échéancier est refusé/),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Accepter' }));
    fireEvent.change(screen.getByLabelText('Commentaire (facultatif)'), { target: { value: 'D’accord.' } });
    fireEvent.click(screen.getByRole('button', { name: 'Confirmer l’accord' }));
    expect(await screen.findByText('Votre accord est enregistré.')).toBeInTheDocument();
    expect(screen.getAllByText('Acceptée').length).toBeGreaterThan(0);
    expect(screen.queryByRole('button', { name: 'Accepter' })).toBeNull();
    const sent = calls.find((call) => call.method === 'POST')!;
    expect(sent.body).toEqual({ answer: 'approve', comment: 'D’accord.' });
    expect(sent.headers['Idempotency-Key']).toMatch(/^[A-Za-z0-9_-]{8,100}$/);
  });

  it('retrouvée parmi les décisions passées quand elle n’est plus en attente : consultation seule', async () => {
    stubGateway({
      [`GET ${DECISIONS}?status=pending`]: { status: 200, body: decisionPage([]) },
      [`GET ${DECISIONS}`]: {
        status: 200,
        body: decisionPage([decision({ status: 'expired', kind: 'settlement_discount', paymentPlan: null })]),
      },
    });
    render(<DecisionDetail id={DECISION_ID} />);
    expect(
      await screen.findByText('Cette décision est close : elle ne peut plus recevoir de réponse.'),
    ).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Accepter' })).toBeNull();
  });

  it('décision close entre-temps (422 RECOVERY_DECISION_CLOSED) : relue, message gardé affiché', async () => {
    stubGateway({
      [`GET ${DECISIONS}?status=pending`]: [
        { status: 200, body: decisionPage([decision()]) },
        { status: 200, body: decisionPage([]) },
      ],
      [`GET ${DECISIONS}`]: {
        status: 200,
        body: decisionPage([decision({ status: 'expired' })]),
      },
      [`POST ${ANSWER}`]: {
        status: 422,
        body: errorBody('RECOVERY_DECISION_CLOSED', 'Cette décision est déjà prise ou expirée.'),
      },
    });
    render(<DecisionDetail id={DECISION_ID} />);
    fireEvent.click(await screen.findByRole('button', { name: 'Refuser' }));
    fireEvent.click(screen.getByRole('button', { name: 'Confirmer le refus' }));
    expect(await screen.findByText(/Cette décision est déjà prise ou expirée/)).toBeInTheDocument();
    expect(await screen.findByRole('heading', { name: 'Sans réponse dans le délai' })).toBeInTheDocument();
    expect(screen.getByText(/voici son état actuel/)).toBeInTheDocument();
  });

  it('devis d’huissier : provision payée par le portefeuille (accord), refus possible', async () => {
    const quote = decision({ kind: 'bailiff_escalation', paymentPlan: null, feeQuote: quotePayload });
    const { calls } = stubGateway({
      ...pending(quote),
      'GET /api/v1/wallet/me': { status: 200, body: wallet(100000) },
      [`POST ${ANSWER}`]: {
        status: 200,
        body: {
          decision: { ...quote, status: 'approved', answeredAt: '2026-11-25T10:00:00Z' },
          case: activeCase(),
        },
      },
    });
    render(<DecisionDetail id={DECISION_ID} />);
    expect(await screen.findByText('Commandement de payer')).toBeInTheDocument();
    expect(screen.getByText('Huissier · Me Dossou, Cotonou')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Lire le devis' })).toHaveAttribute(
      'href',
      `/mon-espace/documents/${quotePayload.documentId}`,
    );
    expect(screen.getByRole('button', { name: 'Refuser le devis' })).toBeInTheDocument();
    fireEvent.click(await screen.findByRole('button', { name: 'Accepter le devis et verser la provision' }));
    fireEvent.click(await screen.findByRole('button', { name: /Confirmer le paiement de 30/ }));
    expect(await screen.findByText(/Votre accord est enregistré/)).toBeInTheDocument();
    expect(calls.find((call) => call.method === 'POST')?.body).toEqual({ answer: 'approve' });
  });

  it('devis : solde insuffisant (RECOVERY_INSUFFICIENT_FUNDS) → recharge proposée', async () => {
    const quote = decision({ kind: 'litigation_escalation', paymentPlan: null, feeQuote: quotePayload });
    stubGateway({
      ...pending(quote),
      'GET /api/v1/wallet/me': { status: 200, body: wallet(50000) },
      [`POST ${ANSWER}`]: {
        status: 422,
        body: errorBody('RECOVERY_INSUFFICIENT_FUNDS', 'Solde insuffisant.', {
          missing: xof(10000),
          balance: xof(20000),
        }),
      },
    });
    render(<DecisionDetail id={DECISION_ID} />);
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Procédure judiciaire' }),
    ).toBeInTheDocument();
    fireEvent.click(await screen.findByRole('button', { name: 'Accepter le devis et verser la provision' }));
    fireEvent.click(await screen.findByRole('button', { name: /Confirmer le paiement/ }));
    expect(await screen.findByRole('button', { name: /Recharger/ })).toBeInTheDocument();
  });

  it('contestation : réponse écrite ou pièce exigée, pièces déposées par file, réponse envoyée', async () => {
    const dispute = decision({ kind: 'dispute_response', paymentPlan: null, dispute: disputePayload });
    const { calls } = stubGateway({
      ...pending(dispute),
      ...fileRoutes(),
      [`POST ${ANSWER}`]: {
        status: 200,
        body: {
          decision: { ...dispute, status: 'answered', answeredAt: '2026-11-25T10:00:00Z' },
          case: activeCase(),
        },
      },
    });
    render(<DecisionDetail id={DECISION_ID} />);
    expect(await screen.findByText('Le débiteur dit avoir déjà payé')).toBeInTheDocument();
    expect(screen.getByText(disputePayload.text)).toBeInTheDocument();
    expect(screen.getByText('1 pièce jointe par le débiteur.')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Envoyer ma réponse' }));
    expect(
      await screen.findByText('Écrivez votre réponse, ou joignez au moins une pièce.'),
    ).toBeInTheDocument();
    expect(calls.some((call) => call.method === 'POST' && call.path === ANSWER)).toBe(false);

    fireEvent.change(screen.getByLabelText('Votre réponse au débiteur'), {
      target: { value: 'Aucun paiement reçu : voir le relevé bancaire.' },
    });
    fireEvent.change(screen.getByLabelText('Pièces (facultatif)'), {
      target: { files: [new File(['%PDF'], 'releve.pdf', { type: 'application/pdf' })] },
    });
    expect(await screen.findByText('releve.pdf')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Envoyer ma réponse' }));
    expect(await screen.findByText('Votre réponse est envoyée au juriste de KSP.')).toBeInTheDocument();
    expect(calls.find((call) => call.method === 'POST' && call.path === ANSWER)?.body).toEqual({
      answer: 'answer',
      comment: 'Aucun paiement reçu : voir le relevé bancaire.',
      fileIds: ['0192f1c4-7a2b-7c3d-8e4f-5a6b7c8d7301'],
    });
  });

  it('saut d’étape : étape actuelle lue sur le dossier ; refus envoyé', async () => {
    const skip = decision({ kind: 'stage_skip', paymentPlan: null });
    const { calls } = stubGateway({
      ...pending(skip),
      [`GET /api/v1/recovery/cases/${CASE_ID}`]: { status: 200, body: activeCase() },
      [`POST ${ANSWER}`]: {
        status: 200,
        body: {
          decision: { ...skip, status: 'rejected', answeredAt: '2026-11-25T10:00:00Z' },
          case: activeCase(),
        },
      },
    });
    render(<DecisionDetail id={DECISION_ID} />);
    expect(await screen.findByText('Relance amiable')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Refuser' }));
    fireEvent.click(screen.getByRole('button', { name: 'Confirmer le refus' }));
    expect(await screen.findByText('Votre refus est enregistré.')).toBeInTheDocument();
    expect(calls.find((call) => call.method === 'POST')?.body).toEqual({ answer: 'reject' });
  });

  it('membre lecteur d’une entreprise : consultation seule', async () => {
    signIn('org_viewer');
    stubGateway({
      [`GET /api/v1/identity/organizations/${ORG_ID}`]: { status: 200, body: { role: 'org_viewer' } },
      ...pending(decision()),
    });
    render(<DecisionDetail id={DECISION_ID} />);
    expect(await screen.findByText(/permet de consulter cette décision/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Accepter' })).toBeNull();
  });

  it('introuvable : message et retour à la liste', async () => {
    stubGateway({ [`GET ${DECISIONS}`]: { status: 200, body: decisionPage([]) } });
    render(<DecisionDetail id={DECISION_ID} />);
    expect(await screen.findByText(/Cette décision est introuvable/)).toBeInTheDocument();
    expect(screen.getAllByRole('link', { name: 'Toutes les décisions' }).length).toBeGreaterThan(0);
  });
});

describe('rubrique « À faire »', () => {
  it('une carte par décision en attente, avec sa date limite et sa conséquence', async () => {
    stubGateway({
      [`GET /api/v1/recovery/cases?status=draft`]: { status: 200, body: page([]) },
      [`GET /api/v1/recovery/cases?status=awaiting_fee`]: { status: 200, body: page([]) },
      [`GET /api/v1/recovery/cases?status=info_requested`]: {
        status: 200,
        body: page([summary({ status: 'info_requested' })]),
      },
      ...pending(decision({ kind: 'dispute_response', paymentPlan: null, dispute: disputePayload })),
    });
    render(<RecoveryTodo />);
    expect(await screen.findByText('Contestation du débiteur · dossier RC-000123')).toBeInTheDocument();
    expect(screen.getByText(/le juriste de KSP décide sans votre réponse/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Répondre/ })).toHaveAttribute(
      'href',
      `/mon-espace/recouvrement/decisions/${DECISION_ID}`,
    );
  });

  it('liste des décisions illisible : le nombre du tableau de bord, en une carte', async () => {
    stubGateway({
      [`GET /api/v1/recovery/cases`]: { status: 200, body: page([]) },
      [`GET ${DECISIONS}`]: { status: 503, body: errorBody('RECOVERY_UNAVAILABLE', 'indisponible') },
      [`GET /api/v1/recovery/dashboard`]: {
        status: 200,
        body: {
          entrusted: xof(0),
          recovered: xof(0),
          outstanding: xof(0),
          recoveryRateBps: 0,
          casesByStage: [],
          pendingDecisions: 2,
          upcomingInstallments: [],
        },
      },
    });
    render(<RecoveryTodo />);
    expect(await screen.findByText('2 décisions attendent votre réponse')).toBeInTheDocument();
    await waitFor(() =>
      expect(screen.getByRole('link', { name: /Voir les décisions/ })).toHaveAttribute(
        'href',
        '/mon-espace/recouvrement/decisions',
      ),
    );
  });
});
