import { ApiError } from '@/lib/api';
import { describeWalletError } from './errors';
import { objectPath } from './paths';
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
    rememberResume('/mon-espace/nettoyage/missions/m1');
    expect(readResume()).toBe('/mon-espace/nettoyage/missions/m1');
    forgetResume();
    expect(readResume()).toBeNull();
    sessionStorage.setItem('ksp:portefeuille:reprise', 'https://exemple.com');
    expect(readResume()).toBeNull();
  });
});

describe('portefeuille : relevé et refus', () => {
  it('objet payé → écran du portail', () => {
    expect(objectPath({ objectType: 'cleaning_mission', objectId: 'm 1' })).toBe(
      '/mon-espace/nettoyage/missions/m%201',
    );
    expect(objectPath({ objectType: 'billing_invoice', objectId: 'f1' })).toBe('/mon-espace/factures/f1');
    expect(objectPath({ objectType: 'autre', objectId: 'x' })).toBeNull();
  });

  it('codes du contrat : conséquence pour l’écran', () => {
    const error = (status: number, code: string, details: Record<string, unknown> = {}) =>
      new ApiError(status, code, 'message de la gateway', details);
    expect(
      describeWalletError(
        error(422, 'WALLET_INSUFFICIENT_FUNDS', { missing: xof(4000), balance: xof(1000) }),
      ),
    ).toEqual({ message: 'message de la gateway', kind: 'insufficient', missing: 4000, balance: 1000 });
    expect(describeWalletError(error(422, 'WALLET_DEBIT_REFUNDED')).kind).toBe('newKey');
    expect(describeWalletError(error(409, 'CLEANING_CONCURRENT_UPDATE')).kind).toBe('retry');
    expect(describeWalletError(error(409, 'BILLING_CONCURRENT_UPDATE')).kind).toBe('retry');
    expect(describeWalletError(error(422, 'CLEANING_NOTHING_DUE')).kind).toBe('stale');
    expect(describeWalletError(error(422, 'BILLING_INVALID_TRANSITION')).kind).toBe('stale');
    expect(describeWalletError(error(403, 'AUTH_FORBIDDEN')).kind).toBe('forbidden');
    expect(describeWalletError(ApiError.network()).kind).toBe('retry');
    expect(describeWalletError(error(400, 'WALLET_VALIDATION_FAILED'))).toEqual({
      message: 'message de la gateway',
      kind: 'other',
    });
  });
});
