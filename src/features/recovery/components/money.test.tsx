import { fireEvent, render, screen, within } from '@testing-library/react';
import { session } from '@/lib/api';
import { beninDate } from '@/lib/format';
import {
  CASE_ID,
  activeCase,
  errorBody,
  fileRoutes,
  page,
  sessionBody,
  stubGateway,
  summary,
  xof,
} from '@/features/recovery/fixtures.test-utils';
import { CaseDetail } from './case-detail';
import { resetStopPending } from './case-money';
import { RecoveryStatements } from './statements';
import { RecoveryTracking } from './recovery-tracking';

let search = new URLSearchParams();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  usePathname: () => '/mon-espace/recouvrement/releves',
  useSearchParams: () => search,
}));

const CASE = `/api/v1/recovery/cases/${CASE_ID}`;

beforeEach(() => session.set(sessionBody() as Parameters<typeof session.set>[0]));
afterEach(() => {
  session.clear();
  vi.unstubAllGlobals();
  resetStopPending();
  search = new URLSearchParams();
});

const collection = (amount: number) => ({
  id: 'encaissement-direct',
  source: 'direct_to_creditor',
  gross: xof(amount),
  allocatedCosts: xof(0),
  allocatedInterests: xof(0),
  allocatedPrincipal: xof(amount),
  overpaid: xof(0),
  commission: xof(amount / 10),
  netToCreditor: xof(amount),
  stage: 'amicable',
  receivedAt: '2026-11-24T10:00:00Z',
  walletTransactionId: null,
  receiptDocumentId: null,
});

describe('paiement reçu directement', () => {
  it('montant, date, note et preuve ; commission facturée chaque mois ; message gardé, reste dû à jour', async () => {
    const { calls } = stubGateway({
      [`GET ${CASE}`]: { status: 200, body: activeCase() },
      ...fileRoutes(),
      [`POST ${CASE}/direct-payments`]: {
        status: 200,
        body: {
          case: activeCase({
            amounts: {
              principal: xof(850000),
              interests: xof(0),
              costs: xof(0),
              paid: xof(100000),
              waived: xof(0),
              due: xof(750000),
              overpaid: xof(0),
            },
            collections: [collection(100000)],
          }),
          collection: collection(100000),
        },
      },
    });
    render(<CaseDetail id={CASE_ID} />);
    const panel = await screen.findByRole('region', { name: 'Déclarer un paiement reçu' });
    expect(panel).toHaveTextContent('facturée chaque mois');
    fireEvent.click(within(panel).getByRole('button', { name: 'Déclarer un paiement reçu…' }));

    // Montant non entier : refusé avant l'envoi.
    fireEvent.change(within(panel).getByLabelText('Montant reçu (FCFA)'), { target: { value: '1500,5' } });
    fireEvent.click(within(panel).getByRole('button', { name: 'Déclarer le paiement' }));
    expect(await within(panel).findByText(/montant entier en FCFA/)).toBeInTheDocument();

    fireEvent.change(within(panel).getByLabelText('Montant reçu (FCFA)'), { target: { value: '100 000' } });
    expect(within(panel).getByLabelText('Date de réception')).toHaveValue(beninDate());
    fireEvent.change(within(panel).getByLabelText('Date de réception'), { target: { value: '2026-11-24' } });
    fireEvent.change(within(panel).getByLabelText('Note (facultatif)'), {
      target: { value: 'Virement Ecobank' },
    });
    fireEvent.change(within(panel).getByLabelText('Preuve du paiement (facultatif)'), {
      target: { files: [new File(['%PDF'], 'virement.pdf', { type: 'application/pdf' })] },
    });
    expect(await within(panel).findByText('virement.pdf')).toBeInTheDocument();
    fireEvent.click(within(panel).getByRole('button', { name: 'Déclarer le paiement' }));

    expect(
      await screen.findByText(/Paiement de 100\s000\sF\sCFA enregistré\. Reste dû : 750\s000/),
    ).toBeInTheDocument();
    const sent = calls.find((call) => call.path === `${CASE}/direct-payments`)!;
    expect(sent.body).toEqual({
      amount: xof(100000),
      receivedOn: '2026-11-24',
      note: 'Virement Ecobank',
      proofFileId: '0192f1c4-7a2b-7c3d-8e4f-5a6b7c8d7301',
    });
    expect(sent.headers['Idempotency-Key']).toMatch(/^[A-Za-z0-9_-]{8,100}$/);
  });

  it('montant au-delà du reste dû (RECOVERY_PAYMENT_AMOUNT_INVALID) : message près du champ', async () => {
    stubGateway({
      [`GET ${CASE}`]: { status: 200, body: activeCase() },
      [`POST ${CASE}/direct-payments`]: {
        status: 422,
        body: errorBody(
          'RECOVERY_PAYMENT_AMOUNT_INVALID',
          'Le montant doit être compris entre 1 FCFA et le montant dû (850 000 FCFA).',
          { due: xof(850000) },
        ),
      },
    });
    render(<CaseDetail id={CASE_ID} />);
    const panel = await screen.findByRole('region', { name: 'Déclarer un paiement reçu' });
    fireEvent.click(within(panel).getByRole('button', { name: 'Déclarer un paiement reçu…' }));
    fireEvent.change(within(panel).getByLabelText('Montant reçu (FCFA)'), { target: { value: '900000' } });
    fireEvent.click(within(panel).getByRole('button', { name: 'Déclarer le paiement' }));
    expect(await within(panel).findByText(/compris entre 1 FCFA et le montant dû/)).toBeInTheDocument();
    expect(within(panel).getByLabelText('Montant reçu (FCFA)')).toHaveAttribute('aria-invalid', 'true');
  });
});

describe('arrêt du dossier', () => {
  const openStop = async () => {
    const panel = await screen.findByRole('region', { name: 'Arrêter le dossier' });
    expect(panel).toHaveTextContent('La commission de KSP reste due sur les sommes déjà encaissées.');
    expect(panel).toHaveTextContent('dans les 30 jours qui suivent l’arrêt');
    expect(panel).toHaveTextContent('frais d’étude : ils ne sont jamais remboursés');
    fireEvent.click(within(panel).getByRole('button', { name: 'Arrêter le dossier…' }));
    return panel;
  };

  it('motif et confirmation exigés, puis arrêt : dossier clos, message gardé', async () => {
    const { calls } = stubGateway({
      [`GET ${CASE}`]: { status: 200, body: activeCase() },
      [`POST ${CASE}/stop`]: {
        status: 200,
        body: activeCase({
          status: 'closed',
          closure: {
            reason: 'abandoned_by_creditor',
            note: 'Accord trouvé',
            closedAt: '2026-11-25T10:00:00Z',
            closedBy: { type: 'creditor', userId: null, displayName: 'Koffi Adjovi' },
            settlementCertificateDocumentId: null,
          },
        }),
      },
    });
    render(<CaseDetail id={CASE_ID} />);
    const panel = await openStop();
    fireEvent.click(within(panel).getByRole('button', { name: 'Confirmer l’arrêt' }));
    expect(await within(panel).findByText(/3 caractères au moins/)).toBeInTheDocument();
    expect(within(panel).getByText(/Cochez la case/)).toBeInTheDocument();
    fireEvent.change(within(panel).getByLabelText('Motif de l’arrêt'), {
      target: { value: 'Accord trouvé' },
    });
    fireEvent.click(within(panel).getByText(/J’ai compris/));
    fireEvent.click(within(panel).getByRole('button', { name: 'Confirmer l’arrêt' }));
    expect(await screen.findByText(/Dossier arrêté\. La commission reste due/)).toBeInTheDocument();
    expect(screen.getByText('Dossier clos')).toBeInTheDocument();
    expect(calls.find((call) => call.path === `${CASE}/stop`)?.body).toEqual({ reason: 'Accord trouvé' });
  });

  it('route pas encore servie (501) : « Bientôt disponible », retenu pour l’onglet', async () => {
    stubGateway({
      [`GET ${CASE}`]: { status: 200, body: activeCase() },
      [`POST ${CASE}/stop`]: { status: 501, body: errorBody('RECOVERY_NOT_IMPLEMENTED', 'pas encore') },
    });
    const { unmount } = render(<CaseDetail id={CASE_ID} />);
    const panel = await openStop();
    fireEvent.change(within(panel).getByLabelText('Motif de l’arrêt'), {
      target: { value: 'Accord trouvé' },
    });
    fireEvent.click(within(panel).getByText(/J’ai compris/));
    fireEvent.click(within(panel).getByRole('button', { name: 'Confirmer l’arrêt' }));
    expect(await screen.findByText('L’arrêt en ligne arrive bientôt')).toBeInTheDocument();
    expect(screen.getByText('Bientôt disponible')).toBeInTheDocument();
    unmount();
    render(<CaseDetail id={CASE_ID} />);
    expect(await screen.findByText('L’arrêt en ligne arrive bientôt')).toBeInTheDocument();
  });
});

const remittance = {
  collectionId: 'encaissement-1',
  caseId: CASE_ID,
  caseNumber: 'RC-000123',
  source: 'payment_link',
  gross: xof(100000),
  commission: xof(10000),
  net: xof(90000),
  creditedAt: '2026-11-20T10:00:00Z',
  walletTransactionId: '0192f1c4-7a2b-7c3d-8e4f-5a6b7c8d7c01',
};

const statement = {
  id: 'releve-1',
  period: '2026-10',
  caseId: CASE_ID,
  caseNumber: 'RC-000123',
  collected: xof(100000),
  commission: xof(10000),
  costs: xof(0),
  remitted: xof(90000),
  documentId: '0192f1c4-7a2b-7c3d-8e4f-5a6b7c8d7c02',
  invoiceId: '0192f1c4-7a2b-7c3d-8e4f-5a6b7c8d7c03',
  issuedAt: '2026-11-01T08:00:00Z',
};

describe('reversements et relevés', () => {
  it('reversements : brut, commission, net, lien pour retirer depuis le portefeuille', async () => {
    stubGateway({
      'GET /api/v1/recovery/remittances': {
        status: 200,
        body: { remittances: [remittance], nextCursor: null },
      },
    });
    render(<RecoveryStatements />);
    expect(await screen.findByText('Dossier RC-000123')).toBeInTheDocument();
    expect(screen.getByText('Payé par le débiteur')).toBeInTheDocument();
    expect(screen.getByText(/90\s000/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Retirer depuis mon portefeuille' })).toHaveAttribute(
      'href',
      '/mon-espace/portefeuille',
    );
  });

  it('relevés mensuels : 501 → « Bientôt disponible » ; servis → PDF et facture de commission', async () => {
    stubGateway({
      'GET /api/v1/recovery/remittances': { status: 200, body: { remittances: [], nextCursor: null } },
      'GET /api/v1/recovery/statements': [
        { status: 501, body: errorBody('RECOVERY_NOT_IMPLEMENTED', 'pas encore') },
        { status: 200, body: { statements: [statement], nextCursor: null } },
      ],
    });
    const first = render(<RecoveryStatements />);
    fireEvent.click(await screen.findByRole('tab', { name: 'Relevés mensuels' }));
    expect(await screen.findByText('Vos relevés mensuels arrivent bientôt')).toBeInTheDocument();
    first.unmount();
    search = new URLSearchParams('onglet=releves');
    render(<RecoveryStatements />);
    expect(await screen.findByText('octobre 2026')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Relevé PDF' })).toHaveAttribute(
      'href',
      `/mon-espace/documents/${statement.documentId}`,
    );
    expect(screen.getByRole('link', { name: 'Facture de commission' })).toHaveAttribute(
      'href',
      `/mon-espace/factures/commissions/${statement.invoiceId}`,
    );
  });
});

describe('suivi des dossiers', () => {
  it('dossiers en cours : prochaine étape, date, qui doit agir ; clos et refusés écartés', async () => {
    stubGateway({
      'GET /api/v1/recovery/cases': {
        status: 200,
        body: page([
          summary({ status: 'awaiting_fee', number: 'RC-000125' }),
          summary({
            id: 'actif',
            status: 'active',
            stage: 'formal_notice',
            number: 'RC-000126',
            nextDeadline: { kind: 'formal_notice_end', dueAt: '2026-12-05T09:00:00Z' },
          }),
          summary({
            id: 'suspendu',
            status: 'suspended',
            stage: 'amicable',
            number: 'RC-000127',
            nextDeadline: { kind: 'dispute_answer', dueAt: '2026-12-02T09:00:00Z' },
          }),
          summary({ id: 'clos', status: 'closed', number: 'RC-000100' }),
        ]),
      },
    });
    render(<RecoveryTracking />);
    const fee = (await screen.findByText(/RC-000125/)).closest('li')!;
    expect(fee).toHaveTextContent('Payer les frais de dossier');
    expect(fee).toHaveTextContent('À vous d’agir');
    const active = screen.getByText(/RC-000126/).closest('li')!;
    expect(active).toHaveTextContent('Étape en cours : Mise en demeure');
    expect(active).toHaveTextContent('KSP s’en occupe');
    const suspended = screen.getByText(/RC-000127/).closest('li')!;
    expect(suspended).toHaveTextContent('Répondre à la contestation du débiteur');
    expect(suspended).toHaveTextContent('À vous d’agir');
    expect(screen.queryByText(/RC-000100/)).toBeNull();
  });

  it('aucun dossier en cours ; service pas encore servi : la section se tait', async () => {
    stubGateway({
      'GET /api/v1/recovery/cases': { status: 200, body: page([summary({ status: 'closed' })]) },
    });
    const first = render(<RecoveryTracking />);
    expect(await screen.findByText('Aucun dossier de recouvrement en cours.')).toBeInTheDocument();
    first.unmount();
    vi.unstubAllGlobals();
    stubGateway({
      'GET /api/v1/recovery/cases': {
        status: 501,
        body: errorBody('RECOVERY_NOT_IMPLEMENTED', 'pas encore'),
      },
    });
    const { container } = render(<RecoveryTracking />);
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(container).toBeEmptyDOMElement();
  });
});
