import { beninDate } from '@/lib/format';
import type {
  AnswerSet,
  EstimateInput,
  GeoLocationInput,
  PlaceItemInput,
  QuoteGroupInput,
  ScheduleInput,
  Weekday,
} from './api';
import { journeyTexts, servedLine } from './journey-texts';
import type { FormField, PlaceCatalog, PlaceService, PlaceType, Schedule, ServedZone } from './schemas';

/*
 * Parcours « demande de devis par lieu » (ADR-034), sans React : brouillon, contrôle de forme des
 * réponses et construction des corps envoyés à la gateway. Les règles (prix, bornes en vigueur, zones,
 * délais, dates des passages) restent celles de la gateway : ici, seulement ce qui évite un aller-retour
 * inutile. Aucun prix ni aucune date de passage n'est calculé par le front.
 */

/** Étapes de saisie (la confirmation suit, hors du fil de progression). */
export const STEPS = ['place', 'services', 'address', 'schedule', 'review'] as const;
export type StepName = (typeof STEPS)[number];
export const CONFIRMATION_STEP = STEPS.length;
/** Étape des passages (plan, ADR-052). */
export const SCHEDULE_STEP = STEPS.indexOf('schedule');

/** Limites du contrat (`RequestCleaningQuoteGroupRequest`). */
export const MAX_SERVICES = 10;
export const MAX_LANDMARK = 500;
export const MAX_COMMENT = 2000;
const MAX_NUMBER = 1_000_000;
/** Délai minimum avant une intervention (48 heures, réglage de la gateway) : dates à partir de J+2. */
export const LEAD_DAYS = 2;
/** Choix « Autre commune » : hors zone d'intervention. */
export const OTHER_COMMUNE = 'other';
/**
 * `location` est obligatoire dans `RequestCleaningQuoteGroupRequest` : sans position GPS, la demande ne
 * part pas. Saisie manuelle seule = évolution du contrat (à valider).
 */
export const POSITION_REQUIRED = true;

/** Saisie brute d'un champ : texte d'un nombre, code d'une valeur, `yes` ou `no` ; `''` sans réponse. */
export type RawAnswers = Record<string, string>;

/** Réponses à une prestation. Sa fréquence de prix n'est plus demandée : elle suit le plan (`frequencyFor`). */
export interface ServiceDraft {
  fields: RawAnswers;
  /** Options cochées (clé = code de l'option) et réponses à leurs champs. */
  options: Record<string, RawAnswers>;
}

export interface AddressDraft {
  location: GeoLocationInput | null;
  /** Commune retrouvée par la gateway (client connecté) ; null tant qu'elle n'est pas demandée. */
  resolved: { commune: string | null; served: boolean; displayAddress: string | null } | null;
  /** Commune choisie dans la liste (repli) : nom de la zone, `other`, ou `''`. */
  commune: string;
  district: string;
  landmark: string;
}

/** Mode du plan de passages (`CleaningScheduleInput.mode`). */
export type ScheduleMode = ScheduleInput['mode'];
export const SCHEDULE_MODES: ReadonlyArray<ScheduleMode> = ['dates', 'weekly', 'monthly'];
/** Lundi d'abord, comme la semaine au Bénin. */
export const WEEKDAYS: ReadonlyArray<Weekday> = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
/** Rang du jour de semaine dans le mois : 1ᵉʳ à 4ᵉ, ou dernier. */
export type WeekOfMonth = 1 | 2 | 3 | 4 | 'last';
export const WEEKS_OF_MONTH: ReadonlyArray<WeekOfMonth> = [1, 2, 3, 4, 'last'];
/** Rythme hebdomadaire : chaque semaine (1) jusqu'à toutes les 12 semaines (contrat). */
export const MAX_EVERY_WEEKS = 12;
/** Forme du plan mensuel : des jours du mois, ou un jour de la semaine à un rang du mois. */
export type MonthlyForm = 'monthDays' | 'weekdays';
/** Période : 3, 6 ou 12 mois depuis le début (raccourcis), ou jusqu'à une date choisie. */
export type PeriodLength = '3' | '6' | '12' | 'until';
export const PERIOD_LENGTHS: ReadonlyArray<PeriodLength> = ['3', '6', '12', 'until'];

/**
 * Saisie du plan de passages (ADR-052). Les champs de tous les modes sont gardés pendant la saisie (changer
 * de mode ne perd rien) ; seuls ceux du mode choisi sont envoyés (`scheduleInputOf`).
 */
export interface ScheduleDraft {
  mode: ScheduleMode | null;
  /** Mode `dates` : jours cochés. */
  dates: string[];
  /** Modes `weekly` et `monthly` : début de la période, et sa durée ou sa fin. */
  startDate: string;
  period: PeriodLength | null;
  endDate: string;
  /** `weekly`, ou `monthly` par jour de semaine. */
  weekdays: Weekday[];
  everyWeeks: number;
  monthlyForm: MonthlyForm;
  monthDays: number[];
  weeksOfMonth: WeekOfMonth[];
  /** Heure de début de chaque passage, `HH:mm`, heure du Bénin. */
  startTime: string;
  excludedDates: string[];
  extraDates: string[];
}

export interface JourneyDraft {
  version: 2;
  step: number;
  placeType: string | null;
  /** Prestations cochées, dans l'ordre du lieu. */
  services: string[];
  answers: Record<string, ServiceDraft>;
  address: AddressDraft;
  schedule: ScheduleDraft;
  comment: string;
}

/** Erreurs par clé de champ (`services`, `house_cleaning.fields.surface`, `schedule.weekdays`…). */
export type JourneyErrors = Record<string, string>;

export function emptySchedule(): ScheduleDraft {
  return {
    mode: null,
    dates: [],
    startDate: '',
    period: null,
    endDate: '',
    weekdays: [],
    everyWeeks: 1,
    monthlyForm: 'monthDays',
    monthDays: [],
    weeksOfMonth: [],
    startTime: '',
    excludedDates: [],
    extraDates: [],
  };
}

export function emptyDraft(placeType: string | null = null): JourneyDraft {
  return {
    version: 2,
    step: 0,
    placeType,
    services: [],
    answers: {},
    address: { location: null, resolved: null, commune: '', district: '', landmark: '' },
    schedule: emptySchedule(),
    comment: '',
  };
}

export const emptyServiceDraft = (): ServiceDraft => ({ fields: {}, options: {} });

/** Identifiant HTML d'un champ d'après sa clé d'erreur : le focus va au premier champ en erreur. */
export const fieldId = (key: string) => `demande-${key.replace(/[^a-zA-Z0-9_-]/g, '-')}`;

// --- Catalogue ---------------------------------------------------------------------------------------

export function placeOf(catalog: PlaceCatalog, code: string | null): PlaceType | undefined {
  return code ? catalog.placeTypes.find((place) => place.code === code) : undefined;
}

/** Prestations proposées par un lieu, dans son ordre (une prestation absente du catalogue est ignorée). */
export function servicesOf(catalog: PlaceCatalog, place: PlaceType | undefined): PlaceService[] {
  if (!place) return [];
  return place.serviceCodes
    .map((code) => catalog.services.find((service) => service.code === code))
    .filter((service): service is PlaceService => !!service);
}

/** Lieux qui proposent au moins une prestation connue (le catalogue public masque déjà les autres). */
export function visiblePlaces(catalog: PlaceCatalog): PlaceType[] {
  return [...catalog.placeTypes]
    .filter((place) => servicesOf(catalog, place).length > 0)
    .sort((a, b) => a.displayOrder - b.displayOrder);
}

/** Change de lieu : les prestations qui ne sont plus proposées sont retirées, leurs réponses gardées. */
export function withPlace(draft: JourneyDraft, catalog: PlaceCatalog, code: string): JourneyDraft {
  const offered = new Set(servicesOf(catalog, placeOf(catalog, code)).map((service) => service.code));
  return { ...draft, placeType: code, services: draft.services.filter((service) => offered.has(service)) };
}

/** Coche ou décoche une prestation, en gardant l'ordre du lieu. */
export function toggleService(draft: JourneyDraft, catalog: PlaceCatalog, code: string): JourneyDraft {
  const order = servicesOf(catalog, placeOf(catalog, draft.placeType)).map((service) => service.code);
  const selected = draft.services.includes(code)
    ? draft.services.filter((service) => service !== code)
    : [...draft.services, code];
  return {
    ...draft,
    services: order.filter((service) => selected.includes(service)),
    answers: draft.answers[code] ? draft.answers : { ...draft.answers, [code]: emptyServiceDraft() },
  };
}

// --- Réponses ----------------------------------------------------------------------------------------

/** Bornes effectives d'un champ `number` (le contrat accepte 0 à 1 000 000). */
export function boundsOf(field: FormField): { min: number; max: number } {
  return { min: field.min ?? 0, max: field.max ?? MAX_NUMBER };
}

/** Contrôle les réponses aux champs d'un formulaire ; les clés d'erreur sont préfixées par `prefix`. */
export function checkFields(
  fields: ReadonlyArray<FormField>,
  raw: RawAnswers,
  prefix: string,
): { answers: AnswerSet; errors: JourneyErrors } {
  const t = journeyTexts.fieldErrors;
  const answers: AnswerSet = {};
  const errors: JourneyErrors = {};
  for (const field of fields) {
    const key = `${prefix}.${field.code}`;
    const value = (raw[field.code] ?? '').trim();
    if (field.type === 'number') {
      if (!value) {
        if (field.required) errors[key] = t.required;
        continue;
      }
      if (!/^\d{1,7}$/.test(value)) {
        errors[key] = t.integer;
        continue;
      }
      const number = Number(value);
      const { min, max } = boundsOf(field);
      if (number < min || number > max) errors[key] = t.range(min, max);
      else answers[field.code] = number;
    } else if (field.type === 'choice') {
      const known = field.choices.some((choice) => choice.code === value);
      if (known) answers[field.code] = value;
      else if (field.required) errors[key] = t.choose;
    } else if (field.type === 'boolean') {
      if (value === 'yes' || value === 'no') answers[field.code] = value === 'yes';
      else if (field.required) errors[key] = t.choose;
    }
    // Type inconnu (ajouté par la gateway après ce front) : non affiché, non envoyé.
  }
  return { answers, errors };
}

/** Code de fréquence attendu pour chaque mode du plan (codes de départ du catalogue, ADR-033 point 11). */
const FREQUENCY_OF_MODE: Record<ScheduleMode, string> = {
  dates: 'once',
  weekly: 'weekly',
  monthly: 'monthly',
};
/** Fréquence de repli : le prix d'un passage ponctuel, sans remise de régularité supposée. */
const PRUDENT_FREQUENCY = 'once';

/**
 * Fréquence de prix d'une prestation (ADR-033), déduite du plan au lieu d'être demandée : `weekly` pour un
 * plan hebdomadaire, `monthly` pour un plan mensuel, `once` pour des dates précises ou tant que le plan
 * n'est pas choisi. Si la prestation n'a pas ce code, repli prudent sur `once`, sinon sa première
 * fréquence. `undefined` si la prestation n'a pas de fréquence (le champ doit alors être absent).
 * À valider : des dates précises (même nombreuses) restent au tarif `once`.
 */
export function frequencyFor(service: PlaceService, mode: ScheduleMode | null): string | undefined {
  const codes = service.form.frequencies.map((item) => item.code);
  if (!codes.length) return undefined;
  const wanted = mode ? FREQUENCY_OF_MODE[mode] : PRUDENT_FREQUENCY;
  if (codes.includes(wanted)) return wanted;
  return codes.includes(PRUDENT_FREQUENCY) ? PRUDENT_FREQUENCY : codes[0];
}

/** Une prestation au format du contrat (`CleaningPlaceItem`), ou ses erreurs. */
export function serviceItem(
  service: PlaceService,
  draft: ServiceDraft | undefined,
  mode: ScheduleMode | null = null,
): { item: PlaceItemInput | null; errors: JourneyErrors } {
  const current = draft ?? emptyServiceDraft();
  const { answers, errors } = checkFields(service.form.fields, current.fields, `${service.code}.fields`);
  const options: PlaceItemInput['options'] = [];
  for (const option of service.form.options) {
    const raw = current.options[option.code];
    if (!raw) continue;
    const checked = checkFields(option.fields, raw, `${service.code}.options.${option.code}`);
    Object.assign(errors, checked.errors);
    options.push({ code: option.code, answers: checked.answers });
  }
  const frequency = frequencyFor(service, mode);
  if (Object.keys(errors).length) return { item: null, errors };
  return {
    item: { serviceCode: service.code, answers, options, ...(frequency ? { frequency } : {}) },
    errors,
  };
}

/** Prestations cochées : celles qui sont complètes, et les erreurs des autres. */
export function itemsOf(
  catalog: PlaceCatalog,
  draft: JourneyDraft,
): { items: PlaceItemInput[]; errors: JourneyErrors; incomplete: string[] } {
  const services = servicesOf(catalog, placeOf(catalog, draft.placeType)).filter((service) =>
    draft.services.includes(service.code),
  );
  const items: PlaceItemInput[] = [];
  const errors: JourneyErrors = {};
  const incomplete: string[] = [];
  for (const service of services) {
    const result = serviceItem(service, draft.answers[service.code], draft.schedule.mode);
    if (result.item) items.push(result.item);
    else {
      incomplete.push(service.code);
      Object.assign(errors, result.errors);
    }
  }
  return { items, errors, incomplete };
}

/**
 * Corps de l'estimation : seulement les prestations complètes (une seule réponse invalide ferait
 * refuser toute l'estimation). `null` s'il n'y a rien à estimer.
 */
export function estimateInput(
  catalog: PlaceCatalog,
  draft: JourneyDraft,
  commune: string | null,
): EstimateInput | null {
  if (!draft.placeType) return null;
  const { items } = itemsOf(catalog, draft);
  if (!items.length) return null;
  return { placeType: draft.placeType, ...(commune ? { commune } : {}), items };
}

// --- Adresse -----------------------------------------------------------------------------------------

export function zoneByName(zones: ReadonlyArray<ServedZone>, commune: string | null | undefined) {
  if (!commune) return undefined;
  return zones.find((zone) => zone.commune === commune || zone.code === commune);
}

/** Commune connue du lieu : celle retrouvée par la position si elle est desservie, sinon celle choisie. */
export function communeOf(address: AddressDraft, zones: ReadonlyArray<ServedZone>): string | null {
  if (address.resolved?.served && address.resolved.commune) return address.resolved.commune;
  return zoneByName(zones, address.commune)?.commune ?? null;
}

/** Commune hors zone (retrouvée par la position, ou « Autre commune » choisie) ; `null` sinon. */
export function outOfZone(address: AddressDraft): { commune: string | null } | null {
  if (address.resolved && address.resolved.commune && !address.resolved.served) {
    return { commune: address.resolved.commune };
  }
  if (address.commune === OTHER_COMMUNE && !address.resolved?.served) return { commune: null };
  return null;
}

/** Point de repère envoyé (il tient aussi lieu d'adresse d'intervention) : « Quartier — repère ». */
export function landmarkOf(address: AddressDraft): string {
  const district = address.district.trim();
  const landmark = address.landmark.trim();
  return district && landmark ? `${district} — ${landmark}` : landmark;
}

export function checkAddress(address: AddressDraft, zones: ReadonlyArray<ServedZone>): JourneyErrors {
  const t = journeyTexts.address;
  const errors: JourneyErrors = {};
  if (POSITION_REQUIRED && !address.location) errors['address.location'] = t.positionRequired;
  const away = outOfZone(address);
  if (away) {
    errors['address.commune'] = t.outOfZone(away.commune, servedLine(zones.map((zone) => zone.commune)));
  } else if (!communeOf(address, zones) && !address.resolved?.served) {
    errors['address.commune'] = t.communeRequired;
  }
  if (!address.landmark.trim()) errors['address.landmark'] = t.landmarkRequired;
  else if (landmarkOf(address).length > MAX_LANDMARK)
    errors['address.landmark'] = t.landmarkTooLong(MAX_LANDMARK);
  return errors;
}

// --- Passages (plan, ADR-052) ------------------------------------------------------------------------

/**
 * Premier jour proposé au calendrier, au Bénin (J+2, délai minimum de 48 h). Simple aide à la saisie : la
 * gateway reste seule juge du délai (`CLEANING_LEAD_TIME_TOO_SHORT`, affiché sous le champ).
 */
export function firstAllowedDate(now: Date = new Date()): string {
  return beninDate(now, LEAD_DAYS);
}

const DAY = /^\d{4}-\d{2}-\d{2}$/;
const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;
const DAY_MS = 86_400_000;

/** Jour civil valide `AAAA-MM-JJ` (le 2027-02-30 est refusé). */
export function isDay(value: string): boolean {
  if (!DAY.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

/**
 * Fin d'une période de `months` mois commencée le `start` (bornes incluses) : la veille du même jour
 * `months` mois plus tard. « 1 an » depuis le 2027-01-01 finit le 2027-12-31. Sert seulement à remplir
 * `endDate` depuis les raccourcis de durée : les dates des passages viennent de l'aperçu de la gateway.
 */
export function periodEnd(start: string, months: number): string {
  const [year, month, day] = start.split('-').map(Number) as [number, number, number];
  const target = new Date(Date.UTC(year, month - 1 + months, 1));
  const length = new Date(Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0)).getUTCDate();
  const same = Date.UTC(target.getUTCFullYear(), target.getUTCMonth(), Math.min(day, length));
  return new Date(same - DAY_MS).toISOString().slice(0, 10);
}

/** Fin de la période saisie : raccourci de durée, ou date choisie ; `''` si elle manque. */
export function endDateOf(schedule: ScheduleDraft): string {
  if (!isDay(schedule.startDate) || !schedule.period) return '';
  return schedule.period === 'until'
    ? schedule.endDate
    : periodEnd(schedule.startDate, Number(schedule.period));
}

const sortedDays = (days: ReadonlyArray<string>) => [...new Set(days)].filter(isDay).sort();
const byWeek = (days: ReadonlyArray<Weekday>) => WEEKDAYS.filter((day) => days.includes(day));
const byRank = (ranks: ReadonlyArray<WeekOfMonth>) => WEEKS_OF_MONTH.filter((rank) => ranks.includes(rank));

/** Clé d'erreur du délai minimum : le calendrier en mode `dates`, la date de début sinon. */
export function leadTimeKey(mode: ScheduleMode | null): string {
  return mode === 'dates' ? 'schedule.dates' : 'schedule.startDate';
}

/** Champs du plan que la gateway peut nommer (`details.field` : `schedule.<champ>`). */
const SCHEDULE_FIELDS = new Set([
  'mode',
  'dates',
  'startDate',
  'endDate',
  'weekdays',
  'everyWeeks',
  'monthDays',
  'weeksOfMonth',
  'startTime',
  'excludedDates',
  'extraDates',
]);

/**
 * Clé d'erreur du parcours pour un champ du plan nommé par la gateway : `schedule.weekdays[0]` →
 * `schedule.weekdays` ; `weekdays` (corps de l'aperçu) aussi ; `schedule` seul ou un champ inconnu →
 * `schedule` (plan sans passage ou trop chargé, affiché avec l'aperçu).
 */
export function scheduleErrorKey(field: string): string {
  const name = field.replace(/^schedule\.?/, '').replace(/[[.].*$/, '');
  return SCHEDULE_FIELDS.has(name) ? `schedule.${name}` : 'schedule';
}

/** Contrôle de forme du plan : ce qui manque pour demander l'aperçu (les règles restent à la gateway). */
export function checkSchedule(schedule: ScheduleDraft, now: Date = new Date()): JourneyErrors {
  const t = journeyTexts.schedule.errors;
  const errors: JourneyErrors = {};
  if (!schedule.mode) return { 'schedule.mode': t.mode };
  if (schedule.mode === 'dates') {
    const days = sortedDays(schedule.dates);
    // Jour passé ou trop proche (brouillon repris plus tard) : le calendrier ne le propose plus.
    const minDate = firstAllowedDate(now);
    if (!days.length) errors['schedule.dates'] = t.dates;
    else if (days[0]! < minDate) errors['schedule.dates'] = t.tooEarly(minDate);
  } else {
    if (!isDay(schedule.startDate)) errors['schedule.startDate'] = t.startDate;
    else if (!schedule.period) errors['schedule.endDate'] = t.period;
    else if (schedule.period === 'until') {
      if (!isDay(schedule.endDate)) errors['schedule.endDate'] = t.endDate;
      else if (schedule.endDate < schedule.startDate) errors['schedule.endDate'] = t.endBeforeStart;
    }
    if (schedule.mode === 'weekly' || schedule.monthlyForm === 'weekdays') {
      if (!schedule.weekdays.length) errors['schedule.weekdays'] = t.weekdays;
    }
    if (schedule.mode === 'monthly' && schedule.monthlyForm === 'monthDays' && !schedule.monthDays.length) {
      errors['schedule.monthDays'] = t.monthDays;
    }
    if (schedule.mode === 'monthly' && schedule.monthlyForm === 'weekdays' && !schedule.weeksOfMonth.length) {
      errors['schedule.weeksOfMonth'] = t.weeksOfMonth;
    }
  }
  if (!TIME.test(schedule.startTime)) errors['schedule.startTime'] = t.startTime;
  return errors;
}

/**
 * Plan au format du contrat (`CleaningScheduleInput`), avec **seulement** les champs du mode choisi (la
 * gateway refuse un champ d'un autre mode) ; `null` tant qu'il est incomplet. Jamais de `recurrence`.
 */
export function scheduleInputOf(schedule: ScheduleDraft, now: Date = new Date()): ScheduleInput | null {
  if (!schedule.mode || Object.keys(checkSchedule(schedule, now)).length) return null;
  const excluded = sortedDays(schedule.excludedDates);
  const extra = sortedDays(schedule.extraDates);
  const adjust = {
    ...(excluded.length ? { excludedDates: excluded } : {}),
    ...(extra.length ? { extraDates: extra } : {}),
  };
  const { startTime } = schedule;
  if (schedule.mode === 'dates') {
    return { mode: 'dates', dates: sortedDays(schedule.dates), startTime, ...adjust };
  }
  const period = { startDate: schedule.startDate, endDate: endDateOf(schedule) };
  if (schedule.mode === 'weekly') {
    const everyWeeks = Math.min(MAX_EVERY_WEEKS, Math.max(1, Math.trunc(schedule.everyWeeks) || 1));
    return {
      mode: 'weekly',
      ...period,
      weekdays: byWeek(schedule.weekdays),
      ...(everyWeeks > 1 ? { everyWeeks } : {}),
      startTime,
      ...adjust,
    };
  }
  if (schedule.monthlyForm === 'monthDays') {
    const monthDays = [...new Set(schedule.monthDays)].sort((a, b) => a - b);
    return { mode: 'monthly', ...period, monthDays, startTime, ...adjust };
  }
  return {
    mode: 'monthly',
    ...period,
    weekdays: byWeek(schedule.weekdays),
    weeksOfMonth: byRank(schedule.weeksOfMonth),
    startTime,
    ...adjust,
  };
}

/** Plan envoyé, à la forme d'un plan enregistré (`CleaningSchedule`) : pour son résumé et son calendrier. */
export function scheduleOf(input: ScheduleInput): Schedule {
  return {
    mode: input.mode,
    dates: input.mode === 'dates' ? input.dates : [],
    startDate: input.mode === 'dates' ? null : input.startDate,
    endDate: input.mode === 'dates' ? null : input.endDate,
    weekdays: input.mode === 'dates' ? [] : (input.weekdays ?? []),
    everyWeeks: input.mode === 'weekly' ? (input.everyWeeks ?? 1) : 1,
    monthDays: input.mode === 'monthly' ? (input.monthDays ?? []) : [],
    weeksOfMonth: input.mode === 'monthly' ? (input.weeksOfMonth ?? []) : [],
    startTime: input.startTime,
    excludedDates: input.excludedDates ?? [],
    extraDates: input.extraDates ?? [],
  };
}

/** Erreurs de l'étape des passages : plan incomplet, commentaire trop long. */
export function checkScheduleStep(draft: JourneyDraft, now: Date = new Date()): JourneyErrors {
  const errors = checkSchedule(draft.schedule, now);
  if (draft.comment.trim().length > MAX_COMMENT) {
    errors['comment'] = journeyTexts.schedule.commentTooLong(MAX_COMMENT);
  }
  return errors;
}

// --- Étapes ------------------------------------------------------------------------------------------

/** Erreurs d'une étape de saisie (0 à 3 ; le récapitulatif n'a pas de champ propre). */
export function stepErrors(
  step: number,
  draft: JourneyDraft,
  catalog: PlaceCatalog,
  zones: ReadonlyArray<ServedZone>,
  now: Date = new Date(),
): JourneyErrors {
  switch (STEPS[step]) {
    case 'place':
      return placeOf(catalog, draft.placeType) ? {} : { place: journeyTexts.place.required };
    case 'services': {
      if (!draft.services.length) return { services: journeyTexts.services.required };
      if (draft.services.length > MAX_SERVICES) {
        return { services: journeyTexts.services.tooMany(MAX_SERVICES) };
      }
      return itemsOf(catalog, draft).errors;
    }
    case 'address':
      return checkAddress(draft.address, zones);
    case 'schedule':
      return checkScheduleStep(draft, now);
    default:
      return {};
  }
}

/** Première étape incomplète avant `step` (reprise d'un brouillon, envoi) ; `step` si tout va bien. */
export function firstInvalidStep(
  step: number,
  draft: JourneyDraft,
  catalog: PlaceCatalog,
  zones: ReadonlyArray<ServedZone>,
  now: Date = new Date(),
): number {
  for (let index = 0; index < Math.min(step, STEPS.length - 1); index += 1) {
    if (Object.keys(stepErrors(index, draft, catalog, zones, now)).length) return index;
  }
  return Math.min(step, STEPS.length - 1);
}

/** Corps de la demande groupée, ou la première étape à corriger. */
export function buildGroupInput(
  draft: JourneyDraft,
  catalog: PlaceCatalog,
  zones: ReadonlyArray<ServedZone>,
  now: Date = new Date(),
): { input: QuoteGroupInput; invalidStep: null } | { input: null; invalidStep: number } {
  const invalid = firstInvalidStep(STEPS.length - 1, draft, catalog, zones, now);
  const { items } = itemsOf(catalog, draft);
  const location = draft.address.location;
  const schedule = scheduleInputOf(draft.schedule, now);
  if (invalid < STEPS.length - 1 || !draft.placeType || !items.length || !location || !schedule) {
    return { input: null, invalidStep: Math.min(invalid, STEPS.length - 2) };
  }
  const commune = communeOf(draft.address, zones);
  const comment = draft.comment.trim();
  return {
    invalidStep: null,
    // Avec un plan, pas de créneaux souhaités (le premier passage en tient lieu) ni de `recurrence`.
    input: {
      placeType: draft.placeType,
      location,
      landmark: landmarkOf(draft.address),
      ...(commune ? { commune } : {}),
      items,
      schedule,
      ...(comment ? { comment } : {}),
    },
  };
}

/**
 * Champ du contrat en cause dans une erreur de la gateway (`details.field`) → étape et clé d'erreur du
 * parcours. `items[1].options[0].answers.window_count` désigne la 2ᵉ prestation envoyée, sa 1ʳᵉ option.
 */
export function locateContractField(
  field: string,
  items: ReadonlyArray<PlaceItemInput>,
): { step: number; key: string } | null {
  const item =
    /^items\[(\d+)\](?:\.(answers|options|frequency)(?:\[(\d+)\])?(?:\.answers)?(?:\.([a-z][a-z0-9_]*))?)?/.exec(
      field,
    );
  if (item) {
    const service = items[Number(item[1])];
    if (!service) return { step: 1, key: 'services' };
    const [, , part, optionIndex, code] = item;
    // La fréquence de prix suit le plan : c'est lui qu'il faut revoir.
    if (part === 'frequency') return { step: SCHEDULE_STEP, key: 'schedule.mode' };
    if (part === 'answers' && code) return { step: 1, key: `${service.serviceCode}.fields.${code}` };
    const option = optionIndex !== undefined ? service.options[Number(optionIndex)] : undefined;
    if (part === 'options' && option && code) {
      return { step: 1, key: `${service.serviceCode}.options.${option.code}.${code}` };
    }
    return { step: 1, key: 'services' };
  }
  const root = field.replace(/[[.].*$/, '');
  if (root === 'placeType') return { step: 0, key: 'place' };
  if (root === 'location') return { step: 2, key: 'address.location' };
  if (root === 'landmark') return { step: 2, key: 'address.landmark' };
  if (root === 'commune') return { step: 2, key: 'address.commune' };
  if (root === 'schedule') return { step: SCHEDULE_STEP, key: scheduleErrorKey(field) };
  if (root === 'preferredSlots') return { step: SCHEDULE_STEP, key: 'schedule' };
  if (root === 'comment') return { step: SCHEDULE_STEP, key: 'comment' };
  return null;
}

// --- Brouillon ---------------------------------------------------------------------------------------

/**
 * Brouillon gardé dans `sessionStorage` (onglet en cours seulement) : il survit à un rafraîchissement
 * et à la connexion, et il est vidé après l'envoi. Stockage indisponible (navigation privée, quota) :
 * le parcours fonctionne sans.
 */
export const DRAFT_KEY = 'ksp:nettoyage:demande';

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);
const isStrings = (value: unknown): value is Record<string, string> =>
  isRecord(value) && Object.values(value).every((item) => typeof item === 'string');
const isNumber = (value: unknown, min: number, max: number): value is number =>
  typeof value === 'number' && Number.isFinite(value) && value >= min && value <= max;

function readLocation(value: unknown): GeoLocationInput | null {
  if (!isRecord(value)) return null;
  const { latitude, longitude, accuracyMeters } = value;
  if (!isNumber(latitude, -90, 90) || !isNumber(longitude, -180, 180)) return null;
  return {
    latitude,
    longitude,
    ...(isNumber(accuracyMeters, 0, 100_000) ? { accuracyMeters } : {}),
  };
}

/** Réponses d'une prestation ; la fréquence d'un brouillon v1 est ignorée (elle suit désormais le plan). */
function readServiceDraft(value: unknown): ServiceDraft | null {
  if (!isRecord(value) || !isStrings(value.fields)) return null;
  if (!isRecord(value.options) || !Object.values(value.options).every(isStrings)) return null;
  return { fields: value.fields, options: value.options as Record<string, RawAnswers> };
}

const MAX_DRAFT_DAYS = 1000;

function readDays(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.filter((item): item is string => typeof item === 'string' && isDay(item)))]
    .sort()
    .slice(0, MAX_DRAFT_DAYS);
}

function readOneOf<T>(value: unknown, allowed: ReadonlyArray<T>, fallback: T): T {
  return allowed.includes(value as T) ? (value as T) : fallback;
}

/** Plan d'un brouillon v2 : chaque champ altéré reprend sa valeur vide, sans tout perdre. */
function readSchedule(value: unknown): ScheduleDraft {
  const empty = emptySchedule();
  if (!isRecord(value)) return empty;
  const text = (item: unknown) => (typeof item === 'string' ? item : '');
  const every = value.everyWeeks;
  const weekdays: unknown[] = Array.isArray(value.weekdays) ? value.weekdays : [];
  const ranks: unknown[] = Array.isArray(value.weeksOfMonth) ? value.weeksOfMonth : [];
  return {
    mode: readOneOf<ScheduleMode | null>(value.mode, SCHEDULE_MODES, null),
    dates: readDays(value.dates),
    startDate: isDay(text(value.startDate)) ? text(value.startDate) : '',
    period: readOneOf<PeriodLength | null>(value.period, PERIOD_LENGTHS, null),
    endDate: isDay(text(value.endDate)) ? text(value.endDate) : '',
    weekdays: WEEKDAYS.filter((day) => weekdays.includes(day)),
    everyWeeks: isNumber(every, 1, MAX_EVERY_WEEKS) && Number.isInteger(every) ? every : empty.everyWeeks,
    monthlyForm: readOneOf<MonthlyForm>(value.monthlyForm, ['monthDays', 'weekdays'], 'monthDays'),
    monthDays: Array.isArray(value.monthDays)
      ? [...new Set(value.monthDays)].filter(
          (day): day is number => isNumber(day, 1, 31) && Number.isInteger(day),
        )
      : [],
    weeksOfMonth: WEEKS_OF_MONTH.filter((rank) => ranks.includes(rank)),
    startTime: TIME.test(text(value.startTime)) ? text(value.startTime) : '',
    excludedDates: readDays(value.excludedDates),
    extraDates: readDays(value.extraDates),
  };
}

/**
 * Relit un brouillon enregistré ; `null` s'il est absent, d'une version inconnue ou altéré.
 * Version 1 (créneaux souhaités, avant le plan de passages) : lieu, prestations, adresse et commentaire
 * sont repris ; les créneaux ne le sont pas (trois créneaux possibles pour une intervention ne sont pas
 * trois passages) : le client choisit ses passages à l'étape qui les remplace.
 */
export function parseDraft(text: string | null): JourneyDraft | null {
  if (!text) return null;
  let value: unknown;
  try {
    value = JSON.parse(text);
  } catch {
    return null;
  }
  if (!isRecord(value) || (value.version !== 1 && value.version !== 2)) return null;
  const { step, placeType, services, answers, address, comment } = value;
  if (!isNumber(step, 0, STEPS.length - 1) || !Number.isInteger(step)) return null;
  if (placeType !== null && typeof placeType !== 'string') return null;
  if (!Array.isArray(services) || !services.every((item) => typeof item === 'string')) return null;
  if (!isRecord(answers) || !isRecord(address) || typeof comment !== 'string') return null;
  const parsedAnswers: Record<string, ServiceDraft> = {};
  for (const [code, item] of Object.entries(answers)) {
    const parsed = readServiceDraft(item);
    if (parsed) parsedAnswers[code] = parsed;
  }
  const resolved = isRecord(address.resolved)
    ? {
        commune: typeof address.resolved.commune === 'string' ? address.resolved.commune : null,
        served: address.resolved.served === true,
        displayAddress:
          typeof address.resolved.displayAddress === 'string' ? address.resolved.displayAddress : null,
      }
    : null;
  const text_ = (item: unknown) => (typeof item === 'string' ? item : '');
  const location = readLocation(address.location);
  return {
    version: 2,
    step,
    placeType,
    services: services.slice(0, MAX_SERVICES),
    answers: parsedAnswers,
    address: {
      location,
      // Une commune retrouvée n'a de sens qu'avec sa position.
      resolved: location ? resolved : null,
      commune: text_(address.commune),
      district: text_(address.district),
      landmark: text_(address.landmark),
    },
    schedule: value.version === 2 ? readSchedule(value.schedule) : emptySchedule(),
    comment,
  };
}

export function loadDraft(): JourneyDraft | null {
  try {
    return parseDraft(window.sessionStorage.getItem(DRAFT_KEY));
  } catch {
    return null;
  }
}

export function saveDraft(draft: JourneyDraft): void {
  try {
    window.sessionStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
  } catch {
    // Stockage indisponible : le brouillon n'est simplement pas gardé.
  }
}

export function clearDraft(): void {
  try {
    window.sessionStorage.removeItem(DRAFT_KEY);
  } catch {
    // Rien à faire.
  }
}

/** Un brouillon a-t-il des réponses à reprendre ? */
export function hasProgress(draft: JourneyDraft): boolean {
  return draft.step > 0 || draft.services.length > 0;
}
