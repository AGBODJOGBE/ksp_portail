import { fireEvent, render, screen } from '@testing-library/react';
import { InvoiceDetail } from './invoice-detail';
import { InvoiceList } from './invoice-list';

let search = '';
vi.mock('next/navigation', () => ({
  useSearchParams: () => new URLSearchParams(search),
}));

const xof = (amount: number) => ({ amount, currency: 'XOF' });
const INVOICE_ID = '0192f1c4-7a2b-7c3d-8e4f-5a6b7c8d6001';

function invoice(overrides: Record<string, unknown> = {}) {
  return {
    id: INVOICE_ID,
    number: 'FAC-2026-000012',
    status: 'pending_payment',
    customerId: '0192f1c4-7a2b-7c3d-8e4f-5a6b7c8d9e11',
    organizationId: '0192f1c4-7a2b-7c3d-8e4f-5a6b7c8d9e99',
    source: 'cleaning',
    contractId: '0192f1c4-7a2b-7c3d-8e4f-5a6b7c8d1000',
    periodIndex: 1,
    periodStart: '2026-11-01T00:00:00Z',
    periodEnd: '2026-11-30T23:00:00Z',
    lines: [
      { label: 'Nettoyage de bureaux — novembre', quantity: 20, unitPrice: xof(15000), amount: xof(300000) },
    ],
    total: xof(300000),
    paid: xof(0),
    balance: xof(300000),
    issuedAt: '2026-12-01T08:00:00Z',
    dueAt: '2026-12-11T08:00:00Z',
    paidAt: null,
    payments: [],
    organization: {
      legalName: 'SARL Bénin Propre',
      address: 'Lot 12, Haie Vive, Cotonou',
      ifu: '3201912345678',
      rccm: 'RB/COT/19 B 1234',
    },
    ...overrides,
  };
}

/** `fetch` remplacé : une réponse par appel, dans l'ordre. */
function stub(...responses: Array<{ status: number; body: unknown }>) {
  const calls: URL[] = [];
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: string | URL) => {
      calls.push(new URL(String(input)));
      const response = responses.length > 1 ? responses.shift()! : responses[0]!;
      return new Response(JSON.stringify(response.body), {
        status: response.status,
        headers: { 'Content-Type': 'application/json' },
      });
    }),
  );
  return calls;
}

const plain = (text: string | null) => (text ?? '').replace(/\s/g, ' ');

beforeEach(() => {
  search = '';
});
afterEach(() => vi.unstubAllGlobals());

describe('Mes factures', () => {
  it('liste les factures avec leur statut, leur échéance et la page suivante', async () => {
    const calls = stub(
      {
        status: 200,
        body: {
          data: [invoice(), invoice({ id: 'b', number: 'FAC-2026-000011', status: 'overdue' })],
          nextCursor: '0192f1c4-7a2b-7c3d-8e4f-5a6b7c8d6fff',
        },
      },
      {
        status: 200,
        body: {
          data: [
            invoice({ id: 'c', number: 'FAC-2026-000010', status: 'paid', paidAt: '2026-11-05T10:00:00Z' }),
          ],
          nextCursor: null,
        },
      },
    );
    render(<InvoiceList />);
    // Chaque état apparaît dans le filtre, puis dans le badge de la facture.
    expect(await screen.findByRole('link', { name: 'Facture FAC-2026-000011' })).toBeInTheDocument();
    expect(screen.getAllByText('En attente de paiement')).toHaveLength(2);
    expect(screen.getAllByText('Impayée')).toHaveLength(2);
    expect(screen.getByRole('link', { name: 'Facture FAC-2026-000012' })).toHaveAttribute(
      'href',
      `/mon-espace/factures/${INVOICE_ID}`,
    );
    expect(screen.getAllByText(/Échéance le 11 décembre 2026/)).toHaveLength(2);
    expect(screen.getAllByText(/SARL Bénin Propre · Mois 1 du contrat/)).toHaveLength(2);
    expect(calls[0]?.searchParams.get('status')).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'Afficher plus' }));
    expect(await screen.findByRole('link', { name: 'Facture FAC-2026-000010' })).toBeInTheDocument();
    expect(screen.getAllByText('Payée')).toHaveLength(2);
    expect(screen.getByText(/Réglée le 5 novembre 2026/)).toBeInTheDocument();
    expect(calls[1]?.searchParams.get('cursor')).toBe('0192f1c4-7a2b-7c3d-8e4f-5a6b7c8d6fff');
  });

  it('affiche une liste vide, avec ce qu’elle contiendra', async () => {
    stub({ status: 200, body: { data: [], nextCursor: null } });
    render(<InvoiceList />);
    expect(await screen.findByText('Aucune facture pour le moment.')).toBeInTheDocument();
    expect(screen.getByText(/Les factures concernent les contrats d’entreprise/)).toBeInTheDocument();
  });

  it('filtre par état depuis l’adresse (`?etat=impayee`) et signale le reste à régler', async () => {
    search = 'etat=impayee';
    const calls = stub({
      status: 200,
      body: {
        data: [invoice({ status: 'overdue', paid: xof(100000), balance: xof(200000) })],
        nextCursor: null,
      },
    });
    render(<InvoiceList />);
    expect(await screen.findByText(/Reste à régler : 200\s000\sFCFA/)).toBeInTheDocument();
    expect(calls[0]?.searchParams.get('status')).toBe('overdue');
    const filters = screen.getByRole('navigation', { name: 'Filtrer par état' });
    expect(screen.getAllByRole('link', { name: 'Impayée' })[0]).toHaveAttribute('aria-current', 'page');
    expect(filters).toBeInTheDocument();
  });

  it('détaille une facture impayée : lignes, reste à régler, renvoi vers la mission', async () => {
    stub({ status: 200, body: invoice({ status: 'overdue' }) });
    render(<InvoiceDetail id={INVOICE_ID} />);
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Facture FAC-2026-000012' }),
    ).toBeInTheDocument();
    expect(screen.getByText(/Cette facture est impayée/)).toBeInTheDocument();
    expect(screen.getByText('Nettoyage de bureaux — novembre')).toBeInTheDocument();
    const header = screen.getByRole('region', { name: 'Facturé à' });
    expect(header).toHaveTextContent('SARL Bénin Propre');
    expect(header).toHaveTextContent('IFU : 3201912345678 · RCCM : RB/COT/19 B 1234');
    expect(screen.getByText('Mois 1 du contrat')).toBeInTheDocument();
    expect(plain(screen.getByText('Reste à régler').nextElementSibling?.textContent ?? null)).toBe(
      '300 000 FCFA',
    );
    expect(screen.getByRole('link', { name: 'Voir la mission' })).toHaveAttribute(
      'href',
      '/mon-espace/nettoyage/missions/0192f1c4-7a2b-7c3d-8e4f-5a6b7c8d1000',
    );
  });

  it('facture d’un particulier ou émise avant l’en-tête : pas de bloc « Facturé à »', async () => {
    stub({ status: 200, body: invoice({ organization: null, organizationId: null }) });
    render(<InvoiceDetail id={INVOICE_ID} />);
    expect(await screen.findByText(/À régler avant le 11 décembre 2026/)).toBeInTheDocument();
    expect(screen.queryByRole('region', { name: 'Facturé à' })).not.toBeInTheDocument();
  });

  it('refuse une réponse hors contrat (en-tête absent)', async () => {
    const { organization: _organization, ...withoutHeader } = invoice();
    stub({ status: 200, body: withoutHeader });
    render(<InvoiceDetail id={INVOICE_ID} />);
    expect(await screen.findByRole('button', { name: 'Réessayer' })).toBeInTheDocument();
  });

  it('facture introuvable : message, sans « Réessayer »', async () => {
    stub({
      status: 404,
      body: { error: { code: 'BILLING_INVOICE_NOT_FOUND', message: 'Facture introuvable.', details: {} } },
    });
    render(<InvoiceDetail id={INVOICE_ID} />);
    expect(await screen.findByText(/Cette facture est introuvable/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Réessayer' })).not.toBeInTheDocument();
  });
});
