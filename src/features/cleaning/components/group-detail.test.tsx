import { fireEvent, render, screen, within } from '@testing-library/react';
import { session } from '@/lib/api';
import { resetServicesCache } from '@/features/cleaning/api';
import {
  CATALOG,
  GROUP_ID,
  MISSION_ID,
  QUOTE,
  errorBody,
  mission,
  requestGroup,
  stubGateway,
} from '@/features/cleaning/fake-gateway.test-utils';
import { RequestGroupDetail } from './group-detail';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  usePathname: () => `/mon-espace/nettoyage/demandes/groupes/${GROUP_ID}`,
  useSearchParams: () => new URLSearchParams(),
}));

const LAZY = { timeout: 5000 };
const GROUP_PATH = `/api/v1/cleaning/quote-request-groups/${GROUP_ID}`;
const SECOND = '0192f1c4-7a2b-7c3d-8e4f-5a6b7c8d7001';

function signIn() {
  session.set({
    status: 'authenticated',
    accessToken: 'jeton-acces',
    accessTokenExpiresAt: '2099-01-01T00:15:00Z',
    sessionId: '0192f1c4-7a2b-7c3d-8e4f-5a6b7c8d9e10',
    user: {
      id: '0192f1c4-7a2b-7c3d-8e4f-5a6b7c8d9e11',
      status: 'active',
      firstName: 'Koffi',
      lastName: 'Adjovi',
      phone: '+2290197000045',
      email: null,
      emailVerified: false,
      preferredLanguage: 'fr',
      createdAt: '2026-10-21T09:00:00Z',
    },
    profileIncomplete: false,
    activeContext: { type: 'individual', organizationId: null, organizationName: null },
  });
}

/** Groupe de deux prestations, chacune avec un devis envoyé (montants de la gateway). */
function groupWithQuotes() {
  const base = requestGroup(['house_cleaning', 'window_cleaning']);
  return {
    ...base,
    items: base.items.map((item) => ({
      ...item,
      status: 'quote_sent',
      quote: QUOTE,
      groupId: GROUP_ID,
      groupSize: 2,
    })),
    quotesTotal: { amount: 68000, currency: 'XOF' },
  };
}

beforeEach(() => {
  resetServicesCache();
  signIn();
});
afterEach(() => {
  vi.unstubAllGlobals();
  session.clear();
});

describe('suivi d’une demande groupée', () => {
  it('accepte les devis en une fois, signale ce qui est laissé de côté, puis propose le paiement', async () => {
    const group = groupWithQuotes();
    const accepted = {
      ...group,
      items: [{ ...group.items[0]!, status: 'accepted', missionId: MISSION_ID }, group.items[1]!],
    };
    const gateway = stubGateway({
      'GET /api/v1/cleaning/catalog': { status: 200, body: CATALOG },
      [`GET ${GROUP_PATH}`]: { status: 200, body: group },
      [`POST ${GROUP_PATH}/accept`]: {
        status: 200,
        body: {
          groupId: GROUP_ID,
          affectedRequestIds: [group.items[0]!.id],
          skipped: [{ requestId: SECOND, status: 'quote_sent', reason: 'slot_not_proposed' }],
          groupVisitId: null,
          missionIds: [MISSION_ID],
          group: accepted,
        },
      },
      [`GET /api/v1/cleaning/missions/${MISSION_ID}`]: {
        status: 200,
        body: mission({
          payment: {
            plan: { option: 'deposit', timing: 'before', method: 'mobile_money_online' },
            status: 'due',
            total: { amount: 34000, currency: 'XOF' },
            depositPercent: 30,
            depositAmount: { amount: 10200, currency: 'XOF' },
            paid: { amount: 0, currency: 'XOF' },
            payments: [],
          },
        }),
      },
    });
    render(<RequestGroupDetail id={GROUP_ID} />);

    // Frise : étape « Devis » en cours ; une seule action principale.
    const timeline = await screen.findByRole('list', { name: 'Avancement de la prestation' });
    expect(within(timeline).getByText('Devis').closest('li')).toHaveAttribute('aria-current', 'step');
    expect(screen.getByText(/2 devis vous attendent/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Accepter les devis' }));

    // Récapitulatif (montants de la gateway), créneau commun, paiement en ligne (portefeuille) par défaut.
    const form = await screen.findByRole('form', { name: 'Accepter les devis' }, LAZY);
    expect(within(form).getByText(/68\s000\sF\sCFA/)).toBeInTheDocument();
    fireEvent.click(within(form).getByRole('button', { name: 'Confirmer et réserver' }));
    expect(within(form).getByText('Choisissez un créneau.')).toBeInTheDocument();
    fireEvent.click(within(form).getAllByRole('radio')[0]!);
    expect(within(form).getByRole('radio', { name: 'En ligne, avec mon portefeuille' })).toBeChecked();
    fireEvent.click(within(form).getByRole('button', { name: 'Confirmer et réserver' }));

    expect(await screen.findByText('Réservation confirmée')).toBeInTheDocument();
    expect(screen.getByText(/créneau non proposé par ce devis/)).toBeInTheDocument();
    const sent = gateway.calls.find((call) => call.path === `${GROUP_PATH}/accept`);
    expect(sent?.headers['Idempotency-Key']).toMatch(/^[A-Za-z0-9_-]{8,100}$/);
    expect(sent?.body).toEqual({
      slotStart: QUOTE.proposedSlots[0]!.start,
      paymentPlan: { option: 'deposit', timing: 'before', method: 'mobile_money_online' },
    });
    // Enchaînement sur le paiement par le portefeuille : acompte lu sur la mission créée.
    expect(await screen.findByRole('button', { name: /Payer l’acompte/ }, LAZY)).toBeInTheDocument();
    expect(screen.getByText(/10\s200\sF\sCFA/)).toBeInTheDocument();
  });

  it('annule les demandes ouvertes du groupe, avec un motif facultatif', async () => {
    const group = requestGroup(['house_cleaning']);
    const cancelled = { ...group, items: group.items.map((item) => ({ ...item, status: 'cancelled' })) };
    const gateway = stubGateway({
      'GET /api/v1/cleaning/catalog': { status: 200, body: CATALOG },
      [`GET ${GROUP_PATH}`]: { status: 200, body: group },
      [`POST ${GROUP_PATH}/cancel`]: {
        status: 200,
        body: {
          groupId: GROUP_ID,
          affectedRequestIds: [group.items[0]!.id],
          skipped: [],
          groupVisitId: null,
          missionIds: [],
          group: cancelled,
        },
      },
    });
    render(<RequestGroupDetail id={GROUP_ID} />);
    fireEvent.click(await screen.findByRole('button', { name: 'Annuler la demande' }));
    fireEvent.click(screen.getByRole('button', { name: 'Confirmer l’annulation' }));
    expect(await screen.findAllByText('Votre demande est annulée.')).not.toHaveLength(0);
    const sent = gateway.calls.find((call) => call.path === `${GROUP_PATH}/cancel`);
    expect(sent?.body).toEqual({});
    expect(sent?.headers['Idempotency-Key']).toMatch(/^[A-Za-z0-9_-]{8,100}$/);
    expect(screen.queryByRole('button', { name: 'Annuler la demande' })).not.toBeInTheDocument();
  });

  it('demande introuvable : message, sans « Réessayer »', async () => {
    stubGateway({
      'GET /api/v1/cleaning/catalog': { status: 200, body: CATALOG },
      [`GET ${GROUP_PATH}`]: {
        status: 404,
        body: errorBody('CLEANING_REQUEST_GROUP_NOT_FOUND', 'Demande introuvable.'),
      },
    });
    render(<RequestGroupDetail id={GROUP_ID} />);
    expect(await screen.findByText(/Cet élément est introuvable/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Réessayer' })).not.toBeInTheDocument();
  });
});
