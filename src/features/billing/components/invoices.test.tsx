import { fireEvent, render, screen } from '@testing-library/react';
import { InvoiceDetail } from './invoice-detail';
import { InvoiceList } from './invoice-list';

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
    expect(await screen.findByText('En attente de paiement')).toBeInTheDocument();
    expect(screen.getByText('Impayée')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Facture FAC-2026-000012' })).toHaveAttribute(
      'href',
      `/mon-espace/factures/${INVOICE_ID}`,
    );
    expect(screen.getAllByText(/Échéance le 11 décembre 2026/)).toHaveLength(2);

    fireEvent.click(screen.getByRole('button', { name: 'Afficher plus' }));
    expect(await screen.findByText('Payée')).toBeInTheDocument();
    expect(screen.getByText(/Réglée le 5 novembre 2026/)).toBeInTheDocument();
    expect(calls[1]?.searchParams.get('cursor')).toBe('0192f1c4-7a2b-7c3d-8e4f-5a6b7c8d6fff');
  });

  it('affiche une liste vide', async () => {
    stub({ status: 200, body: { data: [], nextCursor: null } });
    render(<InvoiceList />);
    expect(await screen.findByText('Aucune facture pour le moment.')).toBeInTheDocument();
  });

  it('détaille une facture impayée : lignes, reste à régler, renvoi vers la mission', async () => {
    stub({ status: 200, body: invoice({ status: 'overdue' }) });
    render(<InvoiceDetail id={INVOICE_ID} />);
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Facture FAC-2026-000012' }),
    ).toBeInTheDocument();
    expect(screen.getByText(/Cette facture est impayée/)).toBeInTheDocument();
    expect(screen.getByText('Nettoyage de bureaux — novembre')).toBeInTheDocument();
    expect(plain(screen.getByText('Reste à régler').nextElementSibling?.textContent ?? null)).toBe(
      '300 000 FCFA',
    );
    expect(screen.getByRole('link', { name: 'Voir la mission' })).toHaveAttribute(
      'href',
      '/mon-espace/nettoyage/missions/0192f1c4-7a2b-7c3d-8e4f-5a6b7c8d1000',
    );
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
