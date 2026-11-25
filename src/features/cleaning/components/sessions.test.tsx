import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { session as sessionStore } from '@/lib/api';
import {
  CLAIM_ID,
  PROGRAM_ID,
  SESSION_ID,
  claim,
  completedSession,
  errorBody,
  program,
  session,
  sessionBody,
  stubGateway,
} from '@/features/cleaning/fixtures.test-utils';
import { SessionDetail } from './session-detail';
import { SessionRedirect } from './session-redirect';

const replace = vi.fn();
let search = '';
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace }),
  usePathname: () => '/mon-espace/nettoyage',
  useSearchParams: () => new URLSearchParams(search),
}));

const ORG_ID = '0192f1c4-7a2b-7c3d-8e4f-5a6b7c8d0a01';
const BASE = '/api/v1/cleaning';
const SESSION = `${BASE}/sessions/${SESSION_ID}`;
const PROGRAM = `${BASE}/programs/${PROGRAM_ID}`;
const money = (amount: number) => ({ amount, currency: 'XOF' });

function signIn(organization?: { role: string }) {
  sessionStore.set(sessionBody() as Parameters<typeof sessionStore.set>[0]);
  if (organization) {
    sessionStore.switchContext({
      accessToken: 'jeton-org',
      accessTokenExpiresAt: '2099-01-01T00:15:00Z',
      activeContext: { type: 'business', organizationId: ORG_ID, organizationName: 'SARL Bénin Propre' },
    });
  }
}

const routes = (sessionReply: unknown, extra: Record<string, unknown> = {}) => ({
  [`GET ${SESSION}`]: { status: 200, body: sessionReply },
  [`GET ${PROGRAM}`]: { status: 200, body: program({ status: 'in_progress' }) },
  ...(extra as Record<string, { status: number; body?: unknown }>),
});

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date('2026-11-23T18:00:00Z'));
});

afterEach(() => {
  vi.useRealTimers();
  sessionStore.clear();
  vi.unstubAllGlobals();
  replace.mockReset();
  search = '';
});

describe('page d’une séance', () => {
  it('séance à venir : rang, date, équipe, report et annulation proposés', async () => {
    signIn();
    stubGateway(routes(session()));
    render(<SessionDetail programId={PROGRAM_ID} id={SESSION_ID} />);
    expect(
      await screen.findByRole('heading', { level: 1, name: 'lundi 18 janvier 2027' }),
    ).toBeInTheDocument();
    expect(screen.getByText('Séance 3/12 · PN-000057')).toBeInTheDocument();
    expect(screen.getByText('Afi Houngbo')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Reporter la séance' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Annuler la séance' })).toBeInTheDocument();
    expect(screen.queryByRole('region', { name: 'Séance à payer' })).not.toBeInTheDocument();
    expect(await screen.findByRole('link', { name: 'Programme PN-000057' })).toHaveAttribute(
      'href',
      `/mon-espace/nettoyage/programmes/${PROGRAM_ID}`,
    );
  });

  it('séance à payer : Mobile Money d’abord, redirection vers la page du prestataire', async () => {
    signIn();
    const assign = vi.fn();
    vi.stubGlobal('location', { ...window.location, assign });
    const { calls } = stubGateway(
      routes(completedSession(), {
        [`POST ${SESSION}/pay`]: {
          status: 200,
          body: {
            status: 'awaiting_payment',
            amount: money(18400),
            walletTransactionId: null,
            paymentId: 'p-1',
            checkoutUrl: 'https://checkout.example/p-1',
            invoiceId: null,
          },
        },
      }),
    );
    render(<SessionDetail programId={PROGRAM_ID} id={SESSION_ID} />);
    const panel = await screen.findByRole('region', { name: 'Séance à payer' });
    expect(panel).toHaveTextContent(/18\s400\sF\sCFA/);
    expect(panel).toHaveTextContent('À payer avant le 24 novembre 2026 à 11:50.');
    const buttons = within(panel).getAllByRole('button');
    expect(buttons[0]).toHaveTextContent('Payer par Mobile Money');
    expect(buttons[1]).toHaveTextContent('Payer avec mon portefeuille');
    fireEvent.click(buttons[0]!);
    await waitFor(() => expect(assign).toHaveBeenCalledWith('https://checkout.example/p-1'));
    const sent = calls.find((call) => call.path === `${SESSION}/pay`);
    expect(sent?.body).toEqual({ method: 'mobile_money' });
    expect(sent?.headers['Idempotency-Key']).toMatch(/^[\w-]{8,100}$/);
  });

  it('paiement par le portefeuille : solde insuffisant, recharge proposée ; puis payée', async () => {
    signIn();
    stubGateway(
      routes(completedSession(), {
        [`POST ${SESSION}/pay`]: [
          { status: 422, body: errorBody('CLEANING_INSUFFICIENT_BALANCE', 'Solde insuffisant.') },
          {
            status: 200,
            body: {
              status: 'paid',
              amount: money(18400),
              walletTransactionId: 't-1',
              paymentId: null,
              checkoutUrl: null,
              invoiceId: 'inv-1',
            },
          },
        ],
      }),
    );
    render(<SessionDetail programId={PROGRAM_ID} id={SESSION_ID} />);
    const panel = await screen.findByRole('region', { name: 'Séance à payer' });
    fireEvent.click(within(panel).getByRole('button', { name: /Payer avec mon portefeuille/ }));
    expect(
      await within(panel).findByRole('link', { name: 'Recharger mon portefeuille' }),
    ).toBeInTheDocument();
    fireEvent.click(within(panel).getByRole('button', { name: /Payer avec mon portefeuille/ }));
    expect(await within(panel).findByText('Séance payée.')).toBeInTheDocument();
  });

  it('après le paiement, la confirmation reste visible quand la séance relue n’est plus à payer', async () => {
    signIn();
    stubGateway(
      routes(completedSession(), {
        [`GET ${SESSION}`]: [
          { status: 200, body: completedSession() },
          { status: 200, body: completedSession({ paymentStatus: 'paid', invoiceId: 'inv-1' }) },
        ],
        [`POST ${SESSION}/pay`]: {
          status: 200,
          body: {
            status: 'paid',
            amount: money(18400),
            walletTransactionId: 't-1',
            paymentId: null,
            checkoutUrl: null,
            invoiceId: 'inv-1',
          },
        },
      }),
    );
    render(<SessionDetail programId={PROGRAM_ID} id={SESSION_ID} />);
    const panel = await screen.findByRole('region', { name: 'Séance à payer' });
    fireEvent.click(within(panel).getByRole('button', { name: /Payer avec mon portefeuille/ }));
    await waitFor(() =>
      expect(screen.queryByRole('region', { name: 'Séance à payer' })).not.toBeInTheDocument(),
    );
    expect(await screen.findByText('Séance payée.')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Voir la facture' })).toHaveAttribute(
      'href',
      '/mon-espace/factures/inv-1',
    );
  });

  it('séance réalisée : déroulé, liste de contrôle, photos avant et après, facture', async () => {
    signIn();
    stubGateway(routes(completedSession({ paymentStatus: 'paid', invoiceId: 'inv-9' })));
    render(<SessionDetail programId={PROGRAM_ID} id={SESSION_ID} />);
    const progress = await screen.findByRole('region', { name: 'Déroulé' });
    expect(progress).toHaveTextContent('Sols lavés');
    expect(progress).toHaveTextContent('fait à 10:30');
    expect(screen.getByRole('img', { name: 'Avant, photo 1' })).toHaveAttribute(
      'src',
      'https://files.ksp.bj/avant.jpg',
    );
    expect(screen.getByRole('img', { name: 'Après, photo 1' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Voir la facture' })).toHaveAttribute(
      'href',
      '/mon-espace/factures/inv-9',
    );
    expect(screen.queryByRole('button', { name: 'Reporter la séance' })).not.toBeInTheDocument();
  });

  it('entreprise : pas de « Payer » (facture mensuelle)', async () => {
    signIn({ role: 'org_member' });
    stubGateway({
      ...routes(completedSession({ paymentStatus: null, amountDue: null, dueBy: null })),
      [`GET ${PROGRAM}`]: {
        status: 200,
        body: program({ payerKind: 'organization', organizationId: ORG_ID }),
      },
      [`GET /api/v1/identity/organizations/${ORG_ID}`]: { status: 200, body: { role: 'org_member' } },
    });
    render(<SessionDetail programId={PROGRAM_ID} id={SESSION_ID} />);
    expect(await screen.findByText('Payée sur la facture mensuelle de l’entreprise.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Payer par Mobile Money/ })).not.toBeInTheDocument();
  });

  it('lecteur d’une entreprise : aucune action', async () => {
    signIn({ role: 'org_viewer' });
    stubGateway({
      ...routes(session()),
      [`GET /api/v1/identity/organizations/${ORG_ID}`]: { status: 200, body: { role: 'org_viewer' } },
    });
    render(<SessionDetail programId={PROGRAM_ID} id={SESSION_ID} />);
    expect(
      await screen.findByText('Votre rôle dans l’entreprise permet de suivre la séance, pas d’agir dessus.'),
    ).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Reporter la séance' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Annuler la séance' })).not.toBeInTheDocument();
  });

  it('séance introuvable : message, sans « Réessayer »', async () => {
    signIn();
    stubGateway({
      [`GET ${SESSION}`]: {
        status: 404,
        body: errorBody('CLEANING_SESSION_NOT_FOUND', 'Séance introuvable.'),
      },
      [`GET ${PROGRAM}`]: { status: 200, body: program() },
    });
    render(<SessionDetail programId={PROGRAM_ID} id={SESSION_ID} />);
    expect(
      await screen.findByText('Cette séance est introuvable, ou n’appartient pas au compte actif.'),
    ).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Réessayer' })).not.toBeInTheDocument();
  });
});

describe('report et annulation', () => {
  it('report : nouvelle date et heure du Bénin envoyées en UTC, séance remplacée', async () => {
    signIn();
    const { calls } = stubGateway(
      routes(session(), {
        [`POST ${SESSION}/reschedule`]: {
          status: 200,
          body: session({
            scheduledStart: '2027-01-20T08:00:00Z',
            scheduledEnd: '2027-01-20T12:00:00Z',
            reschedules: [
              {
                previousStart: '2027-01-18T07:00:00Z',
                newStart: '2027-01-20T08:00:00Z',
                by: 'customer',
                at: '2026-11-23T18:00:00Z',
                reason: null,
                actorId: null,
              },
            ],
          }),
        },
      }),
    );
    render(<SessionDetail programId={PROGRAM_ID} id={SESSION_ID} />);
    fireEvent.click(await screen.findByRole('button', { name: 'Reporter la séance' }));
    fireEvent.click(screen.getByRole('button', { name: 'Confirmer le report' }));
    expect(await screen.findByText('Choisissez la nouvelle date.')).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Nouvelle date'), { target: { value: '2027-01-20' } });
    fireEvent.change(screen.getByLabelText('Heure de début'), { target: { value: '09:00' } });
    fireEvent.click(screen.getByRole('button', { name: 'Confirmer le report' }));
    expect(await screen.findByText('Séance reportée.')).toBeInTheDocument();
    expect(calls.find((call) => call.path === `${SESSION}/reschedule`)?.body).toEqual({
      newStart: '2027-01-20T08:00:00.000Z',
    });
    expect(screen.getByRole('heading', { level: 1, name: 'mercredi 20 janvier 2027' })).toBeInTheDocument();
    expect(
      screen.getByText(/Déplacée du 18 janvier 2027 à 08:00 au 20 janvier 2027 à 09:00/),
    ).toBeInTheDocument();
  });

  it('report refusé (chevauchement, plafond) : message de la gateway, support pour le plafond', async () => {
    signIn();
    stubGateway(
      routes(session(), {
        [`POST ${SESSION}/reschedule`]: [
          {
            status: 409,
            body: errorBody('CLEANING_RESCHEDULE_OVERLAP', 'Ce créneau chevauche une autre séance.'),
          },
          {
            status: 422,
            body: errorBody(
              'CLEANING_RESCHEDULE_LIMIT_REACHED',
              'Vous avez déjà reporté deux séances ce mois-ci.',
            ),
          },
        ],
      }),
    );
    render(<SessionDetail programId={PROGRAM_ID} id={SESSION_ID} />);
    fireEvent.click(await screen.findByRole('button', { name: 'Reporter la séance' }));
    fireEvent.change(screen.getByLabelText('Nouvelle date'), { target: { value: '2027-01-20' } });
    fireEvent.click(screen.getByRole('button', { name: 'Confirmer le report' }));
    expect(await screen.findByText('Ce créneau chevauche une autre séance.')).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Nouvelle date'), { target: { value: '2027-01-21' } });
    fireEvent.click(screen.getByRole('button', { name: 'Confirmer le report' }));
    expect(
      await screen.findByText(/Vous avez déjà reporté deux séances ce mois-ci\. \(référence : /),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Contacter le support' })).toHaveAttribute(
      'href',
      '/contact?sujet=nettoyage',
    );
  });

  it('annulation confirmée, sans corps', async () => {
    signIn();
    const { calls } = stubGateway(
      routes(session(), {
        [`POST ${SESSION}/cancel`]: {
          status: 200,
          body: session({
            status: 'cancelled',
            cancellation: {
              by: 'customer',
              late: false,
              at: '2026-11-23T18:00:00Z',
              cause: 'customer',
              reason: null,
              actorId: null,
            },
          }),
        },
      }),
    );
    render(<SessionDetail programId={PROGRAM_ID} id={SESSION_ID} />);
    fireEvent.click(await screen.findByRole('button', { name: 'Annuler la séance' }));
    expect(
      screen.getByText('La séance du 18 janvier 2027 à 08:00 sera annulée, sans frais.'),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Oui, annuler la séance' }));
    expect(await screen.findByRole('region', { name: 'Séance annulée' })).toHaveTextContent(
      'annulée à votre demande',
    );
    const sent = calls.find((call) => call.path === `${SESSION}/cancel`);
    expect(sent?.body).toBeUndefined();
    expect(sent?.headers['Idempotency-Key']).toBeTruthy();
  });

  it('trop près de la séance : support seulement', async () => {
    vi.setSystemTime(new Date('2027-01-17T12:00:00Z'));
    signIn();
    stubGateway(routes(session()));
    render(<SessionDetail programId={PROGRAM_ID} id={SESSION_ID} />);
    expect(await screen.findByText(/trop proche pour être reportée ou annulée en ligne/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Contacter le support' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Annuler la séance' })).not.toBeInTheDocument();
  });

  it('annulation refusée par la gateway (délai passé) : support', async () => {
    signIn();
    stubGateway(
      routes(session(), {
        [`POST ${SESSION}/cancel`]: {
          status: 422,
          body: errorBody(
            'CLEANING_CANCELLATION_TOO_LATE',
            'Il est trop tard pour annuler cette séance en ligne.',
          ),
        },
      }),
    );
    render(<SessionDetail programId={PROGRAM_ID} id={SESSION_ID} />);
    fireEvent.click(await screen.findByRole('button', { name: 'Annuler la séance' }));
    fireEvent.click(screen.getByRole('button', { name: 'Oui, annuler la séance' }));
    expect(
      await screen.findByText(/Il est trop tard pour annuler cette séance en ligne\./),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Contacter le support' })).toBeInTheDocument();
  });

  it('programme suspendu : pas de report', async () => {
    signIn();
    stubGateway({
      ...routes(session()),
      [`GET ${PROGRAM}`]: { status: 200, body: program({ status: 'suspended' }) },
    });
    render(<SessionDetail programId={PROGRAM_ID} id={SESSION_ID} />);
    expect(
      await screen.findByText('Le programme est suspendu : levez d’abord la cause de la suspension.'),
    ).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Reporter la séance' })).not.toBeInTheDocument();
  });
});

describe('note et réclamation', () => {
  it('note de 1 à 5 étoiles, une seule fois', async () => {
    signIn();
    const { calls } = stubGateway(
      routes(completedSession({ paymentStatus: 'paid' }), {
        [`POST ${SESSION}/rating`]: {
          status: 200,
          body: completedSession({
            paymentStatus: 'paid',
            rating: { stars: 4, comment: 'Très bien', ratedAt: '2026-11-23T18:00:00Z' },
          }),
        },
      }),
    );
    render(<SessionDetail programId={PROGRAM_ID} id={SESSION_ID} />);
    const rating = await screen.findByRole('region', { name: 'Votre avis' });
    fireEvent.click(within(rating).getByRole('button', { name: 'Envoyer ma note' }));
    expect(await within(rating).findByText('Choisissez une note de 1 à 5 étoiles.')).toBeInTheDocument();
    fireEvent.click(within(rating).getByLabelText('4 étoiles'));
    fireEvent.change(within(rating).getByLabelText('Commentaire (facultatif)'), {
      target: { value: 'Très bien' },
    });
    fireEvent.click(within(rating).getByRole('button', { name: 'Envoyer ma note' }));
    expect(await within(rating).findByText('Merci pour votre avis.')).toBeInTheDocument();
    expect(within(rating).getByRole('img', { name: 'Votre note : 4 sur 5' })).toBeInTheDocument();
    expect(calls.find((call) => call.path === `${SESSION}/rating`)?.body).toEqual({
      stars: 4,
      comment: 'Très bien',
    });
    expect(within(rating).queryByRole('button', { name: 'Envoyer ma note' })).not.toBeInTheDocument();
  });

  it('réclamation dans la fenêtre : nature, texte, envoi, lien vers son suivi', async () => {
    signIn();
    const { calls } = stubGateway(
      routes(completedSession({ paymentStatus: 'paid' }), {
        [`POST ${SESSION}/claims`]: { status: 200, body: claim() },
      }),
    );
    render(<SessionDetail programId={PROGRAM_ID} id={SESSION_ID} />);
    const panel = await screen.findByRole('region', { name: 'Signaler un problème' });
    fireEvent.click(within(panel).getByRole('button', { name: 'Signaler un problème' }));
    fireEvent.click(within(panel).getByRole('button', { name: 'Envoyer ma réclamation' }));
    expect(await within(panel).findByText('Choisissez la nature du problème.')).toBeInTheDocument();
    expect(within(panel).getByText('Décrivez le problème.')).toBeInTheDocument();
    fireEvent.click(within(panel).getByLabelText('Travail incomplet'));
    fireEvent.change(within(panel).getByLabelText(/Ce qui s’est passé/), {
      target: { value: 'Les vitres de la cuisine n’ont pas été faites.' },
    });
    fireEvent.click(within(panel).getByRole('button', { name: 'Envoyer ma réclamation' }));
    expect(await within(panel).findByRole('link', { name: 'Suivre ma réclamation' })).toHaveAttribute(
      'href',
      `/mon-espace/nettoyage/reclamations/${CLAIM_ID}`,
    );
    expect(calls.find((call) => call.path === `${SESSION}/claims`)?.body).toEqual({
      category: 'incomplete_work',
      text: 'Les vitres de la cuisine n’ont pas été faites.',
    });
  });

  it('fenêtre passée : plus de formulaire, réclamations existantes listées', async () => {
    vi.setSystemTime(new Date('2026-11-27T12:00:00Z'));
    signIn();
    stubGateway(routes(completedSession({ paymentStatus: 'paid', claimIds: [CLAIM_ID] })));
    render(<SessionDetail programId={PROGRAM_ID} id={SESSION_ID} />);
    const panel = await screen.findByRole('region', { name: 'Signaler un problème' });
    expect(panel).toHaveTextContent('Le délai pour signaler un problème sur cette séance est passé.');
    expect(within(panel).getByRole('link', { name: 'Réclamation n° 1' })).toHaveAttribute(
      'href',
      `/mon-espace/nettoyage/reclamations/${CLAIM_ID}`,
    );
  });

  it('fenêtre fermée selon la gateway : message, sans nouvel essai', async () => {
    signIn();
    stubGateway(
      routes(completedSession({ paymentStatus: 'paid' }), {
        [`POST ${SESSION}/claims`]: {
          status: 422,
          body: errorBody('CLEANING_CLAIM_WINDOW_CLOSED', 'Le délai de réclamation est passé.'),
        },
      }),
    );
    render(<SessionDetail programId={PROGRAM_ID} id={SESSION_ID} />);
    const panel = await screen.findByRole('region', { name: 'Signaler un problème' });
    fireEvent.click(within(panel).getByRole('button', { name: 'Signaler un problème' }));
    fireEvent.click(within(panel).getByLabelText('Dégât'));
    fireEvent.change(within(panel).getByLabelText(/Ce qui s’est passé/), {
      target: { value: 'Vase cassé.' },
    });
    fireEvent.click(within(panel).getByRole('button', { name: 'Envoyer ma réclamation' }));
    expect(await within(panel).findByText(/Le délai pour signaler un problème/)).toBeInTheDocument();
    expect(within(panel).queryByRole('button', { name: 'Envoyer ma réclamation' })).not.toBeInTheDocument();
  });
});

describe('séance ouverte sans son programme (retour de paiement)', () => {
  it('remplace l’adresse par celle du programme, en gardant ?organisation=', async () => {
    signIn();
    search = `organisation=${ORG_ID}`;
    stubGateway({ [`GET ${SESSION}`]: { status: 200, body: session() } });
    render(<SessionRedirect id={SESSION_ID} />);
    await waitFor(() =>
      expect(replace).toHaveBeenCalledWith(
        `/mon-espace/nettoyage/programmes/${PROGRAM_ID}/seances/${SESSION_ID}?organisation=${ORG_ID}`,
      ),
    );
  });

  it('séance introuvable : message', async () => {
    signIn();
    stubGateway({
      [`GET ${SESSION}`]: {
        status: 404,
        body: errorBody('CLEANING_SESSION_NOT_FOUND', 'Séance introuvable.'),
      },
    });
    render(<SessionRedirect id={SESSION_ID} />);
    expect(
      await screen.findByText('Cette séance est introuvable, ou n’appartient pas au compte actif.'),
    ).toBeInTheDocument();
    expect(replace).not.toHaveBeenCalled();
  });
});
