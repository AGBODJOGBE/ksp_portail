/** Montant en entiers de FCFA et créneau horaire, tels que les renvoie la gateway. */
type Money = { amount: number; currency: 'XOF' };
type TimeSlot = { start: string; end: string };

/*
 * Formats d'affichage communs : montants en entiers de FCFA, dates à l'heure du Bénin
 * (Africa/Porto-Novo, UTC+1 toute l'année), quel que soit le fuseau de l'appareil.
 */

export const BENIN_TIME_ZONE = 'Africa/Porto-Novo';
/** Décalage du Bénin par rapport à UTC : pas d'heure d'été. */
const BENIN_OFFSET = '+01:00';

const numberFormat = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 });

/** `45 000 FCFA` (espaces insécables) : jamais de décimales, jamais de division par 100. */
export function formatXof(value: Money | number): string {
  const amount = typeof value === 'number' ? value : value.amount;
  return `${numberFormat.format(amount)} FCFA`;
}

export function formatNumber(value: number): string {
  return numberFormat.format(value);
}

const dateFormat = new Intl.DateTimeFormat('fr-FR', {
  timeZone: BENIN_TIME_ZONE,
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  year: 'numeric',
});
const shortDateFormat = new Intl.DateTimeFormat('fr-FR', {
  timeZone: BENIN_TIME_ZONE,
  day: 'numeric',
  month: 'long',
  year: 'numeric',
});
const timeFormat = new Intl.DateTimeFormat('fr-FR', {
  timeZone: BENIN_TIME_ZONE,
  hour: '2-digit',
  minute: '2-digit',
});

/** « jeudi 5 novembre 2026 ». */
export function formatDate(iso: string): string {
  return dateFormat.format(new Date(iso));
}

/** « 5 novembre 2026 ». */
export function formatShortDate(iso: string): string {
  return shortDateFormat.format(new Date(iso));
}

/** « 09:00 ». */
export function formatTime(iso: string): string {
  return timeFormat.format(new Date(iso));
}

/** « 5 novembre 2026 à 09:00 ». */
export function formatDateTime(iso: string): string {
  return `${formatShortDate(iso)} à ${formatTime(iso)}`;
}

/** « jeudi 5 novembre 2026, de 09:00 à 12:00 ». */
export function formatSlot(slot: TimeSlot): string {
  return `${formatDate(slot.start)}, de ${formatTime(slot.start)} à ${formatTime(slot.end)}`;
}

/** « 3 h », « 1 h 30 », « 45 min ». */
export function formatDuration(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  if (!hours) return `${rest} min`;
  return rest ? `${hours} h ${String(rest).padStart(2, '0')}` : `${hours} h`;
}

/** Date du jour au Bénin, au format des champs de date (`2026-10-23`). */
export function beninDate(now: Date = new Date(), addDays = 0): string {
  const shifted = new Date(now.getTime() + addDays * 86_400_000);
  // `en-CA` donne AAAA-MM-JJ.
  return new Intl.DateTimeFormat('en-CA', { timeZone: BENIN_TIME_ZONE }).format(shifted);
}

/** Créneau d'une date (AAAA-MM-JJ) entre deux heures du Bénin (`08:00`), en ISO 8601 UTC. */
export function beninSlot(date: string, from: string, to: string): TimeSlot {
  const at = (time: string) => new Date(`${date}T${time}:00${BENIN_OFFSET}`).toISOString();
  return { start: at(from), end: at(to) };
}

/** Le moment est passé. */
export function isPast(iso: string, now: Date = new Date()): boolean {
  return new Date(iso).getTime() <= now.getTime();
}
