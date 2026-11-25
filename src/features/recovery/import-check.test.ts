import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  EXAMPLE_ROW,
  IMPORT_MAX_BYTES,
  TEMPLATE_COLUMNS,
  checkImportFile,
  decodeCsv,
  importAmount,
  importContentType,
  importDay,
  importFormat,
  importPhone,
  parseCsv,
  templateCsv,
} from './import-check';

const TODAY = '2026-11-25';
const HEADER = TEMPLATE_COLUMNS.join(';');
const encode = (text: string) => new TextEncoder().encode(text);
const csv = (text: string, name = 'factures.csv') => {
  const bytes = encode(text);
  return checkImportFile({ name, size: bytes.length }, bytes, TODAY);
};
const row = (values: Partial<Record<(typeof TEMPLATE_COLUMNS)[number], string>>) =>
  TEMPLATE_COLUMNS.map((column) => values[column] ?? '').join(';');
const valid = {
  debtorKind: 'company',
  debtorName: 'SARL Test',
  debtorPhone: '0197000045',
  invoiceReference: 'FA-1',
  amount: '50000',
  dueDate: '31/08/2026',
};

describe('modèle CSV', () => {
  it('12 colonnes dans l’ordre, une ligne d’exemple, séparateur « ; », marque UTF-8 et CRLF', () => {
    const template = templateCsv();
    expect(template.startsWith('﻿')).toBe(true);
    const lines = template.slice(1).split('\r\n');
    expect(lines[0]).toBe(HEADER);
    expect(lines[0]!.split(';')).toHaveLength(12);
    expect(lines[1]).toContain('EXEMPLE-0001');
    // L'adresse contient une virgule mais pas de « ; » : pas de guillemets inutiles.
    expect(lines[1]).toContain(';Lot 12, Haie Vive, Cotonou;');
    expect(lines[2]).toBe('');
  });

  it('relu par la vérification : seule la ligne d’exemple est signalée', () => {
    const result = csv(templateCsv());
    expect(result).toEqual({
      status: 'checked',
      format: 'csv',
      rows: 1,
      invalid: [{ row: 1, issues: [{ field: 'invoiceReference', code: 'example_row' }] }],
    });
    expect(EXAMPLE_ROW.debtorKind).toBe('company');
  });
});

describe('vérification d’un vrai fichier exemple', () => {
  const file = join(process.cwd(), 'src/features/recovery/test-files/import-exemple.csv');
  const bytes = new Uint8Array(readFileSync(file));

  it('lignes valides, lignes en erreur numérotées comme recovery (en-tête exclu, ligne vide comptée)', () => {
    const result = checkImportFile({ name: 'import-exemple.csv', size: bytes.length }, bytes, TODAY);
    if (result.status !== 'checked') throw new Error(result.status);
    expect(result.rows).toBe(6);
    expect(result.invalid.map((line) => line.row)).toEqual([3, 4, 5]);
    expect(result.invalid[0]!.issues).toEqual([
      { field: 'debtorEmail', code: 'email_invalid' },
      { field: 'amount', code: 'amount_invalid' },
      { field: 'dueDate', code: 'due_date_not_reached' },
    ]);
    expect(result.invalid[1]!.issues.map((issue) => issue.code)).toEqual([
      'debtor_kind_invalid',
      'debtor_name_missing',
      'phone_invalid',
      'invoice_reference_missing',
      'nature_invalid',
      'amount_invalid',
      'due_date_invalid',
    ]);
    // Même référence qu'une ligne valide plus haut : la seconde est refusée.
    expect(result.invalid[2]!.issues).toEqual([
      { field: 'invoiceReference', code: 'invoice_reference_duplicate' },
    ]);
  });

  it('cellules entre guillemets (séparateur, guillemets doublés, retour à la ligne) et accents lus', () => {
    const rows = parseCsv(decodeCsv(bytes))!;
    const last = rows.at(-1)!;
    expect(last.cells[1]).toBe('Ets "Le Phare"');
    expect(last.cells[6]).toBe('Rue 12; Porto-Novo');
    expect(last.cells[10]).toBe('Ligne\nsur deux lignes');
    expect(rows[1]!.cells[1]).toBe('SARL Bénin Distribution');
  });
});

describe('fichier refusé en entier', () => {
  it('type, poids, fichier vide', () => {
    expect(checkImportFile({ name: 'factures.xls', size: 10 }, null, TODAY)).toMatchObject({
      code: 'wrong_type',
    });
    expect(checkImportFile({ name: 'factures.csv', size: IMPORT_MAX_BYTES + 1 }, null, TODAY)).toMatchObject({
      code: 'too_large',
    });
    expect(checkImportFile({ name: 'factures.csv', size: 0 }, new Uint8Array(), TODAY)).toMatchObject({
      code: 'empty',
    });
  });

  it('en-tête absent, colonnes différentes, aucune facture, guillemet non refermé', () => {
    expect(csv(`${row(valid)}\n`)).toMatchObject({ code: 'header_missing' });
    expect(csv(`${HEADER.replace('amount', 'montant')}\n${row(valid)}\n`)).toMatchObject({ code: 'columns' });
    expect(csv(`${HEADER}\n\n`)).toMatchObject({ code: 'no_rows' });
    expect(csv(`${HEADER}\n"company;SARL\n`)).toMatchObject({ code: 'unreadable' });
  });

  it('1 000 factures au plus', () => {
    const lines = Array.from({ length: 1001 }, (_, index) =>
      row({ ...valid, invoiceReference: `FA-${index}` }),
    );
    expect(csv(`${HEADER}\n${lines.join('\n')}\n`)).toMatchObject({ code: 'too_many_rows' });
    expect(csv(`${HEADER}\n${lines.slice(1).join('\n')}\n`)).toMatchObject({ status: 'checked', rows: 1000 });
  });

  it('un classeur XLSX n’est pas lu dans le navigateur', () => {
    expect(checkImportFile({ name: 'Factures.XLSX', size: 2000 }, null, TODAY)).toEqual({
      status: 'unchecked',
      format: 'xlsx',
    });
  });
});

describe('séparateurs et encodages', () => {
  it('virgule ou tabulation détectées sur l’en-tête', () => {
    const comma = `${TEMPLATE_COLUMNS.join(',')}\n${row(valid).replaceAll(';', ',')}\n`;
    expect(csv(comma)).toMatchObject({ status: 'checked', invalid: [] });
    const tab = `${TEMPLATE_COLUMNS.join('\t')}\r\n${row(valid).replaceAll(';', '\t')}\r\n`;
    expect(csv(tab)).toMatchObject({ status: 'checked', invalid: [] });
  });

  it('export d’Excel en Windows-1252 : les accents restent lisibles', () => {
    const latin = Uint8Array.from([0x42, 0xe9, 0x6e, 0x69, 0x6e]); // « Bénin »
    expect(decodeCsv(latin)).toBe('Bénin');
  });
});

describe('valeurs d’une ligne', () => {
  it('téléphones du Bénin : 8 ou 10 chiffres, +229, 00229, zéro de tête perdu par le tableur', () => {
    expect(importPhone('97 00 00 45')).toBe('+2290197000045');
    expect(importPhone('01 97 00 00 45')).toBe('+2290197000045');
    expect(importPhone('+229 97 00 00 45')).toBe('+2290197000045');
    expect(importPhone('00229 01 97 00 00 45')).toBe('+2290197000045');
    expect(importPhone('197000045')).toBe('+2290197000045');
    expect(importPhone('+33 6 12 34 56 78')).toBeNull();
    expect(importPhone('12345')).toBeNull();
  });

  it('montants entiers, séparateurs de milliers tolérés', () => {
    expect(importAmount('850 000')).toBe(850000);
    expect(importAmount('1.250.000')).toBe(1250000);
    expect(importAmount('850 000')).toBe(850000);
    expect(importAmount('12500,50')).toBeNull();
    expect(importAmount('0')).toBeNull();
    expect(importAmount('-100')).toBeNull();
  });

  it('dates JJ/MM/AAAA ou AAAA-MM-JJ, jours réels seulement', () => {
    expect(importDay('31/08/2026')).toBe('2026-08-31');
    expect(importDay('1/9/2026')).toBe('2026-09-01');
    expect(importDay('2026-09-15')).toBe('2026-09-15');
    expect(importDay('31/02/2026')).toBeNull();
    expect(importDay('2026/09/15')).toBeNull();
    // Échéance du jour même : déjà atteinte.
    expect(csv(`${HEADER}\n${row({ ...valid, dueDate: TODAY })}\n`)).toMatchObject({ invalid: [] });
  });

  it('nature vide : facture impayée ; type et format déclarés au service file', () => {
    expect(csv(`${HEADER}\n${row({ ...valid, nature: '' })}\n`)).toMatchObject({ invalid: [] });
    expect(importFormat('a.csv')).toBe('csv');
    expect(importContentType('csv')).toBe('text/csv');
    expect(importContentType('xlsx')).toBe(
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
  });
});
