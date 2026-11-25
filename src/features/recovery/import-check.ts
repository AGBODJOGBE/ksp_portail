import { normalizePhone } from '@/lib/phone';

/*
 * Import par tableur, côté navigateur (décision du 25 novembre 2026, solution 1) : modèle CSV
 * téléchargeable et vérification d'un CSV avant l'envoi, sans dépendance. Miroir des règles de recovery
 * (`services/recovery/src/domain/import.ts`, `infrastructure/imports/spreadsheet.ts` et
 * `file-spreadsheet-reader.ts` de `ksp_back`) : le service refait tout le contrôle et reste seul juge
 * (montant minimum par débiteur compris, que le navigateur ne connaît pas). Un classeur XLSX n'est pas lu
 * ici : seul son poids est vérifié. Module pur, sans texte ni zod.
 */

/** Les 12 colonnes du modèle, dans l'ordre (`RecoveryImportLineValues` du contrat). */
export const TEMPLATE_COLUMNS = [
  'debtorKind',
  'debtorName',
  'debtorFirstNames',
  'debtorIfu',
  'debtorPhone',
  'debtorEmail',
  'debtorAddress',
  'invoiceReference',
  'amount',
  'dueDate',
  'description',
  'nature',
] as const;
export type TemplateColumn = (typeof TEMPLATE_COLUMNS)[number];

/** Poids maximal d'un tableur (finalité `recovery_import` de file). */
export const IMPORT_MAX_BYTES = 5 * 1024 * 1024;
/** Lignes de factures au plus par fichier, en-tête exclu. */
export const IMPORT_MAX_ROWS = 1000;
export const IMPORT_DEBTOR_KINDS = ['person', 'company'] as const;
/** Natures d'une créance importée : celles du contrat, hors loyers ; vide = `unpaid_invoice`. */
export const IMPORT_NATURES = [
  'unpaid_invoice',
  'service',
  'sale',
  'loan',
  'acknowledgment_of_debt',
  'bounced_cheque',
  'other',
] as const;

export const CSV_TYPE = 'text/csv';
export const XLSX_TYPE = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

/** Ligne d'exemple du modèle : repérée à sa référence si elle est envoyée telle quelle. */
export const EXAMPLE_ROW: Readonly<Record<TemplateColumn, string>> = {
  debtorKind: 'company',
  debtorName: 'SARL Exemple Distribution',
  debtorFirstNames: '',
  debtorIfu: '3201900000000',
  debtorPhone: '01 90 00 00 01',
  debtorEmail: 'comptabilite@exemple.bj',
  debtorAddress: 'Lot 12, Haie Vive, Cotonou',
  invoiceReference: 'EXEMPLE-0001',
  amount: '850000',
  dueDate: '31/08/2026',
  description: 'Ligne d’exemple : remplacez-la par vos factures',
  nature: 'unpaid_invoice',
};

const csvCell = (value: string) => (/[;"\r\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value);

/**
 * Modèle CSV : en-tête des 12 colonnes et une ligne d'exemple, séparateur `;`, fins de ligne CRLF, marque
 * UTF-8 (BOM) pour qu'Excel lise les accents.
 */
export function templateCsv(): string {
  const lines = [
    TEMPLATE_COLUMNS.join(';'),
    TEMPLATE_COLUMNS.map((key) => csvCell(EXAMPLE_ROW[key])).join(';'),
  ];
  return `﻿${lines.join('\r\n')}\r\n`;
}

export const TEMPLATE_FILE_NAME = 'modele-import-recouvrement.csv';

/* ——— Lecture d'un CSV ——— */

/** UTF-8 (marque retirée), sinon Windows-1252 (export d'Excel) : les accents restent lisibles. */
export function decodeCsv(bytes: Uint8Array): string {
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(bytes).replace(/^﻿/, '');
  } catch {
    return new TextDecoder('windows-1252').decode(bytes);
  }
}

/** Séparateur le plus fréquent de la première ligne, hors guillemets (`;`, `,` ou tabulation). */
function detectSeparator(text: string): string {
  const firstLine = (text.split(/\r?\n/, 1)[0] ?? '').replace(/"[^"]*"/g, '');
  const counts = [';', ',', '\t']
    .map((separator) => ({ separator, count: firstLine.split(separator).length - 1 }))
    .sort((a, b) => b.count - a.count);
  return counts[0]!.count > 0 ? counts[0]!.separator : ';';
}

export interface SheetRow {
  /** Numéro de la ligne dans le fichier (1 : première ligne). */
  number: number;
  cells: string[];
}

/** CSV au sens de la RFC 4180 (guillemets doublés, retours à la ligne entre guillemets) ; null si un guillemet n'est pas refermé. */
export function parseCsv(text: string): SheetRow[] | null {
  const separator = detectSeparator(text);
  const rows: SheetRow[] = [];
  let cells: string[] = [];
  let cell = '';
  let quoted = false;
  let number = 1;
  const pushRow = () => {
    cells.push(cell);
    if (cells.some((value) => value.trim() !== '')) rows.push({ number, cells });
    cells = [];
    cell = '';
    number += 1;
  };
  for (let index = 0; index < text.length; index += 1) {
    const char = text[index]!;
    if (quoted) {
      if (char === '"' && text[index + 1] === '"') {
        cell += '"';
        index += 1;
      } else if (char === '"') quoted = false;
      else cell += char;
    } else if (char === '"' && cell === '') quoted = true;
    else if (char === separator) {
      cells.push(cell);
      cell = '';
    } else if (char === '\n' || char === '\r') {
      if (char === '\r' && text[index + 1] === '\n') index += 1;
      pushRow();
    } else cell += char;
  }
  if (quoted) return null;
  if (cell !== '' || cells.length > 0) pushRow();
  return rows;
}

/* ——— Contrôle d'une ligne ——— */

export type LineCode =
  | 'debtor_kind_invalid'
  | 'debtor_name_missing'
  | 'phone_missing'
  | 'phone_invalid'
  | 'email_invalid'
  | 'invoice_reference_missing'
  | 'invoice_reference_duplicate'
  | 'nature_invalid'
  | 'amount_invalid'
  | 'due_date_missing'
  | 'due_date_invalid'
  | 'due_date_not_reached'
  | 'example_row';

export interface LineIssue {
  field: TemplateColumn;
  code: LineCode;
}

export interface LineCheck {
  /** Numéro de la ligne, en-tête exclu (1 : première facture), comme recovery le compte. */
  row: number;
  issues: LineIssue[];
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Téléphone du Bénin, plan à 10 chiffres (+229 01 et 8 chiffres) : 8 ou 10 chiffres sans indicatif lus
 * comme béninois, ancien numéro à 8 chiffres complété (`normalizePhone`), zéro de tête perdu par le
 * tableur rendu (« 197000045 »). Null si le numéro est invalide ou étranger.
 */
export function importPhone(raw: string): string | null {
  const trimmed = raw.trim();
  const value = /^1\d{8}$/.test(trimmed) ? `0${trimmed}` : raw;
  const compact = value.replace(/[\s.\-()]/g, '');
  const phone = normalizePhone(/^(01)?\d{8}$/.test(compact) ? `+229${compact}` : compact);
  return phone !== null && /^\+22901\d{8}$/.test(phone) ? phone : null;
}

/** Montant entier en FCFA, séparateurs de milliers (espaces, points) tolérés ; null sinon. */
export function importAmount(raw: string): number | null {
  const compact = raw.replace(/[\s.]/g, '');
  if (!/^\d+$/.test(compact)) return null;
  const value = Number(compact);
  return Number.isSafeInteger(value) && value > 0 ? value : null;
}

/** « JJ/MM/AAAA » ou « AAAA-MM-JJ » → « AAAA-MM-JJ » s'il s'agit d'un vrai jour ; null sinon. */
export function importDay(raw: string): string | null {
  const value = raw.trim();
  const french = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(value);
  const iso = french ? `${french[3]}-${french[2]!.padStart(2, '0')}-${french[1]!.padStart(2, '0')}` : value;
  const parts = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!parts) return null;
  const date = new Date(Date.UTC(Number(parts[1]), Number(parts[2]) - 1, Number(parts[3])));
  return date.toISOString().slice(0, 10) === iso ? iso : null;
}

const valuesOf = (cells: readonly string[]) =>
  Object.fromEntries(TEMPLATE_COLUMNS.map((key, index) => [key, cells[index] ?? ''])) as Record<
    TemplateColumn,
    string
  >;

/** Contrôle d'une ligne (valeurs texte) ; `today` : jour du Bénin, AAAA-MM-JJ. */
export function checkLine(values: Record<TemplateColumn, string>, today: string): LineIssue[] {
  const issues: LineIssue[] = [];
  const fail = (field: TemplateColumn, code: LineCode) => issues.push({ field, code });
  if (values.invoiceReference.trim() === EXAMPLE_ROW.invoiceReference)
    fail('invoiceReference', 'example_row');
  if (!(IMPORT_DEBTOR_KINDS as readonly string[]).includes(values.debtorKind.trim()))
    fail('debtorKind', 'debtor_kind_invalid');
  if (!values.debtorName.trim()) fail('debtorName', 'debtor_name_missing');
  if (!values.debtorPhone.trim()) fail('debtorPhone', 'phone_missing');
  else if (!importPhone(values.debtorPhone)) fail('debtorPhone', 'phone_invalid');
  const email = values.debtorEmail.trim();
  if (email && !EMAIL.test(email)) fail('debtorEmail', 'email_invalid');
  if (!values.invoiceReference.trim()) fail('invoiceReference', 'invoice_reference_missing');
  const nature = values.nature.trim() || 'unpaid_invoice';
  if (!(IMPORT_NATURES as readonly string[]).includes(nature)) fail('nature', 'nature_invalid');
  if (importAmount(values.amount) === null) fail('amount', 'amount_invalid');
  if (!values.dueDate.trim()) fail('dueDate', 'due_date_missing');
  else {
    const day = importDay(values.dueDate);
    if (!day) fail('dueDate', 'due_date_invalid');
    else if (day > today) fail('dueDate', 'due_date_not_reached');
  }
  return issues;
}

/* ——— Contrôle d'un fichier ——— */

export type FileCode =
  | 'wrong_type'
  | 'too_large'
  | 'empty'
  | 'unreadable'
  | 'header_missing'
  | 'columns'
  | 'no_rows'
  | 'too_many_rows';

export type ImportFormat = 'csv' | 'xlsx';

export type ImportCheck =
  /** Fichier refusé en entier. */
  | { status: 'refused'; code: FileCode; format: ImportFormat | null }
  /** Classeur XLSX : contrôlé par KSP après l'envoi. */
  | { status: 'unchecked'; format: 'xlsx' }
  /** CSV lu : lignes de factures et lignes en erreur. */
  | { status: 'checked'; format: 'csv'; rows: number; invalid: LineCheck[] };

/** Format d'après l'extension ; null si ce n'est ni un CSV ni un classeur XLSX. */
export function importFormat(fileName: string): ImportFormat | null {
  const name = fileName.toLowerCase();
  if (name.endsWith('.csv')) return 'csv';
  if (name.endsWith('.xlsx')) return 'xlsx';
  return null;
}

/** Type déclaré au service file, d'après le format (le navigateur annonce mal un CSV). */
export const importContentType = (format: ImportFormat) => (format === 'csv' ? CSV_TYPE : XLSX_TYPE);

const normalizeHeader = (value: string) => value.trim().toLowerCase();

/** Vérifie un tableur avant l'envoi. `today` : jour du Bénin, AAAA-MM-JJ. */
export function checkImportFile(
  file: { name: string; size: number },
  bytes: Uint8Array | null,
  today: string,
): ImportCheck {
  const format = importFormat(file.name);
  if (!format) return { status: 'refused', code: 'wrong_type', format: null };
  if (file.size > IMPORT_MAX_BYTES) return { status: 'refused', code: 'too_large', format };
  if (file.size === 0) return { status: 'refused', code: 'empty', format };
  if (format === 'xlsx') return { status: 'unchecked', format };

  const rows = bytes ? parseCsv(decodeCsv(bytes)) : null;
  if (!rows) return { status: 'refused', code: 'unreadable', format };
  const [header, ...data] = rows;
  if (!header) return { status: 'refused', code: 'empty', format };
  const first = normalizeHeader(header.cells[0] ?? '');
  if (first === 'person' || first === 'company') return { status: 'refused', code: 'header_missing', format };
  const columnsOk = TEMPLATE_COLUMNS.every(
    (key, index) => normalizeHeader(header.cells[index] ?? '') === key.toLowerCase(),
  );
  if (!columnsOk) return { status: 'refused', code: 'columns', format };
  if (!data.length) return { status: 'refused', code: 'no_rows', format };
  if (data.length > IMPORT_MAX_ROWS) return { status: 'refused', code: 'too_many_rows', format };

  const seen = new Set<string>();
  const invalid: LineCheck[] = [];
  for (const line of data) {
    const values = valuesOf(line.cells);
    const issues = checkLine(values, today);
    const reference = values.invoiceReference.trim();
    // Comme recovery : la seconde ligne d'une même référence est refusée, la première garde la sienne.
    if (reference && !issues.length) {
      if (seen.has(reference))
        issues.push({ field: 'invoiceReference', code: 'invoice_reference_duplicate' });
      seen.add(reference);
    }
    if (issues.length) invalid.push({ row: line.number - header.number, issues });
  }
  return { status: 'checked', format, rows: data.length, invalid };
}
