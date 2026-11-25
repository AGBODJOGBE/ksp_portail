import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { session } from '@/lib/api';
import { clearDraft } from '@/features/recovery/draft';
import {
  CASE_ID,
  DOCUMENT_ID,
  FILE_ID,
  ORG_ID,
  OTHER_ID,
  SIGNATURE_ID,
  awaitingFee,
  dashboard,
  errorBody,
  frozen,
  estimate,
  fileRoutes,
  mandateDocument,
  page,
  preferences,
  recoveryCase,
  sessionBody,
  stubGateway,
  summary,
  wallet,
  withMandate,
  xof,
} from '@/features/recovery/fixtures.test-utils';
import { caseSchema } from '@/features/recovery/schemas';
import { CaseDetail } from './case-detail';
import { CaseEdit } from './case-edit';
import { CaseList } from './case-list';
import { CaseWizard } from './case-wizard';
import { FeeStep } from './fee-step';
import { MandateStep } from './mandate-step';
import { RecoveryPreferences } from './preferences';
import { RecoveryHome } from './recovery-home';
import { RecoveryTodo } from './recovery-todo';

const push = vi.fn();
const replace = vi.fn();
let search = new URLSearchParams();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push, replace }),
  usePathname: () => '/mon-espace/recouvrement/dossiers',
  useSearchParams: () => search,
}));

const BASE = '/api/v1/recovery';
const CASE = `${BASE}/cases/${CASE_ID}`;

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

const roleRoute = (role: string) => ({
  [`GET /api/v1/identity/organizations/${ORG_ID}`]: { status: 200, body: { role } },
});

beforeEach(() => signIn());

afterEach(() => {
  session.clear();
  clearDraft();
  vi.unstubAllGlobals();
  push.mockReset();
  replace.mockReset();
  search = new URLSearchParams();
});

const next = () => fireEvent.click(screen.getByRole('button', { name: /Continuer/ }));

describe('assistant « Nouveau dossier »', () => {
  it('de la saisie au paiement des frais : estimation, pièce, brouillon, doublons, mandat signé, frais', async () => {
    const created = recoveryCase();
    const { calls } = stubGateway({
      [`GET ${BASE}/preferences`]: { status: 200, body: preferences() },
      [`POST ${BASE}/estimates`]: { status: 200, body: estimate() },
      ...fileRoutes(),
      [`POST ${BASE}/cases`]: {
        status: 200,
        body: {
          case: created,
          possibleDuplicates: [summary({ id: OTHER_ID, number: 'RC-000120', status: 'active' })],
        },
      },
      [`POST ${CASE}/mandate`]: {
        status: 200,
        body: { case: withMandate(), documentId: DOCUMENT_ID, signatureRequestId: SIGNATURE_ID },
      },
      [`GET /api/v1/document/documents/${DOCUMENT_ID}`]: { status: 200, body: mandateDocument() },
      [`POST /api/v1/document/signatures/${SIGNATURE_ID}/sign`]: {
        status: 200,
        body: mandateDocument({ status: 'signed', signedAt: '2026-11-20T10:00:00Z' }, { status: 'signed' }),
      },
      [`GET ${CASE}`]: { status: 200, body: awaitingFee() },
      'GET /api/v1/wallet/me': { status: 200, body: wallet(20000) },
      [`POST ${CASE}/fee/pay`]: {
        status: 200,
        body: awaitingFee({
          status: 'under_review',
          nextDeadline: { kind: 'review', dueAt: '2026-11-24T22:59:00Z' },
        }),
      },
    });
    render(<CaseWizard />);

    // 1. Type : « Locataire » est proposé mais grisé.
    expect(await screen.findByRole('radio', { name: /Un locataire/ })).toBeDisabled();
    fireEvent.click(screen.getByText('Une entreprise'));
    fireEvent.change(screen.getByLabelText('Nature de la créance'), { target: { value: 'unpaid_invoice' } });
    next();

    // 2. Débiteurs : le numéro sans indicatif est lu comme béninois, la forme envoyée est montrée.
    fireEvent.change(await screen.findByLabelText('Raison sociale'), { target: { value: 'SARL Exemple' } });
    fireEvent.change(screen.getByLabelText('Téléphone'), { target: { value: '97 00 00 45' } });
    expect(screen.getByText('Numéro utilisé : +229 01 97 00 00 45.')).toBeInTheDocument();
    next();

    // 3. Créances, avec l'estimation en direct.
    fireEvent.change(await screen.findByLabelText('Référence'), { target: { value: 'FA-2026-0142' } });
    fireEvent.change(screen.getByLabelText('Montant (FCFA)'), { target: { value: '850000' } });
    fireEvent.change(screen.getByLabelText('Date d’exigibilité'), { target: { value: '2026-08-31' } });
    const panel = screen.getByRole('region', { name: 'Estimation des frais' });
    await waitFor(() => expect(panel).toHaveTextContent(/Frais de dossier\s*15\s000\sF\sCFA/), {
      timeout: 3000,
    });
    expect(panel).toHaveTextContent('ils restent acquis à KSP quelle que soit la décision');
    expect(calls.find((call) => call.path === `${BASE}/estimates`)?.body).toEqual({
      kind: 'b2b',
      amountDue: { amount: 850000, currency: 'XOF' },
    });
    next();

    // 4. Pièces : déposée par file (recovery_evidence).
    const file = new File(['%PDF'], 'facture.pdf', { type: 'application/pdf' });
    fireEvent.change(await screen.findByLabelText('Ajouter des pièces'), { target: { files: [file] } });
    expect(await screen.findByText('facture.pdf')).toBeInTheDocument();
    expect(calls.find((call) => call.path === '/api/v1/file/uploads')?.body).toMatchObject({
      purpose: 'recovery_evidence',
    });
    next();

    // 5. Démarches et barème prérempli depuis les préférences.
    expect(await screen.findByLabelText('Durée maximale (mois)')).toHaveValue('6');
    next();

    // 6. Récapitulatif, puis enregistrement du brouillon (clé d'idempotence).
    fireEvent.click(await screen.findByRole('button', { name: 'Enregistrer le brouillon' }));
    const sent = await waitFor(() => {
      const call = calls.find((item) => item.method === 'POST' && item.path === `${BASE}/cases`);
      expect(call).toBeDefined();
      return call!;
    });
    expect(sent.headers['Idempotency-Key']).toMatch(/^[A-Za-z0-9_-]{8,100}$/);
    expect(sent.body).toMatchObject({
      kind: 'b2b',
      debtors: [{ kind: 'company', role: 'main', legalName: 'SARL Exemple', phones: ['+2290197000045'] }],
      claims: [
        { reference: 'FA-2026-0142', amount: { amount: 850000, currency: 'XOF' }, dueDate: '2026-08-31' },
      ],
      evidenceFileIds: [FILE_ID],
      planScale: { maxDurationMonths: 6, minFirstPaymentBps: 1000 },
    });

    // 7. Mandat : doublon à confirmer, puis préparation et signature par code.
    expect(await screen.findByText('Dossiers semblables déjà ouverts')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Préparer le mandat' }));
    expect(await screen.findByText(/Cochez la case pour confirmer/)).toBeInTheDocument();
    fireEvent.click(screen.getByText('Je confirme qu’il s’agit d’une autre créance'));
    fireEvent.click(screen.getByRole('button', { name: 'Préparer le mandat' }));
    expect(await screen.findByText('Conditions figées dans le mandat')).toBeInTheDocument();
    expect(calls.find((call) => call.path === `${CASE}/mandate`)?.body).toEqual({
      duplicatesAcknowledged: true,
    });
    fireEvent.change(await screen.findByLabelText(/Code reçu/), { target: { value: '123456' } });
    fireEvent.click(screen.getByText('J’ai lu le document et j’en accepte le contenu.'));
    fireEvent.click(screen.getByRole('button', { name: 'Signer le document' }));

    // 8. Frais : relecture jusqu'à « frais à payer », puis paiement par le portefeuille.
    fireEvent.click(
      await screen.findByRole('button', { name: 'Payer les frais avec mon portefeuille' }, { timeout: 4000 }),
    );
    fireEvent.click(await screen.findByRole('button', { name: /Confirmer le paiement de 15\s000/ }));

    expect(await screen.findByRole('heading', { name: 'Dossier envoyé à KSP' })).toBeInTheDocument();
    expect(screen.getByText(/sous 2 jours ouvrés/)).toBeInTheDocument();
    const pay = calls.find((call) => call.path === `${CASE}/fee/pay`);
    expect(pay?.headers['Idempotency-Key']).toMatch(/^[A-Za-z0-9_-]{8,100}$/);
  }, 20000);

  it('montant sous le minimum : l’estimation le dit avec le minimum de la gateway', async () => {
    stubGateway({
      [`GET ${BASE}/preferences`]: { status: 200, body: preferences() },
      [`POST ${BASE}/estimates`]: {
        status: 400,
        body: errorBody('RECOVERY_AMOUNT_BELOW_MINIMUM', 'brut', { minimum: xof(25000) }),
      },
    });
    render(<CaseWizard />);
    fireEvent.click(await screen.findByText('Un particulier'));
    fireEvent.change(screen.getByLabelText('Nature de la créance'), { target: { value: 'loan' } });
    next();
    fireEvent.change(await screen.findByLabelText('Nom'), { target: { value: 'Houngbo' } });
    fireEvent.change(screen.getByLabelText('E-mail'), { target: { value: 'debiteur@exemple.bj' } });
    next();
    fireEvent.change(await screen.findByLabelText('Montant (FCFA)'), { target: { value: '5000' } });
    expect(
      await screen.findByText(/Le montant dû doit atteindre au moins 25\s000\sF\sCFA/, {}, { timeout: 3000 }),
    ).toBeInTheDocument();
  });

  it('membre lecteur d’une entreprise : pas d’assistant', async () => {
    signIn('org_viewer');
    stubGateway({
      ...roleRoute('org_viewer'),
      [`GET ${BASE}/preferences`]: { status: 200, body: preferences() },
    });
    render(<CaseWizard />);
    expect(
      await screen.findByText(/seuls les administrateurs et les membres peuvent en déposer/),
    ).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Continuer/ })).toBeNull();
  });
});

describe('mandat et frais', () => {
  const draft = caseSchema.parse(recoveryCase());

  it('tarif non publié : « tarif en cours de publication »', async () => {
    stubGateway({
      [`POST ${CASE}/mandate`]: {
        status: 422,
        body: errorBody('RECOVERY_PRICING_RULE_INVALID', 'Aucune règle tarifaire publiée ne s’applique.'),
      },
    });
    render(<MandateStep recoveryCase={draft} onReady={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: 'Préparer le mandat' }));
    expect(
      await screen.findByText('Tarif en cours de publication : réessayez plus tard.'),
    ).toBeInTheDocument();
  });

  it('doublons signalés par la gateway au mandat : liste et confirmation', async () => {
    stubGateway({
      [`POST ${CASE}/mandate`]: {
        status: 400,
        body: errorBody('RECOVERY_VALIDATION_FAILED', 'Des dossiers semblables…', {
          field: 'duplicatesAcknowledged',
          duplicates: ['RC-000099'],
        }),
      },
    });
    render(<MandateStep recoveryCase={draft} onReady={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: 'Préparer le mandat' }));
    expect(await screen.findByText('RC-000099')).toBeInTheDocument();
    expect(screen.getByText('Je confirme qu’il s’agit d’une autre créance')).toBeInTheDocument();
  });

  it('mandat préparé par un autre membre : « En attente de la signature de … »', async () => {
    stubGateway({
      [`GET /api/v1/document/documents/${DOCUMENT_ID}`]: {
        status: 200,
        body: mandateDocument(
          {},
          { canSign: false, signer: { displayName: 'Awa Dossou', phoneMasked: null, hasAccount: true } },
        ),
      },
    });
    render(<MandateStep recoveryCase={caseSchema.parse(withMandate())} onReady={vi.fn()} />);
    expect(await screen.findByText('En attente de la signature de Awa Dossou.')).toBeInTheDocument();
    expect(screen.queryByLabelText(/Code reçu/)).toBeNull();
  });

  it('solde insuffisant (RECOVERY_INSUFFICIENT_FUNDS) : recharge proposée', async () => {
    stubGateway({
      'GET /api/v1/wallet/me': { status: 200, body: wallet(20000) },
      [`POST ${CASE}/fee/pay`]: {
        status: 422,
        body: errorBody('RECOVERY_INSUFFICIENT_FUNDS', 'Solde insuffisant', {
          missing: xof(13000),
          balance: xof(2000),
        }),
      },
    });
    render(<FeeStep recoveryCase={caseSchema.parse(awaitingFee())} onPaid={vi.fn()} onStale={vi.fn()} />);
    expect(screen.getByText(/ils restent acquis à KSP/)).toBeInTheDocument();
    fireEvent.click(await screen.findByRole('button', { name: 'Payer les frais avec mon portefeuille' }));
    fireEvent.click(await screen.findByRole('button', { name: /Confirmer le paiement/ }));
    expect(await screen.findByText(/il vous manque 13\s000\sF\sCFA/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Recharger/ })).toBeInTheDocument();
  });
});

describe('fiche d’un dossier', () => {
  it('dossier en cours : frise, paiement direct et arrêt proposés, score jamais montré, journal', async () => {
    stubGateway({
      [`GET ${CASE}`]: {
        status: 200,
        body: awaitingFee({
          status: 'active',
          stage: 'amicable',
          acceptedAt: '2026-11-21T09:00:00Z',
          fee: { ...frozen.fee, status: 'paid', paidAt: '2026-11-20T11:00:00Z' },
          stageHistory: [
            {
              fromStage: null,
              toStage: 'notice',
              at: '2026-11-21T09:00:00Z',
              by: { type: 'staff', userId: null, displayName: 'KSP' },
              reason: null,
              skipReason: null,
            },
            {
              fromStage: 'notice',
              toStage: 'amicable',
              at: '2026-11-29T09:00:00Z',
              by: { type: 'system', userId: null, displayName: null },
              reason: null,
              skipReason: null,
            },
          ],
          collections: [
            {
              id: 'encaissement-1',
              source: 'payment_link',
              gross: xof(100000),
              allocatedCosts: xof(0),
              allocatedInterests: xof(0),
              allocatedPrincipal: xof(100000),
              overpaid: xof(0),
              commission: xof(10000),
              netToCreditor: xof(90000),
              stage: 'amicable',
              receivedAt: '2026-11-30T10:00:00Z',
              walletTransactionId: null,
              receiptDocumentId: null,
            },
          ],
          nextDeadline: null,
        }),
      },
      [`GET ${CASE}/journal`]: {
        status: 200,
        body: {
          entries: [
            {
              id: 'j1',
              kind: 'message_sent',
              channel: 'whatsapp',
              direction: 'outbound',
              outcome: null,
              deliveryStatus: 'delivered',
              summary: 'Relance envoyée par WhatsApp',
              amount: null,
              author: { type: 'staff', userId: null, displayName: 'Chargée KSP' },
              internal: false,
              documentId: null,
              fileId: null,
              occurredAt: '2026-11-29T10:00:00Z',
            },
          ],
          nextCursor: null,
        },
      },
    });
    render(<CaseDetail id={CASE_ID} />);
    expect(
      await screen.findByRole('heading', { level: 1, name: 'SARL Exemple Distribution' }),
    ).toBeInTheDocument();
    expect(screen.getByText('Recouvrement en cours')).toBeInTheDocument();
    const current = screen.getByRole('listitem', { current: 'step' });
    expect(current).toHaveTextContent('Relance amiable');
    expect(screen.getByText(/Crédité à votre portefeuille/)).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Déclarer un paiement reçu' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Arrêter le dossier' })).toBeInTheDocument();
    expect(screen.queryByText('Bientôt disponible')).toBeNull();
    expect(screen.queryByText(/score/i)).toBeNull();
    expect(screen.queryByText('72')).toBeNull();
    fireEvent.click(screen.getByRole('tab', { name: 'Journal' }));
    expect(await screen.findByText('Relance envoyée par WhatsApp')).toBeInTheDocument();
  });

  it('dossier refusé : motif, frais tels que renvoyés par recovery, règle des frais rappelée', async () => {
    stubGateway({
      [`GET ${CASE}`]: {
        status: 200,
        body: awaitingFee({
          status: 'rejected',
          rejectionReason: 'no_evidence',
          reviewNote: 'Les factures ne sont pas signées.',
          fee: { ...frozen.fee, status: 'refunded', refundedAmount: xof(15000) },
        }),
      },
    });
    render(<CaseDetail id={CASE_ID} />);
    expect(await screen.findByText('Les pièces ne prouvent pas la créance.')).toBeInTheDocument();
    expect(screen.getByText('Les factures ne sont pas signées.')).toBeInTheDocument();
    const pricing = screen.getByRole('region', { name: 'Frais et commission' });
    expect(within(pricing).getByText('Remboursés')).toBeInTheDocument();
    expect(within(pricing).getByText('Montant remboursé')).toBeInTheDocument();
    expect(pricing).toHaveTextContent('ils restent acquis à KSP quelle que soit la décision');
  });

  it('membre lecteur : frais à payer sans bouton, explication', async () => {
    signIn('org_viewer');
    stubGateway({ ...roleRoute('org_viewer'), [`GET ${CASE}`]: { status: 200, body: awaitingFee() } });
    render(<CaseDetail id={CASE_ID} />);
    expect(await screen.findByText('Frais de dossier à payer')).toBeInTheDocument();
    expect(await screen.findByText(/permet de consulter ce dossier/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Payer les frais avec mon portefeuille' })).toBeNull();
  });

  it('dossier introuvable', async () => {
    stubGateway({
      [`GET ${CASE}`]: { status: 404, body: errorBody('RECOVERY_CASE_NOT_FOUND', 'introuvable') },
    });
    render(<CaseDetail id={CASE_ID} />);
    expect(await screen.findByText(/Ce dossier est introuvable/)).toBeInTheDocument();
  });
});

describe('complément demandé', () => {
  it('motif affiché, réponse envoyée avec la saisie, retour à la fiche', async () => {
    const { calls } = stubGateway({
      [`GET ${CASE}`]: {
        status: 200,
        body: awaitingFee({ status: 'info_requested', reviewNote: 'Ajoutez le bon de livraison.' }),
      },
      [`GET ${BASE}/preferences`]: { status: 200, body: preferences() },
      [`POST ${BASE}/estimates`]: { status: 200, body: estimate() },
      [`PUT ${CASE}`]: { status: 200, body: awaitingFee({ status: 'under_review' }) },
    });
    render(<CaseEdit id={CASE_ID} />);
    expect(await screen.findByText('Ajoutez le bon de livraison.')).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Votre réponse à KSP (facultatif)'), {
      target: { value: 'Bon de livraison ajouté.' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Envoyer le complément' }));
    await waitFor(() => expect(push).toHaveBeenCalledWith(`/mon-espace/recouvrement/dossiers/${CASE_ID}`));
    const sent = calls.find((call) => call.method === 'PUT');
    expect(sent?.body).toMatchObject({
      completionNote: 'Bon de livraison ajouté.',
      input: { evidenceFileIds: [FILE_ID] },
    });
  });
});

describe('tableau de bord et Mon espace', () => {
  const todoRoutes = (decisions = 1) => ({
    [`GET ${BASE}/dashboard`]: { status: 200, body: dashboard({ pendingDecisions: decisions }) },
    [`GET ${BASE}/cases?status=draft`]: { status: 200, body: page([]) },
    [`GET ${BASE}/cases?status=awaiting_fee`]: {
      status: 200,
      body: page([summary({ status: 'awaiting_fee', number: 'RC-000125' })]),
    },
    [`GET ${BASE}/cases?status=info_requested`]: { status: 200, body: page([]) },
    [`GET ${BASE}/cases`]: { status: 200, body: page([summary({ status: 'active', stage: 'amicable' })]) },
  });

  it('à faire (frais avec date limite, décisions), chiffres, étapes, échéances, derniers dossiers', async () => {
    stubGateway(todoRoutes());
    render(<RecoveryHome />);
    expect(await screen.findByText('Frais du dossier RC-000125 à payer')).toBeInTheDocument();
    expect(screen.getByText(/à payer avant le/)).toBeInTheDocument();
    expect(screen.getByText('Une décision attend votre réponse')).toBeInTheDocument();
    expect(screen.getByText('24 %')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Relance amiable/ })).toHaveAttribute(
      'href',
      '/mon-espace/recouvrement/dossiers?etape=amiable',
    );
    expect(screen.getByText('RC-000124 · Ets Bénin Négoce')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Importer un tableur' })).toHaveAttribute(
      'href',
      '/mon-espace/recouvrement/import',
    );
  });

  it('panneau de Mon espace : affiché s’il y a quelque chose à faire', async () => {
    stubGateway(todoRoutes(0));
    render(<RecoveryTodo />);
    expect(await screen.findByText('Frais du dossier RC-000125 à payer')).toBeInTheDocument();
  });

  it('panneau de Mon espace : masqué sans dossier en attente, service pas servi ou injoignable', async () => {
    const { calls } = stubGateway({
      ...todoRoutes(0),
      [`GET ${BASE}/cases?status=awaiting_fee`]: { status: 200, body: page([]) },
    });
    const { container } = render(<RecoveryTodo />);
    await waitFor(() => expect(calls.length).toBeGreaterThan(3));
    await waitFor(() => expect(container).toBeEmptyDOMElement());
    vi.unstubAllGlobals();
    stubGateway({
      [`GET ${BASE}/cases`]: { status: 501, body: errorBody('RECOVERY_NOT_IMPLEMENTED', 'pas encore') },
      [`GET ${BASE}/dashboard`]: { status: 501, body: errorBody('RECOVERY_NOT_IMPLEMENTED', 'pas encore') },
    });
    const second = render(<RecoveryTodo />);
    await waitFor(() => expect(second.container).toBeEmptyDOMElement());
    vi.unstubAllGlobals();
    stubGateway({
      [`GET ${BASE}/cases`]: { status: 503, body: errorBody('RECOVERY_UNAVAILABLE', 'indisponible') },
      [`GET ${BASE}/dashboard`]: { status: 503, body: errorBody('RECOVERY_UNAVAILABLE', 'indisponible') },
    });
    const third = render(<RecoveryTodo />);
    await waitFor(() => expect(third.container).toBeEmptyDOMElement());
  });
});

describe('liste des dossiers', () => {
  it('filtres lus dans l’adresse, 100 dossiers au plus sans « Afficher plus »', async () => {
    search = new URLSearchParams('etat=en-cours&etape=amiable&type=entreprise&q=RC-000123');
    const { calls } = stubGateway({
      [`GET ${BASE}/cases`]: {
        status: 200,
        body: page([summary({ status: 'active', stage: 'amicable' })], 140),
      },
    });
    render(<CaseList />);
    expect(await screen.findByText('RC-000123 · SARL Exemple Distribution')).toBeInTheDocument();
    const query = calls[0]!.query;
    expect(Object.fromEntries(query)).toEqual({
      status: 'active',
      stage: 'amicable',
      kind: 'b2b',
      search: 'RC-000123',
      limit: '100',
    });
    expect(screen.getByText(/Les 1 plus récents sur 140/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Afficher plus' })).toBeNull();
    fireEvent.change(screen.getByLabelText('État'), { target: { value: 'refuse' } });
    expect(replace).toHaveBeenCalledWith(expect.stringContaining('etat=refuse'), { scroll: false });
  });
});

describe('préférences', () => {
  it('enregistre les deux barèmes et renvoie les comptes à prévenir tels qu’ils ont été lus', async () => {
    const { calls } = stubGateway({
      [`GET ${BASE}/preferences`]: { status: 200, body: preferences() },
      [`PUT ${BASE}/preferences`]: { status: 200, body: preferences() },
    });
    render(<RecoveryPreferences />);
    expect(await screen.findByText(/nouveaux dossiers seulement/)).toBeInTheDocument();
    const fields = screen.getAllByLabelText('Durée maximale (mois)');
    fireEvent.change(fields[0]!, { target: { value: '12' } });
    fireEvent.click(screen.getByRole('button', { name: 'Enregistrer mes préférences' }));
    expect(await screen.findByText(/Préférences enregistrées/)).toBeInTheDocument();
    expect(calls.find((call) => call.method === 'PUT')?.body).toMatchObject({
      b2bScale: { maxDurationMonths: 12 },
      b2cScale: { maxDurationMonths: 3 },
      notifyUserIds: preferences().notifyUserIds,
    });
  });

  it('membre lecteur : lecture seule', async () => {
    signIn('org_viewer');
    stubGateway({
      ...roleRoute('org_viewer'),
      [`GET ${BASE}/preferences`]: { status: 200, body: preferences() },
    });
    render(<RecoveryPreferences />);
    expect(await screen.findByText(/permet de consulter ces préférences/)).toBeInTheDocument();
    expect(screen.getAllByLabelText('Durée maximale (mois)')[0]).toBeDisabled();
    expect(screen.queryByRole('button', { name: 'Enregistrer mes préférences' })).toBeNull();
  });
});
