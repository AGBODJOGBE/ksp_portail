import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { session } from '@/lib/api';
import { ApiError } from '@/lib/api/errors';
import { describeDocumentError, isSigningToken } from '@/features/document/logic';
import { documentSchema, signingSessionSchema } from '@/features/document/schemas';
import { DocumentDetail } from './document-detail';
import { PublicSigning } from './public-signing';
import { documentWindow } from './read-document';

const TOKEN = 'k3Jx9_Qm-2LpV7rT0aZ8cW4yN6bH1sDfGe5uIo3Rt0A';
const LINK = `/api/v1/document/sign/${TOKEN}`;
const DOCUMENT_ID = '0192f1c4-7a2b-7c3d-8e4f-5a6b7c8d7001';
const SIGNATURE_ID = '0192f1c4-7a2b-7c3d-8e4f-5a6b7c8d7201';
const DOCUMENTS = `/api/v1/document/documents/${DOCUMENT_ID}`;
const SIGNATURES = `/api/v1/document/signatures/${SIGNATURE_ID}`;
const SHA = '87b47ba21363c6f263abb57eaea8ad8204222a0c1da0ec1a5a37087adf5eb12e';
const SIGNED_SHA = '3f1c9a0d6e2b7c48a5f0e19d2c3b4a5968778695a4b3c2d1e0f9a8b7c6d5e4f3';
const PDF = 'https://files.ksp.bj/ksp-files/generated_document/0192?X-Amz-Expires=300&X-Amz-Signature=1d4e';

const download = (version = 'original') => ({ url: PDF, expiresAt: '2026-11-09T10:05:00Z', version });

function signingSession(overrides: Record<string, unknown> = {}) {
  return {
    documentTitle: 'Protocole d’accord et échéancier de paiement',
    documentNumber: 'PAC-2026-000007',
    status: 'pending',
    signer: { displayName: 'Koffi Mensah', phoneMasked: '+229********45' },
    expiresAt: '2026-11-16T10:00:00Z',
    signedAt: null,
    codeExpiresAt: null,
    download: download(),
    ...overrides,
  };
}

function signature(overrides: Record<string, unknown> = {}) {
  return {
    id: SIGNATURE_ID,
    status: 'pending',
    signer: { displayName: 'Awa Dossou', phoneMasked: '+229********11', hasAccount: true },
    canSign: true,
    createdAt: '2026-11-09T10:00:01Z',
    expiresAt: '2026-11-16T10:00:01Z',
    signedAt: null,
    codeExpiresAt: null,
    ...overrides,
  };
}

function kspDocument(overrides: Record<string, unknown> = {}) {
  return {
    id: DOCUMENT_ID,
    template: 'recovery_mandate',
    templateVersion: 1,
    title: 'Mandat de recouvrement',
    number: 'MAN-2026-000042',
    status: 'pending_signature',
    subject: { type: 'recovery_case', id: '0192f1c4-7a2b-7c3d-8e4f-5a6b7c8d7100' },
    sha256: SHA,
    sizeBytes: 16188,
    signedSha256: null,
    createdAt: '2026-11-09T10:00:00Z',
    signedAt: null,
    cancelledAt: null,
    signature: signature(),
    ...overrides,
  };
}

const delivery = { channel: 'whatsapp', expiresAt: '2099-11-09T10:10:00Z', resendAfterSeconds: 60 };

const errorBody = (code: string, message: string, details: Record<string, unknown> = {}) => ({
  error: { code, message, details, correlationId: 'c-test' },
});

type Reply = { status: number; body?: unknown };
interface Call {
  method: string;
  path: string;
  body: unknown;
  headers: Record<string, string>;
}

/** Gateway simulée : « MÉTHODE /chemin » → réponses dans l'ordre (la dernière est répétée). */
function stubGateway(routes: Record<string, Reply | Reply[]>) {
  const calls: Call[] = [];
  const queues = new Map(Object.entries(routes).map(([key, value]) => [key, [value].flat()]));
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: string | URL, init: RequestInit = {}) => {
      const url = new URL(String(input));
      const method = init.method ?? 'GET';
      calls.push({
        method,
        path: url.pathname,
        body: typeof init.body === 'string' ? (JSON.parse(init.body) as unknown) : undefined,
        headers: { ...(init.headers as Record<string, string>) },
      });
      const queue = queues.get(`${method} ${url.pathname}`);
      if (!queue?.length) throw new TypeError(`Route non simulée : ${method} ${url.pathname}`);
      const reply = (queue.length > 1 ? queue.shift() : queue[0])!;
      return new Response(reply.body === undefined ? null : JSON.stringify(reply.body), {
        status: reply.status,
        headers: { 'Content-Type': 'application/json' },
      });
    }),
  );
  return calls;
}

function signIn() {
  session.set({
    status: 'authenticated',
    accessToken: 'jeton-acces',
    accessTokenExpiresAt: '2099-01-01T00:15:00Z',
    sessionId: '0192f1c4-7a2b-7c3d-8e4f-5a6b7c8d9e10',
    user: {
      id: '0192f1c4-7a2b-7c3d-8e4f-5a6b7c8d9e11',
      status: 'active',
      firstName: 'Awa',
      lastName: 'Dossou',
      phone: '+2290197000011',
      email: null,
      emailVerified: false,
      preferredLanguage: 'fr',
      createdAt: '2026-10-21T09:00:00Z',
    },
    profileIncomplete: false,
    activeContext: { type: 'individual', organizationId: null, organizationName: null },
  });
}

/** Onglet ouvert par « Lire le document » (remplace `window.open`). */
function fakeTab() {
  const tab = { opener: {} as unknown, location: { href: '' }, close: vi.fn() };
  vi.spyOn(documentWindow, 'open').mockReturnValue(tab as unknown as Window);
  return tab;
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  session.clear();
});

describe('logique des documents', () => {
  it('jeton du lien : 20 à 100 caractères base64url', () => {
    expect(isSigningToken(TOKEN)).toBe(true);
    expect(isSigningToken('court')).toBe(false);
    expect(isSigningToken(`${TOKEN}/../x`)).toBe(false);
  });

  it('schémas fidèles au contrat : exemples acceptés, champ manquant refusé', () => {
    expect(signingSessionSchema.safeParse(signingSession()).success).toBe(true);
    expect(documentSchema.safeParse(kspDocument()).success).toBe(true);
    const { download: _download, ...missing } = signingSession();
    expect(signingSessionSchema.safeParse(missing).success).toBe(false);
    expect(
      documentSchema.safeParse(kspDocument({ signature: { ...signature(), canSign: 'oui' } })).success,
    ).toBe(false);
  });

  it('erreurs : code faux, code épuisé, demande close, limite, panne', () => {
    expect(
      describeDocumentError(new ApiError(400, 'DOCUMENT_CODE_INVALID', 'x', { attemptsLeft: 2 })),
    ).toMatchObject({ kind: 'code', message: 'Ce code est incorrect. Il vous reste 2 essais.' });
    expect(
      describeDocumentError(new ApiError(400, 'DOCUMENT_CODE_INVALID', 'x', { attemptsLeft: 0 })).kind,
    ).toBe('newCode');
    expect(describeDocumentError(new ApiError(422, 'DOCUMENT_SIGNATURE_CLOSED', 'x')).kind).toBe('closed');
    expect(
      describeDocumentError(new ApiError(429, 'DOCUMENT_CODE_TOO_SOON', 'x', { retryAfterSeconds: 42 })),
    ).toMatchObject({ kind: 'wait', retryAfterSeconds: 42 });
    expect(describeDocumentError(new ApiError(503, 'DOCUMENT_DEPENDENCY_UNAVAILABLE', 'x')).kind).toBe(
      'unavailable',
    );
    expect(describeDocumentError(new ApiError(422, 'DOCUMENT_CONTENT_CHANGED', 'x')).kind).toBe('blocked');
  });
});

describe('Lien de signature (sans compte)', () => {
  it('jeton mal formé : introuvable, sans appel', async () => {
    const calls = stubGateway({});
    render(<PublicSigning token="x" />);
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Lien de signature introuvable' }),
    ).toBeInTheDocument();
    expect(calls).toHaveLength(0);
  });

  it('parcours complet : lecture, code, accord, code faux, signature, confirmation', async () => {
    const tab = fakeTab();
    const calls = stubGateway({
      [`GET ${LINK}`]: { status: 200, body: signingSession() },
      [`POST ${LINK}/otp`]: { status: 200, body: delivery },
      [`POST ${LINK}/sign`]: [
        {
          status: 400,
          body: errorBody('DOCUMENT_CODE_INVALID', 'Code incorrect.', { attemptsLeft: 4 }),
        },
        {
          status: 200,
          body: signingSession({
            status: 'signed',
            signedAt: '2026-11-09T10:07:00Z',
            download: download('signed'),
          }),
        },
      ],
    });
    render(<PublicSigning token={TOKEN} />);
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Protocole d’accord et échéancier de paiement' }),
    ).toBeInTheDocument();
    expect(screen.getByText('N° PAC-2026-000007')).toBeInTheDocument();
    expect(screen.getByText('Koffi Mensah')).toBeInTheDocument();
    expect(screen.getByText('+229********45')).toBeInTheDocument();
    expect(screen.getByText('16 novembre 2026 à 11:00')).toBeInTheDocument();

    // Lecture : adresse redemandée au clic, ouverte dans le nouvel onglet, sans lien avec cette page.
    fireEvent.click(screen.getByRole('button', { name: 'Lire le document' }));
    await waitFor(() => expect(tab.location.href).toBe(PDF));
    expect(tab.opener).toBeNull();
    expect(calls.filter((call) => call.path === LINK)).toHaveLength(2);

    fireEvent.click(screen.getByRole('button', { name: 'Recevoir mon code' }));
    const code = await screen.findByLabelText(/Code reçu/);
    expect(screen.getByText(/Code envoyé par WhatsApp/)).toBeInTheDocument();
    await waitFor(() => expect(code).toHaveFocus());

    // Contrôles de forme : 6 chiffres, puis l'accord.
    fireEvent.change(code, { target: { value: '12a3' } });
    fireEvent.click(screen.getByRole('button', { name: 'Signer le document' }));
    expect(await screen.findByText('Saisissez les 6 chiffres du code reçu.')).toBeInTheDocument();
    fireEvent.change(code, { target: { value: '111111' } });
    fireEvent.click(screen.getByRole('button', { name: 'Signer le document' }));
    expect(await screen.findByText(/Cochez la case/)).toBeInTheDocument();
    expect(calls.some((call) => call.path === `${LINK}/sign`)).toBe(false);

    fireEvent.click(screen.getByRole('checkbox', { name: /J’ai lu le document/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Signer le document' }));
    expect(await screen.findByText('Ce code est incorrect. Il vous reste 4 essais.')).toBeInTheDocument();
    expect(code).toHaveValue('');

    fireEvent.change(code, { target: { value: '482913' } });
    fireEvent.click(screen.getByRole('button', { name: 'Signer le document' }));
    expect(await screen.findByText('Document signé')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Lire le document signé' })).toBeInTheDocument();
    const signs = calls.filter((call) => call.path === `${LINK}/sign`);
    expect(signs.at(-1)?.body).toEqual({ code: '482913', consent: true });
    // Route publique : jamais de jeton de session.
    expect(calls.every((call) => !call.headers.Authorization)).toBe(true);
  });

  it('code déjà envoyé et encore valable : saisie directe', async () => {
    stubGateway({
      [`GET ${LINK}`]: { status: 200, body: signingSession({ codeExpiresAt: '2099-11-09T10:10:00Z' }) },
    });
    render(<PublicSigning token={TOKEN} />);
    expect(await screen.findByLabelText(/Code reçu/)).toBeInTheDocument();
    expect(screen.getByText(/Un code vous a déjà été envoyé/)).toBeInTheDocument();
  });

  it('trop de codes demandés (429) : délai affiché, bouton désactivé', async () => {
    stubGateway({
      [`GET ${LINK}`]: { status: 200, body: signingSession() },
      [`POST ${LINK}/otp`]: {
        status: 429,
        body: errorBody('DOCUMENT_CODE_TOO_SOON', 'Trop tôt.', { retryAfterSeconds: 42 }),
      },
    });
    render(<PublicSigning token={TOKEN} />);
    fireEvent.click(await screen.findByRole('button', { name: 'Recevoir mon code' }));
    expect(await screen.findByText(/Patientez 42 secondes/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Nouveau code dans 4\d s/ })).toBeDisabled();
  });

  it('demande close entre-temps : la page relit le lien et montre son état', async () => {
    stubGateway({
      [`GET ${LINK}`]: [
        { status: 200, body: signingSession() },
        { status: 200, body: signingSession({ status: 'cancelled', download: null }) },
      ],
      [`POST ${LINK}/otp`]: {
        status: 422,
        body: errorBody('DOCUMENT_SIGNATURE_CLOSED', 'Close.', { status: 'cancelled' }),
      },
    });
    render(<PublicSigning token={TOKEN} />);
    fireEvent.click(await screen.findByRole('button', { name: 'Recevoir mon code' }));
    expect(await screen.findByText('Cette demande de signature a été annulée')).toBeInTheDocument();
    expect(screen.getByText(/n’est plus ouverte/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Lire/ })).not.toBeInTheDocument();
  });

  it.each([
    ['expired', 'Cette demande de signature a expiré'],
    ['cancelled', 'Cette demande de signature a été annulée'],
  ])('demande %s : message, ni code ni lecture', async (status, title) => {
    stubGateway({ [`GET ${LINK}`]: { status: 200, body: signingSession({ status, download: null }) } });
    render(<PublicSigning token={TOKEN} />);
    expect(await screen.findByText(title)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Recevoir mon code' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Lire/ })).not.toBeInTheDocument();
  });

  it('déjà signé : confirmation et lecture du document signé', async () => {
    stubGateway({
      [`GET ${LINK}`]: {
        status: 200,
        body: signingSession({
          status: 'signed',
          signedAt: '2026-11-09T10:07:00Z',
          download: download('signed'),
        }),
      },
    });
    render(<PublicSigning token={TOKEN} />);
    expect(await screen.findByText('Document signé')).toBeInTheDocument();
    expect(screen.getByText('9 novembre 2026 à 11:07')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Lire le document signé' })).toBeInTheDocument();
  });

  it.each([
    [404, 'DOCUMENT_SIGNATURE_NOT_FOUND', 'Lien de signature introuvable', false],
    [503, 'DOCUMENT_DEPENDENCY_UNAVAILABLE', 'Le service de signature est momentanément indisponible', true],
    [429, 'GATEWAY_RATE_LIMITED', 'Patientez 30 secondes', true],
  ])('lecture refusée %i : message, « Réessayer » selon le cas', async (status, code, text, retry) => {
    stubGateway({ [`GET ${LINK}`]: { status, body: errorBody(code, 'x', { retryAfterSeconds: 30 }) } });
    render(<PublicSigning token={TOKEN} />);
    expect(await screen.findByText(new RegExp(text))).toBeInTheDocument();
    expect(!!screen.queryByRole('button', { name: 'Réessayer' })).toBe(retry);
  });

  it('onglet bloqué : lien à toucher ; adresse illisible : message', async () => {
    vi.spyOn(documentWindow, 'open').mockReturnValue(null);
    stubGateway({
      [`GET ${LINK}`]: [
        { status: 200, body: signingSession() },
        { status: 200, body: signingSession() },
        { status: 200, body: signingSession({ download: { ...download(), url: 'javascript:alert(1)' } }) },
      ],
    });
    render(<PublicSigning token={TOKEN} />);
    fireEvent.click(await screen.findByRole('button', { name: 'Lire le document' }));
    const open = await screen.findByRole('link', { name: 'Ouvrir le document' });
    expect(open).toHaveAttribute('href', PDF);
    expect(open).toHaveAttribute('rel', 'noopener noreferrer');
    fireEvent.click(screen.getByRole('button', { name: 'Lire le document' }));
    expect(await screen.findByText('Le document n’est plus disponible en lecture.')).toBeInTheDocument();
  });
});

describe('Document de Mon espace', () => {
  beforeEach(signIn);

  it('signataire attendu : code, accord, signature, empreinte du PDF signé', async () => {
    fakeTab();
    const signed = kspDocument({
      status: 'signed',
      signedAt: '2026-11-09T10:07:00Z',
      signedSha256: SIGNED_SHA,
      signature: signature({ status: 'signed', canSign: false, signedAt: '2026-11-09T10:07:00Z' }),
    });
    const calls = stubGateway({
      [`GET ${DOCUMENTS}`]: { status: 200, body: kspDocument() },
      [`GET ${DOCUMENTS}/download-url`]: { status: 200, body: download() },
      [`POST ${SIGNATURES}/otp`]: { status: 200, body: delivery },
      [`POST ${SIGNATURES}/sign`]: { status: 200, body: signed },
    });
    render(<DocumentDetail id={DOCUMENT_ID} />);
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Mandat de recouvrement' }),
    ).toBeInTheDocument();
    expect(screen.getByText('Awa Dossou (+229********11)')).toBeInTheDocument();
    const signing = screen.getByRole('region', { name: 'Signer ce document' });

    // Adresse de 5 minutes redemandée à chaque ouverture.
    fireEvent.click(within(signing).getByRole('button', { name: 'Lire le document' }));
    fireEvent.click(await within(signing).findByRole('button', { name: 'Lire le document' }));
    await waitFor(() =>
      expect(calls.filter((call) => call.path === `${DOCUMENTS}/download-url`)).toHaveLength(2),
    );

    fireEvent.click(within(signing).getByRole('button', { name: 'Recevoir mon code' }));
    fireEvent.change(await screen.findByLabelText(/Code reçu/), { target: { value: '482913' } });
    fireEvent.click(screen.getByRole('checkbox', { name: /J’ai lu le document/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Signer le document' }));
    expect(await screen.findByText('Document signé')).toBeInTheDocument();
    expect(screen.getByText(SIGNED_SHA)).toBeInTheDocument();
    expect(screen.queryByRole('region', { name: 'Signer ce document' })).not.toBeInTheDocument();
    const sign = calls.find((call) => call.path === `${SIGNATURES}/sign`)!;
    expect(sign.body).toEqual({ code: '482913', consent: true });
    expect(sign.headers.Authorization).toBe('Bearer jeton-acces');
  });

  it('lecture seule : signataire tiers en attente, empreinte, aucun code', async () => {
    stubGateway({
      [`GET ${DOCUMENTS}`]: { status: 200, body: kspDocument({ signature: signature({ canSign: false }) }) },
    });
    render(<DocumentDetail id={DOCUMENT_ID} />);
    expect(await screen.findByText('En attente de la signature de Awa Dossou.')).toBeInTheDocument();
    expect(screen.getByText(SHA)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Recevoir mon code' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Lire le document' })).toBeInTheDocument();
  });

  it('document d’un autre compte (404) : message, sans « Réessayer »', async () => {
    stubGateway({ [`GET ${DOCUMENTS}`]: { status: 404, body: errorBody('DOCUMENT_NOT_FOUND', 'x') } });
    render(<DocumentDetail id={DOCUMENT_ID} />);
    expect(await screen.findByText(/Ce document est introuvable/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Réessayer' })).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Mon espace KSP' })).toHaveAttribute('href', '/mon-espace');
  });

  it('panne (503) : message et « Réessayer »', async () => {
    stubGateway({
      [`GET ${DOCUMENTS}`]: [
        { status: 503, body: errorBody('DOCUMENT_DEPENDENCY_UNAVAILABLE', 'x') },
        { status: 200, body: kspDocument() },
      ],
    });
    render(<DocumentDetail id={DOCUMENT_ID} />);
    fireEvent.click(await screen.findByRole('button', { name: 'Réessayer' }));
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Mandat de recouvrement' }),
    ).toBeInTheDocument();
  });
});
