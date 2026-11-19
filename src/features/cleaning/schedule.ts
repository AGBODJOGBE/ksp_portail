import { BENIN_TIME_ZONE, beninDate } from '@/lib/format';
import type { Intervention, Recurrence, Schedule } from './schemas';
import { recurrenceLabel } from './texts';

/*
 * Plan de passages (ADR-052) : résumé en phrase et état de chaque date pour le calendrier. Simple mise
 * en forme de ce que renvoie la gateway (plan, dates exactes, passages) : aucune date n'est calculée ici,
 * le nombre de passages est celui des dates reçues.
 */

const WEEKDAYS: Record<string, string> = {
  mon: 'lundi',
  tue: 'mardi',
  wed: 'mercredi',
  thu: 'jeudi',
  fri: 'vendredi',
  sat: 'samedi',
  sun: 'dimanche',
};
const WEEK_ORDER = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];

/** Jour civil `AAAA-MM-JJ` lu à midi UTC : la date affichée ne glisse jamais d'un jour. */
export const civilDate = (day: string) => new Date(`${day}T12:00:00Z`);

const dayFormat = new Intl.DateTimeFormat('fr-BJ', {
  timeZone: 'UTC',
  day: 'numeric',
  month: 'short',
  year: 'numeric',
});
const longDayFormat = new Intl.DateTimeFormat('fr-BJ', {
  timeZone: 'UTC',
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  year: 'numeric',
});
const beninDay = new Intl.DateTimeFormat('en-CA', { timeZone: BENIN_TIME_ZONE });

/** « 11 nov. 2026 ». */
export function formatPlanDay(day: string): string {
  return dayFormat.format(civilDate(day));
}

/** « mercredi 11 novembre 2026 ». */
export function formatPlanDayLong(day: string): string {
  return longDayFormat.format(civilDate(day));
}

/** Jour civil au Bénin (`AAAA-MM-JJ`) d'un instant ISO : le jour d'un passage. */
export function beninDayOf(iso: string): string {
  return beninDay.format(new Date(iso));
}

/** « lundi, mercredi et samedi ». */
function listOf(words: string[], joiner = 'et'): string {
  if (words.length <= 1) return words.join('');
  return `${words.slice(0, -1).join(', ')} ${joiner} ${words.at(-1)}`;
}

const ordinal = (rank: number | string) =>
  rank === 'last' ? 'dernier' : Number(rank) === 1 ? '1er' : `${String(rank)}e`;

const weekdaysOf = (schedule: Schedule) =>
  [...schedule.weekdays]
    .sort((a, b) => WEEK_ORDER.indexOf(a) - WEEK_ORDER.indexOf(b))
    .map((day) => WEEKDAYS[day] ?? day);

/** Rythme d'un plan : « chaque lundi et mercredi », « le 5 et le 31 de chaque mois »… ; null en mode `dates`. */
export function scheduleRhythm(schedule: Schedule): string | null {
  const days = weekdaysOf(schedule);
  if (schedule.mode === 'weekly' && days.length) {
    if (schedule.everyWeeks <= 1) return `chaque ${listOf(days)}`;
    const every =
      schedule.everyWeeks === 2 ? 'une semaine sur deux' : `toutes les ${schedule.everyWeeks} semaines`;
    return `${listOf(days.map((day) => `le ${day}`))}, ${every}`;
  }
  if (schedule.mode === 'monthly' && schedule.monthDays.length) {
    const sorted = [...schedule.monthDays].sort((a, b) => a - b);
    const text = `${listOf(sorted.map((day) => `le ${day === 1 ? '1er' : day}`))} de chaque mois`;
    // Un jour absent d'un mois (31 en avril…) devient le dernier jour de ce mois (ADR-052).
    return sorted.some((day) => day > 28) ? `${text} (ou le dernier jour du mois)` : text;
  }
  if (schedule.mode === 'monthly' && schedule.weeksOfMonth.length && days.length) {
    const ranks = [...schedule.weeksOfMonth].sort((a, b) =>
      a === 'last' ? 1 : b === 'last' ? -1 : Number(a) - Number(b),
    );
    return `${listOf(ranks.map((rank) => `le ${ordinal(rank)}`))} ${listOf(days)} de chaque mois`;
  }
  return null;
}

const plural = (count: number) => (count > 1 ? `${count} passages` : '1 passage');

/**
 * Résumé d'un plan : « 157 passages, chaque lundi, mercredi et samedi, du 11 nov. 2026 au 10 nov. 2027,
 * à 08:00 ». Le nombre, le premier et le dernier passage viennent des dates exactes de la gateway ; à
 * défaut (gateway antérieure), la période du plan.
 */
export function scheduleSummary(schedule: Schedule, dates: ReadonlyArray<string> = []): string {
  const days = dates.length ? [...dates].sort() : [...schedule.dates].sort();
  const first = days[0] ?? schedule.startDate;
  const last = days.at(-1) ?? schedule.endDate;
  const rhythm = scheduleRhythm(schedule);
  const parts: string[] = [];
  if (days.length) parts.push(plural(days.length));
  if (rhythm) parts.push(rhythm);
  else if (days.length > 1) parts[0] = `${parts[0]} à des dates choisies`;
  if (first && last && first !== last) parts.push(`du ${formatPlanDay(first)} au ${formatPlanDay(last)}`);
  else if (first) parts.push(`le ${formatPlanDay(first)}`);
  parts.push(`à ${schedule.startTime}`);
  return parts.join(', ');
}

/**
 * Régularité affichée d'une demande, d'un devis ou d'une mission : le résumé du plan quand il existe,
 * sinon l'ancienne récurrence (demandes antérieures au plan, ADR-052), sinon rien.
 */
export function planLabel(source: {
  schedule?: Schedule | null;
  scheduledDates?: ReadonlyArray<string>;
  recurrence: Recurrence | null;
}): string | null {
  if (source.schedule) return scheduleSummary(source.schedule, source.scheduledDates ?? []);
  return recurrenceLabel(source.recurrence);
}

/**
 * État d'une date du calendrier d'une mission : faite, planifiée, à planifier (à venir), ou passée sans
 * passage (`missed` : jamais planifiée, ou passage déplacé à une autre date).
 */
export type PlanDayState = 'done' | 'planned' | 'toPlan' | 'missed';

export interface PlanDay {
  date: string;
  state: PlanDayState;
}

const ACTIVE = new Set(['planned', 'in_progress', 'on_hold']);

/**
 * Dates d'une mission pour le calendrier : faites (passage effectué), planifiées (passage prévu ou en
 * cours) et restant à planifier — une date à venir du plan sans passage actif ni fait (ADR-052 : « dates
 * restantes »), y compris celle d'un passage annulé pour être replanifié. Une date passée sans passage
 * est « sans passage ». Un passage reporté hors des dates du plan figure à sa nouvelle date.
 */
export function missionPlanDays(
  scheduledDates: ReadonlyArray<string>,
  interventions: ReadonlyArray<Pick<Intervention, 'status' | 'scheduledStart'>>,
  today: string = beninDate(),
): PlanDay[] {
  const states = new Map<string, PlanDayState>();
  for (const date of scheduledDates) states.set(date, date < today ? 'missed' : 'toPlan');
  for (const intervention of interventions) {
    const day = beninDayOf(intervention.scheduledStart);
    if (intervention.status === 'completed') states.set(day, 'done');
    else if (ACTIVE.has(intervention.status) && states.get(day) !== 'done') states.set(day, 'planned');
  }
  return [...states.entries()]
    .map(([date, state]) => ({ date, state }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

/** Nombre de dates par état (légende du calendrier). */
export function countPlanDays(days: ReadonlyArray<PlanDay>): Record<PlanDayState, number> {
  const counts: Record<PlanDayState, number> = { done: 0, planned: 0, toPlan: 0, missed: 0 };
  for (const day of days) counts[day.state] += 1;
  return counts;
}
