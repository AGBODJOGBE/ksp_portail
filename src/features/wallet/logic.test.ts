import { ApiError } from '@/lib/api';
import { describeWalletError } from './errors';
import { objectPath } from './paths';
import { objectLinkLabel, statementKindLabel } from './texts';
import { beneficiaryPhone, checkWithdrawal, describeWithdrawalError, withdrawalKeys } from './withdrawal';
import {
  checkTopUpAmount,
  forgetResume,
  isResumePath,
  readResume,
  rememberResume,
  topUpFor,
  topUpPresets,
} from './top-up';

const xof = (amount: number) => ({ amount, currency: 'XOF' as const });
const LIMITS = { min: xof(500), max: xof(1_000_000) };

describe('portefeuille : recharge', () => {
  it('raccourcis compris dans les limites de la gateway', () => {
    expect(topUpPresets(LIMITS)).toEqual([2000, 5000, 10000, 25000]);
    expect(topUpPresets({ min: xof(8000), max: xof(30000) })).toEqual([10000, 25000]);
    // Aucun raccourci dans les limites : le minimum.
    expect(topUpPresets({ min: xof(60000), max: xof(90000) })).toEqual([60000]);
  });

  it('montant saisi : entier de FCFA dans les limites, espaces acceptés', () => {
    expect(checkTopUpAmount('15 000', LIMITS)).toEqual({ amount: 15000 });
    expect(checkTopUpAmount('15 000', LIMITS)).toEqual({ amount: 15000 });
    expect(checkTopUpAmount('', LIMITS)).toEqual({ error: 'empty' });
    expect(checkTopUpAmount('12,5', LIMITS)).toEqual({ error: 'invalid' });
    expect(checkTopUpAmount('-3', LIMITS)).toEqual({ error: 'invalid' });
    expect(checkTopUpAmount('100', LIMITS)).toEqual({ error: 'tooLow' });
    expect(checkTopUpAmount('2000000', LIMITS)).toEqual({ error: 'tooHigh' });
  });

  it('solde insuffisant : recharge du montant manquant, au moins le minimum', () => {
    expect(topUpFor(20000, LIMITS)).toBe(20000);
    expect(topUpFor(200, LIMITS)).toBe(500);
    expect(topUpFor(3_000_000, LIMITS)).toBe(1_000_000);
    expect(topUpFor(200, null)).toBe(200);
  });

  it('reprise après la recharge : écran de Mon espace seulement', () => {
    expect(isResumePath('/mon-espace/factures/abc')).toBe(true);
    expect(isResumePath('https://exemple.com/mon-espace/')).toBe(false);
    expect(isResumePath('//exemple.com')).toBe(false);
    expect(isResumePath('/mon-espace/\\exemple')).toBe(false);
    rememberResume('/mon-espace/factures/f1');
    expect(readResume()).toBe('/mon-espace/factures/f1');
    forgetResume();
    expect(readResume()).toBeNull();
    sessionStorage.setItem('ksp:portefeuille:reprise', 'https://exemple.com');
    expect(readResume()).toBeNull();
  });
});

describe('portefeuille : relevé et refus', () => {
  it('objet payé → écran du portail', () => {
    expect(objectPath({ objectType: 'billing_invoice', objectId: 'f 1' })).toBe('/mon-espace/factures/f%201');
    // Mission du Nettoyage v1 : plus d'écran.
    expect(objectPath({ objectType: 'recovery_case_fee', objectId: 'c1' })).toBe(
      '/mon-espace/recouvrement/dossiers/c1',
    );
    expect(objectPath({ objectType: 'cleaning_mission', objectId: 'm1' })).toBeNull();
    expect(objectPath({ objectType: 'autre', objectId: 'x' })).toBeNull();
  });

  it('libellé du type d’une ligne, neutre pour un type inconnu', () => {
    expect(statementKindLabel({ kind: 'refund' })).toBe('Remboursement');
    expect(statementKindLabel({ kind: 'service_payment' })).toBe('Paiement');
    expect(statementKindLabel({ kind: 'nouveau' })).toBe('Opération');
  });

  it('codes du contrat : conséquence pour l’écran', () => {
    const error = (status: number, code: string, details: Record<string, unknown> = {}) =>
      new ApiError(status, code, 'message de la gateway', details);
    expect(
      describeWalletError(
        error(422, 'WALLET_INSUFFICIENT_FUNDS', { missing: xof(4000), balance: xof(1000) }),
      ),
    ).toEqual({ message: 'message de la gateway', kind: 'insufficient', missing: 4000, balance: 1000 });
    // Frais d'un dossier de recouvrement : même forme que le portefeuille.
    expect(
      describeWalletError(
        error(422, 'RECOVERY_INSUFFICIENT_FUNDS', { missing: xof(15000), balance: xof(2000) }),
      ),
    ).toEqual({ message: 'message de la gateway', kind: 'insufficient', missing: 15000, balance: 2000 });
    expect(describeWalletError(error(422, 'RECOVERY_MANDATE_NOT_SIGNED')).kind).toBe('stale');
    expect(describeWalletError(error(422, 'RECOVERY_INVALID_TRANSITION')).kind).toBe('stale');
    // Provision d'un devis : décision déjà prise ou expirée.
    expect(describeWalletError(error(422, 'RECOVERY_DECISION_CLOSED')).kind).toBe('stale');
    expect(describeWalletError(error(409, 'RECOVERY_IDEMPOTENCY_KEY_REUSED')).kind).toBe('newKey');
    expect(describeWalletError(error(422, 'WALLET_DEBIT_REFUNDED')).kind).toBe('newKey');
    expect(describeWalletError(error(409, 'CLEANING_CONCURRENT_UPDATE')).kind).toBe('retry');
    expect(describeWalletError(error(409, 'BILLING_CONCURRENT_UPDATE')).kind).toBe('retry');
    expect(describeWalletError(error(422, 'CLEANING_NOTHING_DUE')).kind).toBe('stale');
    expect(describeWalletError(error(422, 'BILLING_INVALID_TRANSITION')).kind).toBe('stale');
    expect(describeWalletError(error(403, 'AUTH_FORBIDDEN')).kind).toBe('forbidden');
    expect(describeWalletError(ApiError.network()).kind).toBe('retry');
    expect(
      describeWalletError(error(409, 'PAYMENT_CHECKOUT_OPEN', { expiresAt: '2026-11-20T13:30:00Z' })),
    ).toEqual({
      message: expect.stringContaining('jusqu’au 20 novembre 2026 à 14:30 (heure du Bénin)'),
      kind: 'other',
    });
    expect(describeWalletError(error(400, 'WALLET_VALIDATION_FAILED'))).toEqual({
      message: 'message de la gateway',
      kind: 'other',
    });
  });
});

describe('retrait vers Mobile Money', () => {
  const values = {
    amount: '15 000',
    operator: 'mtn' as const,
    phone: '01 97 00 00 46',
    name: ' Afi Dossou ',
  };

  it('saisie valide : corps du contrat, numéro béninois normalisé, nom nettoyé', () => {
    expect(checkWithdrawal(values, 20000)).toEqual({
      input: {
        amount: { amount: 15000, currency: 'XOF' },
        beneficiary: { phone: '+2290197000046', operator: 'mtn', name: 'Afi Dossou' },
      },
    });
  });

  it('montant vide, décimal, nul, au-delà du solde ou du plafond', () => {
    const errorOf = (amount: string, balance: number | null = 20000) => {
      const check = checkWithdrawal({ ...values, amount }, balance);
      return 'errors' in check ? check.errors.amount : undefined;
    };
    expect(errorOf('')).toMatch(/Indiquez le montant/);
    expect(errorOf('1500,5')).toMatch(/sans décimales/);
    expect(errorOf('0')).toMatch(/sans décimales/);
    expect(errorOf('25000')).toMatch(/dépasse votre solde/);
    expect(errorOf('2000000000', null)).toMatch(/ne peut pas dépasser/);
    expect(errorOf('20000')).toBeUndefined();
  });

  it('numéro : local, ancien à 8 chiffres, +229, étranger', () => {
    expect(beneficiaryPhone('01 97 00 00 46')).toBe('+2290197000046');
    expect(beneficiaryPhone('97 00 00 46')).toBe('+2290197000046');
    expect(beneficiaryPhone('+229 97 00 00 46')).toBe('+2290197000046');
    expect(beneficiaryPhone('00229 01 97 00 00 46')).toBe('+2290197000046');
    const foreign = checkWithdrawal({ ...values, phone: '+33 6 12 34 56 78' }, 20000);
    expect('errors' in foreign && foreign.errors.phone).toMatch(/numéro béninois/);
  });

  it('opérateur et nom obligatoires, nom de 120 caractères au plus', () => {
    const check = checkWithdrawal({ ...values, operator: '', name: 'x'.repeat(121) }, 20000);
    expect('errors' in check && check.errors).toMatchObject({
      operator: expect.stringMatching(/opérateur/),
      name: expect.stringMatching(/120 caractères/),
    });
  });

  it('refus de la gateway : champ, solde, clé, droits, reprise', () => {
    expect(
      describeWithdrawalError(
        new ApiError(400, 'WALLET_VALIDATION_FAILED', 'Nom requis.', { field: 'beneficiary.name' }),
      ),
    ).toEqual({ message: 'Nom requis.', kind: 'field', field: 'name' });
    expect(
      describeWithdrawalError(
        new ApiError(400, 'GATEWAY_VALIDATION_FAILED', 'Invalide.', {
          fields: [{ field: 'beneficiary.phone' }],
        }),
      ).field,
    ).toBe('phone');
    const insufficient = describeWithdrawalError(
      new ApiError(422, 'WALLET_INSUFFICIENT_FUNDS', 'Solde insuffisant.', {
        missing: { amount: 2500, currency: 'XOF' },
      }),
    );
    expect(insufficient.kind).toBe('insufficient');
    expect(insufficient.message.replace(/\s/g, ' ')).toBe('Solde insuffisant : il vous manque 2 500 F CFA.');
    expect(describeWithdrawalError(new ApiError(409, 'WALLET_IDEMPOTENCY_KEY_REUSED', 'x')).kind).toBe(
      'newKey',
    );
    expect(describeWithdrawalError(new ApiError(403, 'AUTH_FORBIDDEN', 'x')).kind).toBe('forbidden');
    expect(describeWithdrawalError(new ApiError(409, 'WALLET_CONCURRENT_UPDATE', 'x')).kind).toBe('retry');
    expect(describeWithdrawalError(ApiError.network()).kind).toBe('retry');
    expect(
      describeWithdrawalError(new ApiError(422, 'WALLET_SOMETHING', 'Refusé.', {}, 'corr-1')).message,
    ).toBe('Refusé. (référence : corr-1)');
  });

  it('clé d’idempotence : la même pour la même saisie, neuve après un envoi ou une saisie modifiée', () => {
    let count = 0;
    const keys = withdrawalKeys(() => `cle-${++count}`);
    const check = checkWithdrawal(values, 20000);
    if (!('input' in check)) throw new Error('saisie attendue valide');
    expect(keys.keyFor(check.input)).toBe('cle-1');
    expect(keys.keyFor(check.input)).toBe('cle-1');
    expect(keys.keyFor({ ...check.input, amount: { amount: 1000, currency: 'XOF' } })).toBe('cle-2');
    keys.done();
    expect(keys.keyFor(check.input)).toBe('cle-3');
  });

  it('relevé : libellés des nouvelles natures et liens des objets du Nettoyage v2', () => {
    expect(statementKindLabel({ kind: 'withdrawal_hold' })).toBe('Retrait demandé');
    expect(statementKindLabel({ kind: 'withdrawal_settlement' })).toBe('Retrait versé');
    expect(statementKindLabel({ kind: 'withdrawal_release' })).toBe('Retrait rendu');
    expect(statementKindLabel({ kind: 'service_credit' })).toBe('Crédit KSP');
    expect(objectPath({ objectType: 'cleaning_session', objectId: 's1' })).toBe(
      '/mon-espace/nettoyage/seances/s1',
    );
    expect(objectPath({ objectType: 'cleaning_request', objectId: 'r1' })).toBe(
      '/mon-espace/nettoyage/demandes/r1',
    );
    expect(objectPath({ objectType: 'cleaning_visit_fee', objectId: 'v1' })).toBeNull();
    expect(objectLinkLabel('cleaning_request')).toBe('Voir la demande');
    expect(objectLinkLabel('billing_invoice')).toBe('Voir la facture');
  });
});
