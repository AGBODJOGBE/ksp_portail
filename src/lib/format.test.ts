import {
  beninDate,
  beninSlot,
  formatDate,
  formatDateTime,
  formatDuration,
  formatSlot,
  formatTime,
  formatXof,
} from './format';

/** Les espaces insécables (fines ou non) deviennent des espaces simples pour comparer. */
const plain = (text: string) => text.replace(/\s/g, ' ');

describe('montants en FCFA', () => {
  it('affiche des entiers de FCFA, sans décimales ni division par 100', () => {
    expect(plain(formatXof({ amount: 45000, currency: 'XOF' }))).toBe('45 000 F CFA');
    expect(plain(formatXof(1500000))).toBe('1 500 000 F CFA');
    expect(plain(formatXof(0))).toBe('0 F CFA');
  });

  it('garde montant et devise sur la même ligne (espaces insécables)', () => {
    expect(formatXof(45000)).not.toContain(' ');
  });
});

describe('dates à l’heure du Bénin (UTC+1)', () => {
  it('affiche l’heure du Bénin quel que soit le fuseau de l’appareil', () => {
    expect(formatTime('2026-11-05T07:00:00Z')).toBe('08:00');
    // 23 h 30 UTC : déjà le lendemain à Cotonou.
    expect(formatDate('2026-11-05T23:30:00Z')).toBe('vendredi 6 novembre 2026');
    expect(formatDateTime('2026-11-07T08:00:00Z')).toBe('7 novembre 2026 à 09:00');
  });

  it('décrit un créneau', () => {
    expect(formatSlot({ start: '2026-11-05T07:00:00Z', end: '2026-11-05T11:00:00Z' })).toBe(
      'jeudi 5 novembre 2026, de 08:00 à 12:00',
    );
  });

  it('construit un créneau en UTC à partir d’heures du Bénin', () => {
    expect(beninSlot('2026-11-05', '08:00', '12:00')).toEqual({
      start: '2026-11-05T07:00:00.000Z',
      end: '2026-11-05T11:00:00.000Z',
    });
  });

  it('donne la date du jour au Bénin, décalée de quelques jours', () => {
    const lateEvening = new Date('2026-10-23T23:30:00Z');
    expect(beninDate(lateEvening)).toBe('2026-10-24');
    expect(beninDate(lateEvening, 2)).toBe('2026-10-26');
  });

  it('écrit une durée', () => {
    expect(formatDuration(180)).toBe('3 h');
    expect(formatDuration(90)).toBe('1 h 30');
    expect(formatDuration(45)).toBe('45 min');
  });
});
