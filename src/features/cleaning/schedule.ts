import { formatShortDate } from '@/lib/format';
import type { MonthRank, SchedulePlan, Weekday } from './api';
import type { SchedulePlanView } from './schemas';

/*
 * Programme souhaité (`CleaningSchedulePlan`, partie 8) : saisie, contrôle de forme et construction du
 * corps envoyé. Les dates exactes, les jours fériés, le décalage des jours absents du mois et les bornes
 * du programme sont calculés par la gateway (`schedule-previews`) : le front n'en calcule aucune.
 */

export type ScheduleKind = SchedulePlan['kind'];
export const SCHEDULE_KINDS: ReadonlyArray<ScheduleKind> = ['one_off', 'weekly', 'monthly'];
/** Lundi d'abord, comme la semaine au Bénin. */
export const WEEKDAYS: ReadonlyArray<Weekday> = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
export const MONTH_RANKS: ReadonlyArray<MonthRank> = ['first', 'second', 'third', 'fourth', 'last'];
/** Bornes du contrat. */
export const MAX_EVERY_WEEKS = 12;
export const MAX_DURATION_WEEKS = 260;
export const MAX_DURATION_MONTHS = 60;
export const MAX_DATES = 400;
export const MAX_MONTH_WEEKDAYS = 10;

export type EndMode = 'weeks' | 'months' | 'date';

export interface ScheduleDraft {
  kind: ScheduleKind | null;
  /** Heure de début des séances, `HH:MM`, heure de Porto-Novo. */
  startTime: string;
  /** Ponctuel : jours de passage. */
  dates: string[];
  weekdays: Weekday[];
  everyWeeks: number;
  /** Mensuel : des jours du mois, ou un jour de la semaine à un rang. */
  monthlyForm: 'days' | 'weekdays';
  monthDays: number[];
  monthWeekdays: Array<{ rank: MonthRank; weekday: Weekday }>;
  startDate: string;
  endMode: EndMode;
  durationWeeks: string;
  durationMonths: string;
  endDate: string;
  /** Jours fériés exclus (proposé par défaut, R-PG-02). */
  excludeHolidays: boolean;
  /** Jours retirés depuis l'aperçu. */
  excludedDates: string[];
}

export function emptySchedule(): ScheduleDraft {
  return {
    kind: null,
    startTime: '08:00',
    dates: [],
    weekdays: [],
    everyWeeks: 1,
    monthlyForm: 'days',
    monthDays: [],
    monthWeekdays: [],
    startDate: '',
    endMode: 'months',
    durationWeeks: '',
    durationMonths: '',
    endDate: '',
    excludeHolidays: true,
    excludedDates: [],
  };
}

/** Erreurs par champ (`schedule.kind`, `schedule.dates`…), même clé que les erreurs de la gateway. */
export type ScheduleErrors = Record<string, string>;

const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;
const DATE = /^\d{4}-\d{2}-\d{2}$/;

const messages = {
  kind: 'Choisissez un rythme.',
  startTime: 'Indiquez l’heure de début (HH:MM).',
  dates: 'Ajoutez au moins un jour de passage.',
  weekdays: 'Choisissez au moins un jour de la semaine.',
  monthDays: 'Choisissez au moins un jour du mois.',
  monthWeekdays: 'Choisissez au moins un jour (par exemple le premier samedi).',
  startDate: 'Indiquez la date de début.',
  durationWeeks: `Indiquez une durée de 1 à ${MAX_DURATION_WEEKS} semaines.`,
  durationMonths: `Indiquez une durée de 1 à ${MAX_DURATION_MONTHS} mois.`,
  endDate: 'Indiquez une date de fin postérieure à la date de début.',
} as const;

function integerIn(text: string, max: number): number | null {
  if (!/^\d+$/.test(text.trim())) return null;
  const value = Number(text.trim());
  return value >= 1 && value <= max ? value : null;
}

/**
 * Corps `CleaningSchedulePlan` de la saisie, ou les erreurs de forme. Seuls les champs de la nature
 * choisie sont envoyés (la gateway refuse un champ qui ne s'applique pas).
 */
export function buildSchedule(draft: ScheduleDraft): { plan: SchedulePlan } | { errors: ScheduleErrors } {
  const errors: ScheduleErrors = {};
  if (!draft.kind) return { errors: { 'schedule.kind': messages.kind } };
  if (!TIME.test(draft.startTime)) errors['schedule.startTime'] = messages.startTime;
  const common = {
    startTime: draft.startTime,
    excludeHolidays: draft.excludeHolidays,
    ...(draft.excludedDates.length ? { excludedDates: [...draft.excludedDates].sort() } : {}),
  };

  if (draft.kind === 'one_off') {
    const dates = [...new Set(draft.dates.filter((date) => DATE.test(date)))].sort();
    if (!dates.length) errors['schedule.dates'] = messages.dates;
    if (Object.keys(errors).length) return { errors };
    return { plan: { kind: 'one_off', dates, ...common } };
  }

  if (draft.kind === 'weekly' && !draft.weekdays.length) errors['schedule.weekdays'] = messages.weekdays;
  if (draft.kind === 'monthly') {
    if (draft.monthlyForm === 'days' && !draft.monthDays.length) {
      errors['schedule.monthDays'] = messages.monthDays;
    }
    if (draft.monthlyForm === 'weekdays' && !draft.monthWeekdays.length) {
      errors['schedule.monthWeekdays'] = messages.monthWeekdays;
    }
  }
  if (!DATE.test(draft.startDate)) errors['schedule.startDate'] = messages.startDate;
  let end: Pick<SchedulePlan, 'durationWeeks' | 'durationMonths' | 'endDate'> = {};
  if (draft.endMode === 'weeks') {
    const value = integerIn(draft.durationWeeks, MAX_DURATION_WEEKS);
    if (value === null) errors['schedule.durationWeeks'] = messages.durationWeeks;
    else end = { durationWeeks: value };
  } else if (draft.endMode === 'months') {
    const value = integerIn(draft.durationMonths, MAX_DURATION_MONTHS);
    if (value === null) errors['schedule.durationMonths'] = messages.durationMonths;
    else end = { durationMonths: value };
  } else if (!DATE.test(draft.endDate) || (DATE.test(draft.startDate) && draft.endDate < draft.startDate)) {
    errors['schedule.endDate'] = messages.endDate;
  } else {
    end = { endDate: draft.endDate };
  }
  if (Object.keys(errors).length) return { errors };

  const recurring = { ...common, startDate: draft.startDate, ...end };
  if (draft.kind === 'weekly') {
    const weekdays = WEEKDAYS.filter((day) => draft.weekdays.includes(day));
    return { plan: { kind: 'weekly', weekdays, everyWeeks: draft.everyWeeks, ...recurring } };
  }
  return draft.monthlyForm === 'days'
    ? { plan: { kind: 'monthly', monthDays: [...draft.monthDays].sort((a, b) => a - b), ...recurring } }
    : { plan: { kind: 'monthly', monthWeekdays: draft.monthWeekdays, ...recurring } };
}

/** Saisie reprise d'un programme existant (demande, devis), pour le modifier. */
export function draftFromPlan(plan: SchedulePlanView): ScheduleDraft {
  const draft = emptySchedule();
  const kind = SCHEDULE_KINDS.find((value) => value === plan.kind) ?? null;
  return {
    ...draft,
    kind,
    startTime: plan.startTime,
    dates: plan.dates ?? [],
    weekdays: (plan.weekdays ?? []).filter((day): day is Weekday => WEEKDAYS.includes(day as Weekday)),
    everyWeeks: plan.everyWeeks ?? 1,
    monthlyForm: plan.monthWeekdays?.length ? 'weekdays' : 'days',
    monthDays: plan.monthDays ?? [],
    monthWeekdays: (plan.monthWeekdays ?? []).flatMap((item) =>
      MONTH_RANKS.includes(item.rank as MonthRank) && WEEKDAYS.includes(item.weekday as Weekday)
        ? [{ rank: item.rank as MonthRank, weekday: item.weekday as Weekday }]
        : [],
    ),
    startDate: plan.startDate ?? '',
    endMode: plan.endDate ? 'date' : plan.durationWeeks ? 'weeks' : 'months',
    durationWeeks: plan.durationWeeks ? String(plan.durationWeeks) : '',
    durationMonths: plan.durationMonths ? String(plan.durationMonths) : '',
    endDate: plan.endDate ?? '',
    excludeHolidays: plan.excludeHolidays ?? true,
    excludedDates: plan.excludedDates ?? [],
  };
}

/* ——— Lecture du programme en français ——— */

export const WEEKDAY_LABELS: Record<Weekday, string> = {
  mon: 'lundi',
  tue: 'mardi',
  wed: 'mercredi',
  thu: 'jeudi',
  fri: 'vendredi',
  sat: 'samedi',
  sun: 'dimanche',
};

export const MONTH_RANK_LABELS: Record<MonthRank, string> = {
  first: 'premier',
  second: 'deuxième',
  third: 'troisième',
  fourth: 'quatrième',
  last: 'dernier',
};

function list(items: string[]): string {
  if (items.length <= 1) return items.join('');
  return `${items.slice(0, -1).join(', ')} et ${items[items.length - 1]}`;
}

/** Date `AAAA-MM-JJ` (jour du Bénin) → « 5 janvier 2027 ». */
export function formatDay(date: string): string {
  return formatShortDate(`${date}T12:00:00+01:00`);
}

/** « Chaque lundi et jeudi, à 08:00, à partir du 4 janvier 2027, pendant 12 semaines ». */
export function describeSchedule(plan: SchedulePlanView): string {
  const time = `à ${plan.startTime}`;
  if (plan.kind === 'one_off') {
    const dates = plan.dates ?? [];
    if (dates.length === 1 && dates[0]) return `Une séance le ${formatDay(dates[0])}, ${time}`;
    return `${dates.length} séances ponctuelles, ${time}`;
  }
  let rhythm: string;
  if (plan.kind === 'weekly') {
    const days = list((plan.weekdays ?? []).map((day) => WEEKDAY_LABELS[day as Weekday] ?? day));
    const every = plan.everyWeeks && plan.everyWeeks > 1 ? `, toutes les ${plan.everyWeeks} semaines` : '';
    rhythm = `Chaque ${days}${every}`;
  } else if (plan.monthWeekdays?.length) {
    const items = plan.monthWeekdays.map(
      (item) =>
        `${MONTH_RANK_LABELS[item.rank as MonthRank] ?? item.rank} ${WEEKDAY_LABELS[item.weekday as Weekday] ?? item.weekday}`,
    );
    rhythm = `Chaque mois, le ${list(items)}`;
  } else {
    rhythm = `Chaque mois, le ${list((plan.monthDays ?? []).map(String))}`;
  }
  const start = plan.startDate ? `, à partir du ${formatDay(plan.startDate)}` : '';
  const end = plan.endDate
    ? ` jusqu’au ${formatDay(plan.endDate)}`
    : plan.durationWeeks
      ? `, pendant ${plan.durationWeeks} semaine${plan.durationWeeks > 1 ? 's' : ''}`
      : plan.durationMonths
        ? `, pendant ${plan.durationMonths} mois`
        : '';
  return `${rhythm}, ${time}${start}${end}`;
}
