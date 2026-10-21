import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { session } from '@/lib/api';
import {
  challengeBody,
  errorBody,
  NO_SESSION,
  sessionBody,
  stubGateway,
  USER,
} from '@/features/identity/fake-gateway.test-utils';
import { LoginFlow } from './login-flow';

const replace = vi.fn();
let search = 'retour=%2Fmon-espace%2Ffactures';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace }),
  useSearchParams: () => new URLSearchParams(search),
}));

const REQUEST = 'POST /api/v1/identity/otp/request';
const VERIFY = 'POST /api/v1/identity/otp/verify';
const REFRESH = 'POST /api/v1/identity/token/refresh';
const PATCH_ME = 'PATCH /api/v1/identity/me';

beforeEach(() => {
  search = 'retour=%2Fmon-espace%2Ffactures';
  replace.mockReset();
  session.clear();
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

async function submitPhone(number = '01 97 00 00 45') {
  fireEvent.change(await screen.findByRole('textbox', { name: 'Numéro' }), { target: { value: number } });
  fireEvent.click(screen.getByRole('button', { name: 'Recevoir mon code' }));
}

function submitCode(code: string) {
  fireEvent.change(screen.getByRole('textbox', { name: /Code reçu/ }), { target: { value: code } });
  fireEvent.click(screen.getByRole('button', { name: 'Valider' }));
}

describe('parcours de connexion', () => {
  it('numéro, code, profil, puis retour à la page demandée', async () => {
    const { calls } = stubGateway({
      [REFRESH]: NO_SESSION,
      [REQUEST]: { status: 200, body: challengeBody() },
      [VERIFY]: [
        {
          status: 400,
          body: errorBody('IDENTITY_OTP_INVALID', 'Le code est incorrect.', { attemptsRemaining: 2 }),
        },
        { status: 200, body: { ...sessionBody(), isNewUser: true } },
      ],
      [PATCH_ME]: (body) => ({
        status: 200,
        body: { user: { ...USER, ...(body as object) }, profileIncomplete: false },
      }),
    });
    render(<LoginFlow />);

    // Indicatif +229 par défaut.
    expect(await screen.findByRole('textbox', { name: 'Indicatif' })).toHaveValue('+229');
    await submitPhone();

    expect(
      await screen.findByText(
        /Nous avons envoyé un code par WhatsApp au \+229\*{8}45\. Il est valable 5 minutes\./,
      ),
    ).toBeInTheDocument();
    expect(calls.find((call) => call.path.endsWith('/otp/request'))?.body).toEqual({
      phone: '+2290197000045',
    });
    const codeInput = screen.getByRole('textbox', { name: /Code reçu/ });
    expect(codeInput).toHaveAttribute('autocomplete', 'one-time-code');
    expect(codeInput).toHaveAttribute('inputmode', 'numeric');
    expect(codeInput).toHaveFocus();

    submitCode('000000');
    expect(await screen.findByText('Le code est incorrect. Il vous reste 2 essais.')).toBeInTheDocument();
    expect(codeInput).toHaveAttribute('aria-invalid', 'true');
    expect(codeInput).toHaveFocus();
    expect(codeInput).toHaveValue('');

    submitCode('482 913');
    expect(await screen.findByRole('heading', { name: 'Complétez votre profil' })).toBeInTheDocument();
    expect(calls.filter((call) => call.path.endsWith('/otp/verify')).at(-1)?.body).toEqual({
      challengeId: challengeBody().challengeId,
      code: '482913',
    });
    expect(session.getAccessToken()).toBe('jeton-acces');

    fireEvent.click(screen.getByRole('button', { name: 'Enregistrer et continuer' }));
    expect(await screen.findByText('Indiquez votre prénom.')).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: 'Prénom' })).toHaveFocus();

    fireEvent.change(screen.getByRole('textbox', { name: 'Prénom' }), { target: { value: ' Koffi ' } });
    fireEvent.change(screen.getByRole('textbox', { name: 'Nom' }), { target: { value: 'Adjovi' } });
    fireEvent.click(screen.getByRole('button', { name: 'Enregistrer et continuer' }));

    await waitFor(() => expect(replace).toHaveBeenCalledWith('/mon-espace/factures'));
    const patch = calls.find((call) => call.method === 'PATCH');
    expect(patch?.body).toEqual({ firstName: 'Koffi', lastName: 'Adjovi' });
    expect(patch?.headers.Authorization).toBe('Bearer jeton-acces');
    expect(session.get()).toMatchObject({ profileIncomplete: false, user: { firstName: 'Koffi' } });
  });

  it('vérifie le numéro avant tout appel', async () => {
    const { calls } = stubGateway({ [REFRESH]: NO_SESSION });
    render(<LoginFlow />);
    await submitPhone('12');

    expect(
      await screen.findByText('Numéro invalide : vérifiez l’indicatif et le numéro.'),
    ).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: 'Numéro' })).toHaveFocus();
    expect(calls.filter((call) => call.path.endsWith('/otp/request'))).toHaveLength(0);
  });

  it('annonce la limite atteinte et bloque la demande pendant le délai', async () => {
    stubGateway({
      [REFRESH]: NO_SESSION,
      [REQUEST]: {
        status: 429,
        body: errorBody('IDENTITY_OTP_RATE_LIMITED', 'Trop de codes demandés, réessayez plus tard.', {
          retryAfterSeconds: 45,
        }),
      },
    });
    render(<LoginFlow />);
    await submitPhone();

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Trop de codes demandés, réessayez plus tard.',
    );
    expect(screen.getByText('Nouvel essai possible dans 45 s.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Recevoir mon code' })).toBeDisabled();
  });

  it('autorise le renvoi du code à la fin du compte à rebours', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const { calls } = stubGateway({
      [REFRESH]: NO_SESSION,
      [REQUEST]: { status: 200, body: challengeBody(30) },
    });
    render(<LoginFlow />);
    await submitPhone();

    const waiting = await screen.findByRole('button', { name: 'Renvoyer le code dans 30 s' });
    expect(waiting).toBeDisabled();

    act(() => vi.advanceTimersByTime(31_000));

    fireEvent.click(await screen.findByRole('button', { name: 'Renvoyer le code' }));
    expect(await screen.findByText('Un nouveau code vous a été envoyé.')).toBeInTheDocument();
    expect(calls.filter((call) => call.path.endsWith('/otp/request'))).toHaveLength(2);
  });

  it('demande un nouveau code quand le code a expiré', async () => {
    stubGateway({
      [REFRESH]: NO_SESSION,
      [REQUEST]: { status: 200, body: challengeBody(60) },
      [VERIFY]: {
        status: 422,
        body: errorBody('IDENTITY_OTP_EXPIRED', 'Le code a expiré, demandez-en un nouveau.'),
      },
    });
    render(<LoginFlow />);
    await submitPhone();
    await screen.findByRole('textbox', { name: /Code reçu/ });
    submitCode('482913');

    expect(await screen.findByText('Le code a expiré, demandez-en un nouveau.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Valider' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Renvoyer le code' })).toBeEnabled();
  });

  it('explique qu’un compte à double authentification ne peut pas se connecter ici', async () => {
    stubGateway({
      [REFRESH]: NO_SESSION,
      [REQUEST]: { status: 200, body: challengeBody() },
      [VERIFY]: {
        status: 200,
        body: {
          status: 'mfa_required',
          mfaToken: 'mfa_1',
          expiresAt: '2099-01-01T00:05:00Z',
          methods: ['totp'],
          enrollmentRequired: true,
        },
      },
    });
    render(<LoginFlow />);
    await submitPhone();
    await screen.findByRole('textbox', { name: /Code reçu/ });
    submitCode('482913');

    expect(await screen.findByText(/double authentification, qui n’est pas disponible/)).toBeInTheDocument();
    expect(session.get()).toBeNull();
  });

  it('reprend une session encore valide sans rien demander, vers un chemin interne seulement', async () => {
    search = 'retour=https%3A%2F%2Fautre-site.example';
    stubGateway({ [REFRESH]: { status: 200, body: sessionBody({ profileIncomplete: false }) } });
    render(<LoginFlow />);

    await waitFor(() => expect(replace).toHaveBeenCalledWith('/mon-espace'));
    expect(screen.queryByRole('textbox', { name: 'Numéro' })).toBeNull();
  });

  it('affiche l’indisponibilité de la gateway sans perdre la saisie', async () => {
    stubGateway({
      [REFRESH]: NO_SESSION,
      [REQUEST]: {
        status: 503,
        body: errorBody('IDENTITY_OTP_SEND_FAILED', 'Envoi impossible.'),
      },
    });
    render(<LoginFlow />);
    await submitPhone();

    expect(await screen.findByRole('alert')).toHaveTextContent('Envoi impossible.');
    expect(screen.getByRole('textbox', { name: 'Numéro' })).toHaveValue('01 97 00 00 45');
  });
});
