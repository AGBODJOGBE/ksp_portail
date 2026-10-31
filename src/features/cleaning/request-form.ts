import type { QuoteRequestInput } from './api';
import type { SimulationDraft } from './draft';
import { beninDate, beninSlot, formatShortDate } from '@/lib/format';
import type { Recurrence } from './schemas';
import { cleaningTexts } from './texts';
import { OTHER_COMMUNE } from './zones';

/*
 * Saisie de la demande de devis : vérification de forme et construction du corps envoyé à la gateway.
 * Les règles (délai minimum, créneaux valides, zone) restent celles de la gateway : ici, seulement ce
 * qui évite un aller-retour inutile.
 */

/** Type de client du contexte actif de la session (`ActiveContext.type`), jamais choisi dans le formulaire. */
export type CustomerKind = 'individual' | 'business';
export type PeriodValue = (typeof cleaningTexts.periods)[number]['value'];

export interface SlotInput {
  date: string;
  period: PeriodValue;
}

export interface RequestFormValues {
  kind: CustomerKind;
  commune: string;
  address: string;
  slots: SlotInput[];
  visits: string;
  months: string;
  /** Entreprise : jours d'intervention par semaine (facultatif). */
  days: string;
  /** Nombre d'agents souhaité (facultatif). */
  team: string;
  comment: string;
}

export type RequestField = 'commune' | 'address' | 'slots' | 'recurrence' | 'days' | 'team';
export type RequestErrors = Partial<Record<RequestField, string>>;

export const MAX_SLOTS = 3;
/** Délai minimum avant une intervention (48 heures, réglage de la gateway) : la date proposée commence à J+2. */
export const LEAD_DAYS = 2;

/** Première date proposée, au Bénin. */
export function firstAllowedDate(now: Date = new Date()): string {
  return beninDate(now, LEAD_DAYS);
}

/**
 * Régularité d'un particulier qui demande une prestation hebdomadaire ou mensuelle. Une entreprise indique
 * plutôt ses jours d'intervention par semaine (`daysPerWeek`) : le contrat est établi avec le devis.
 */
export function recurrencePeriod(kind: CustomerKind, draft: SimulationDraft): Recurrence['period'] | null {
  if (kind === 'business') return null;
  if (draft.frequency === 'weekly') return 'week';
  if (draft.frequency === 'monthly') return 'month';
  return null;
}

/** Limite du contrat (`RequestCleaningQuoteRequest.requestedTeamSize`). */
export const MAX_TEAM_SIZE = 50;

const integerIn = (raw: string, min: number, max: number): number | null => {
  const value = /^\d{1,3}$/.test(raw.trim()) ? Number(raw.trim()) : NaN;
  return value >= min && value <= max ? value : null;
};

export function buildQuoteRequest(
  draft: SimulationDraft,
  values: RequestFormValues,
  now: Date = new Date(),
  /** Communes desservies mises en phrase, pour le message hors zone. */
  zonesText: string | null = null,
): { errors: RequestErrors; input: QuoteRequestInput | null } {
  const t = cleaningTexts.request;
  const errors: RequestErrors = {};

  const address = values.address.trim();
  if (!address) errors.address = t.addressRequired;

  const minDate = firstAllowedDate(now);
  const filled = values.slots.filter((slot) => slot.date);
  if (!filled.length) errors.slots = t.slotRequired;
  else if (filled.some((slot) => slot.date < minDate))
    errors.slots = t.slotTooEarly(formatShortDate(`${minDate}T12:00:00Z`));

  let recurrence: Recurrence | undefined;
  const period = recurrencePeriod(values.kind, draft);
  if (period && (values.visits.trim() || values.months.trim())) {
    const visitsPerPeriod = integerIn(values.visits, 1, period === 'week' ? 7 : 31);
    const durationMonths = integerIn(values.months, 1, 36);
    if (visitsPerPeriod === null || durationMonths === null) errors.recurrence = t.recurrenceInvalid;
    else recurrence = { period, visitsPerPeriod, durationMonths };
  }

  let daysPerWeek: number | undefined;
  if (values.kind === 'business' && values.days.trim()) {
    const days = integerIn(values.days, 1, 7);
    if (days === null) errors.days = t.daysInvalid;
    else daysPerWeek = days;
  }

  let requestedTeamSize: number | undefined;
  if (values.team.trim()) {
    const team = integerIn(values.team, 1, MAX_TEAM_SIZE);
    if (team === null) errors.team = t.teamSizeInvalid;
    else requestedTeamSize = team;
  }

  if (!values.commune || values.commune === OTHER_COMMUNE) errors.commune = t.outOfZone(zonesText);
  if (Object.keys(errors).length) return { errors, input: null };

  const periods = cleaningTexts.periods;
  const seen = new Set<string>();
  const preferredSlots = filled
    .map((slot) => {
      const range = periods.find((item) => item.value === slot.period) ?? periods[0];
      return beninSlot(slot.date, range.from, range.to);
    })
    .filter((slot) => !seen.has(slot.start) && seen.add(slot.start));

  const comment = values.comment.trim();
  return {
    errors,
    input: {
      serviceCode: draft.serviceCode,
      premisesType: draft.premisesType,
      quantity: draft.quantity,
      options: draft.options,
      commune: values.commune,
      address,
      preferredSlots,
      ...(comment ? { comment } : {}),
      ...(recurrence ? { recurrence } : {}),
      ...(requestedTeamSize ? { requestedTeamSize } : {}),
      ...(daysPerWeek ? { daysPerWeek } : {}),
    },
  };
}
