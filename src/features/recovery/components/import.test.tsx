import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { session } from '@/lib/api';
import {
  CASE_ID,
  IMPORT_ID,
  ORG_ID,
  OTHER_ID,
  errorBody,
  page,
  sessionBody,
  stubGateway,
  summary,
} from '@/features/recovery/fixtures.test-utils';
import { TEMPLATE_COLUMNS } from '@/features/recovery/import-check';
import { ImportDetail } from './import-detail';
import { ImportStart } from './import-start';

const push = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push, replace: vi.fn() }),
  usePathname: () => '/mon-espace/recouvrement/import',
  useSearchParams: () => new URLSearchParams(),
}));

const IMPORTS = '/api/v1/recovery/imports';
const IMPORT = `${IMPORTS}/${IMPORT_ID}`;
const SHEET_ID = '0192f1c4-7a2b-7c3d-8e4f-5a6b7c8d7b11';

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
  push.mockReset();
});

const example = readFileSync(join(process.cwd(), 'src/features/recovery/test-files/import-exemple.csv'));
const HEADER = TEMPLATE_COLUMNS.join(';');
const GOOD_CSV = `${HEADER}\ncompany;SARL Test;;;0197000045;;;FA-1;50000;31/08/2026;;\n`;

/** Dépôt du tableur par file : finalité `recovery_import`, type déclaré d'après l'extension. */
const sheetRoutes = (contentType: string) => {
  const file = {
    id: SHEET_ID,
    purpose: 'recovery_evidence',
    purposeDetail: 'recovery_import',
    fileName: 'factures.csv',
    contentType,
    sizeBytes: 100,
    status: 'pending',
    createdAt: '2026-11-25T09:00:00Z',
    completedAt: null,
  };
  return {
    'POST /api/v1/file/uploads': {
      status: 200,
      body: {
        file,
        upload: {
          url: 'https://stockage.test/depot',
          method: 'PUT',
          headers: { 'Content-Type': contentType },
          expiresAt: '2099-01-01T00:00:00Z',
        },
      },
    },
    [`POST /api/v1/file/files/${SHEET_ID}/complete`]: {
      status: 200,
      body: { ...file, status: 'available', completedAt: '2026-11-25T09:00:01Z' },
    },
  };
};

const line = (row: number, status: string, values: Record<string, string>, errors: unknown[] = []) => ({
  row,
  status,
  values,
  errors,
});

function report(overrides: Record<string, unknown> = {}) {
  return {
    id: IMPORT_ID,
    status: 'checked',
    kind: 'b2b',
    linesTotal: 3,
    linesValid: 2,
    linesInvalid: 1,
    casesPlanned: 1,
    lines: [
      line(1, 'valid', {
        debtorName: 'SARL Test',
        debtorPhone: '0197000045',
        invoiceReference: 'FA-1',
        amount: '50000',
      }),
      line(2, 'valid', {
        debtorName: 'SARL Test',
        debtorPhone: '0197000045',
        invoiceReference: 'FA-2',
        amount: '30000',
      }),
      line(
        3,
        'invalid',
        {
          debtorKind: 'company',
          debtorName: 'Ets Le Phare',
          debtorPhone: '12345',
          invoiceReference: 'FA-3',
          amount: '20000',
          dueDate: '31/08/2026',
        },
        [{ field: 'debtor_phone', code: 'phone_invalid' }],
      ),
    ],
    caseIds: [],
    createdAt: '2026-11-25T09:00:00Z',
    ...overrides,
  };
}

const choose = (file: File) =>
  fireEvent.change(screen.getByLabelText(/Tableur \(CSV ou XLSX/), { target: { files: [file] } });

describe('importer un tableur', () => {
  it('modèle CSV téléchargeable : 12 colonnes, marque UTF-8, séparateur « ; », ligne d’exemple', () => {
    stubGateway({});
    render(<ImportStart />);
    const link = screen.getByRole('link', { name: 'Télécharger le modèle (CSV)' });
    expect(link).toHaveAttribute('download', 'modele-import-recouvrement.csv');
    const href = link.getAttribute('href')!;
    expect(href.startsWith('data:text/csv;charset=utf-8,')).toBe(true);
    const content = decodeURIComponent(href.slice('data:text/csv;charset=utf-8,'.length));
    expect(content.startsWith(`﻿${HEADER}\r\n`)).toBe(true);
    expect(content).toContain('EXEMPLE-0001');
  });

  it('vrai fichier exemple vérifié dans le navigateur : lignes en erreur listées, envoi bloqué', async () => {
    const { calls } = stubGateway({});
    render(<ImportStart />);
    fireEvent.click(screen.getByText('Des entreprises'));
    choose(new File([example], 'import-exemple.csv', { type: 'application/vnd.ms-excel' }));
    expect(
      await screen.findByText(
        '3 lignes à corriger sur 6. Corrigez le fichier puis choisissez-le de nouveau.',
      ),
    ).toBeInTheDocument();
    const errors = screen.getByRole('list', { name: 'Lignes à corriger' });
    expect(within(errors).getByText('Ligne 3')).toBeInTheDocument();
    expect(within(errors).getByText('Ligne 5')).toBeInTheDocument();
    expect(errors).toHaveTextContent('Référence déjà utilisée sur une autre ligne.');
    expect(errors).toHaveTextContent('Date d’exigibilité pas encore atteinte.');
    expect(screen.getByRole('button', { name: 'Envoyer le tableur' })).toBeDisabled();
    expect(calls).toHaveLength(0);
  });

  it('fichier refusé en entier : colonnes différentes du modèle', async () => {
    stubGateway({});
    render(<ImportStart />);
    choose(new File([`nom;montant\nSARL;100\n`], 'factures.csv', { type: 'text/csv' }));
    expect(await screen.findByText(/Les colonnes ne correspondent pas au modèle/)).toBeInTheDocument();
  });

  it('fichier valide : type exigé, dépôt par file (recovery_import, text/csv), contrôle par KSP, résultat', async () => {
    const { calls } = stubGateway({
      ...sheetRoutes('text/csv'),
      [`POST ${IMPORTS}`]: { status: 200, body: report() },
    });
    render(<ImportStart />);
    choose(new File([GOOD_CSV], 'factures.csv', { type: '' }));
    expect(
      await screen.findByText(/1 facture vérifiée dans votre navigateur : aucune erreur/),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Envoyer le tableur' }));
    expect(await screen.findByText('Choisissez le type de vos débiteurs.')).toBeInTheDocument();
    fireEvent.click(screen.getByText('Des particuliers'));
    fireEvent.click(screen.getByRole('button', { name: 'Envoyer le tableur' }));
    await waitFor(() => expect(push).toHaveBeenCalledWith(`/mon-espace/recouvrement/import/${IMPORT_ID}`));
    expect(calls.find((call) => call.path === '/api/v1/file/uploads')?.body).toMatchObject({
      purpose: 'recovery_import',
      fileName: 'factures.csv',
      contentType: 'text/csv',
    });
    const created = calls.find((call) => call.path === IMPORTS)!;
    expect(created.body).toEqual({ kind: 'b2c', fileId: SHEET_ID });
    expect(created.headers['Idempotency-Key']).toMatch(/^[A-Za-z0-9_-]{8,100}$/);
  });

  it('classeur XLSX : non lu dans le navigateur, envoyé avec son type', async () => {
    const xlsx = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
    const { calls } = stubGateway({
      ...sheetRoutes(xlsx),
      [`POST ${IMPORTS}`]: { status: 200, body: report() },
    });
    render(<ImportStart />);
    fireEvent.click(screen.getByText('Des entreprises'));
    choose(new File([new Uint8Array([0x50, 0x4b, 0x03, 0x04])], 'factures.xlsx', { type: xlsx }));
    expect(await screen.findByText(/KSP le contrôle ligne par ligne après l’envoi/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Envoyer le tableur' }));
    await waitFor(() => expect(push).toHaveBeenCalled());
    expect(calls.find((call) => call.path === '/api/v1/file/uploads')?.body).toMatchObject({
      contentType: xlsx,
    });
  });

  it('fichier refusé par KSP (RECOVERY_IMPORT_FILE_INVALID) : message de la gateway', async () => {
    stubGateway({
      ...sheetRoutes('text/csv'),
      [`POST ${IMPORTS}`]: {
        status: 400,
        body: errorBody(
          'RECOVERY_IMPORT_FILE_INVALID',
          'La première ligne doit reprendre les intitulés des colonnes du modèle.',
          {
            reason: 'header_missing',
          },
        ),
      },
    });
    render(<ImportStart />);
    fireEvent.click(screen.getByText('Des entreprises'));
    choose(new File([GOOD_CSV], 'factures.csv', { type: 'text/csv' }));
    await screen.findByText(/aucune erreur/);
    fireEvent.click(screen.getByRole('button', { name: 'Envoyer le tableur' }));
    expect(await screen.findByText(/doit reprendre les intitulés/)).toBeInTheDocument();
    expect(push).not.toHaveBeenCalled();
  });

  it('contrôle pas encore servi (501) : « Bientôt disponible », la vérification reste disponible', async () => {
    stubGateway({
      ...sheetRoutes('text/csv'),
      [`POST ${IMPORTS}`]: { status: 501, body: errorBody('RECOVERY_NOT_IMPLEMENTED', 'pas encore') },
    });
    render(<ImportStart />);
    fireEvent.click(screen.getByText('Des entreprises'));
    choose(new File([GOOD_CSV], 'factures.csv', { type: 'text/csv' }));
    await screen.findByText(/aucune erreur/);
    fireEvent.click(screen.getByRole('button', { name: 'Envoyer le tableur' }));
    expect(await screen.findByText('L’envoi du tableur arrive bientôt')).toBeInTheDocument();
    expect(screen.getByText(/aucune erreur/)).toBeInTheDocument();
  });

  it('membre lecteur : modèle seulement', async () => {
    signIn('org_viewer');
    stubGateway({
      [`GET /api/v1/identity/organizations/${ORG_ID}`]: { status: 200, body: { role: 'org_viewer' } },
    });
    render(<ImportStart />);
    expect(
      await screen.findByText(/seuls les administrateurs et les membres peuvent importer/),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Télécharger le modèle (CSV)' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Envoyer le tableur' })).toBeNull();
  });
});

describe('résultat d’un import', () => {
  it('ligne à corriger : erreur lisible, correction envoyée, confirmation débloquée, brouillons créés', async () => {
    const corrected = report({
      linesValid: 3,
      linesInvalid: 0,
      lines: [
        ...report().lines.slice(0, 2),
        line(3, 'valid', { ...report().lines[2]!.values, debtorPhone: '0197000046' }),
      ],
      casesPlanned: 2,
    });
    const { calls } = stubGateway({
      [`GET ${IMPORT}`]: { status: 200, body: report() },
      [`PUT ${IMPORT}/lines/3`]: { status: 200, body: corrected },
      [`POST ${IMPORT}/confirm`]: {
        status: 200,
        body: { ...corrected, status: 'confirmed', caseIds: [CASE_ID, OTHER_ID] },
      },
      'GET /api/v1/recovery/cases': {
        status: 200,
        body: page([summary(), summary({ id: OTHER_ID, number: 'RC-000124', debtorName: 'Ets Le Phare' })]),
      },
    });
    render(<ImportDetail id={IMPORT_ID} />);
    const invalid = await screen.findByRole('region', { name: 'Lignes à corriger' });
    expect(invalid).toHaveTextContent('Téléphone : Téléphone invalide : un numéro du Bénin est attendu.');
    expect(screen.getByRole('button', { name: 'Créer les brouillons' })).toBeDisabled();

    fireEvent.click(within(invalid).getByRole('button', { name: 'Corriger' }));
    const phone = within(invalid).getByLabelText(/^Téléphone/);
    expect(phone).toHaveAttribute('aria-invalid', 'true');
    fireEvent.change(phone, { target: { value: '0197000046' } });
    fireEvent.click(within(invalid).getByRole('button', { name: 'Enregistrer la ligne' }));
    expect(
      await screen.findByText('Ligne 3 enregistrée : KSP l’a contrôlée de nouveau.'),
    ).toBeInTheDocument();
    expect(calls.find((call) => call.method === 'PUT')?.body).toMatchObject({
      values: { debtorPhone: '0197000046', debtorName: 'Ets Le Phare', debtorKind: 'company' },
    });

    fireEvent.click(screen.getByRole('button', { name: 'Créer les brouillons' }));
    expect(await screen.findByRole('heading', { name: 'Brouillons créés' })).toBeInTheDocument();
    expect(await screen.findByText('Brouillon RC-000124')).toBeInTheDocument();
    expect(screen.getByText(/frais d’étude : ils ne sont jamais remboursés/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Compléter.*RC-000124/ })).toHaveAttribute(
      'href',
      `/mon-espace/recouvrement/dossiers/${OTHER_ID}`,
    );
    const confirm = calls.find((call) => call.path === `${IMPORT}/confirm`)!;
    expect(confirm.headers['Idempotency-Key']).toMatch(/^[A-Za-z0-9_-]{8,100}$/);
  });

  it('ignorer une ligne', async () => {
    const { calls } = stubGateway({
      [`GET ${IMPORT}`]: { status: 200, body: report() },
      [`PUT ${IMPORT}/lines/3`]: {
        status: 200,
        body: report({ linesInvalid: 0, lines: [...report().lines.slice(0, 2), line(3, 'ignored', {})] }),
      },
    });
    render(<ImportDetail id={IMPORT_ID} />);
    fireEvent.click(await screen.findByRole('button', { name: 'Ignorer cette ligne' }));
    expect(await screen.findByText('Ligne 3 ignorée.')).toBeInTheDocument();
    expect(calls.find((call) => call.method === 'PUT')?.body).toEqual({ ignore: true });
    expect(screen.getByRole('button', { name: 'Créer les brouillons' })).toBeEnabled();
  });

  it('import expiré ; import introuvable', async () => {
    stubGateway({ [`GET ${IMPORT}`]: { status: 200, body: report({ status: 'expired' }) } });
    const first = render(<ImportDetail id={IMPORT_ID} />);
    expect(await screen.findByText(/a expiré sans être confirmé/)).toBeInTheDocument();
    first.unmount();
    vi.unstubAllGlobals();
    stubGateway({
      [`GET ${IMPORT}`]: { status: 404, body: errorBody('RECOVERY_IMPORT_NOT_FOUND', 'introuvable') },
    });
    render(<ImportDetail id={IMPORT_ID} />);
    expect(await screen.findByText(/Cet import est introuvable/)).toBeInTheDocument();
  });
});
