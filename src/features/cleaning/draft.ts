import { beninSlot } from '@/lib/format';
import type { SimulateBody, SubmitRequestBody, TimeSlotBody, ValuesBody } from './api';
import { type ScheduleDraft, buildSchedule, emptySchedule } from './schedule';
import type { CleaningValues, Parameter, PlaceTypeDetail } from './schemas';

/*
 * Brouillon de la demande de devis, partagé par le simulateur de `/nettoyage` et l'assistant de
 * `/nettoyage/demande`, gardé dans l'onglet (`sessionStorage`) le temps de la connexion. Contrôle de forme
 * des réponses et construction des corps envoyés : les règles (prix, zones, délais, dates) restent celles
 * de la gateway ; ici, seulement ce qui évite un aller-retour inutile.
 */

export const DRAFT_KEY = 'ksp.nettoyage.demande';
const DRAFT_VERSION = 1;

/** Étapes de l'assistant : publiques d'abord, puis connexion, puis celles du compte. */
export const STEPS = ['type', 'params', 'schedule', 'place', 'slots', 'details', 'review'] as const;
export type StepName = (typeof STEPS)[number];
/** Première étape qui demande une session. */
export const FIRST_PRIVATE_STEP: StepName = 'place';

/** Limites du contrat (`CleaningSubmitRequestBody`). */
export const MAX_TYPES = 20;
export const MAX_SLOTS = 3;
export const MAX_COMMENT = 1000;
export const MAX_DESCRIPTION = 2000;
export const MAX_PHOTOS = 5;
const MAX_VALUE = 1_000_000;

/** Créneau de visite saisi : jour et heures du Bénin. */
export interface SlotDraft {
  date: string;
  from: string;
  to: string;
}

export interface RequestDraft {
  version: typeof DRAFT_VERSION;
  placeTypeId: string | null;
  /** Lieu « Autre » : pas de simulation, le besoin est décrit (R-CA-05). */
  freeDescription: boolean;
  cleaningTypeIds: string[];
  /** Saisie brute : texte d'un nombre, code d'un choix, `yes` ou `no` ; `''` sans réponse. */
  values: Record<string, string>;
  /** Commune choisie dans le simulateur (facultative). */
  communeKey: string;
  /** Rythme indiqué dans le simulateur (facultatif là, obligatoire pour la demande). */
  withSchedule: boolean;
  schedule: ScheduleDraft;
  placeId: string | null;
  slots: SlotDraft[];
  description: string;
  comment: string;
  photos: Array<{ id: string; name: string }>;
  step: StepName;
}

export function emptyDraft(): RequestDraft {
  return {
    version: DRAFT_VERSION,
    placeTypeId: null,
    freeDescription: false,
    cleaningTypeIds: [],
    values: {},
    communeKey: '',
    withSchedule: false,
    schedule: emptySchedule(),
    placeId: null,
    slots: [{ date: '', from: '08:00', to: '12:00' }],
    description: '',
    comment: '',
    photos: [],
    step: 'type',
  };
}

function storage(): Storage | null {
  try {
    return typeof window === 'undefined' ? null : window.sessionStorage;
  } catch {
    return null;
  }
}

/** Brouillon de l'onglet, ou null (absent, illisible, d'une autre version). */
export function readDraft(): RequestDraft | null {
  try {
    const raw = storage()?.getItem(DRAFT_KEY);
    if (!raw) return null;
    const value = JSON.parse(raw) as Partial<RequestDraft>;
    if (value?.version !== DRAFT_VERSION) return null;
    const step = STEPS.includes(value.step as StepName) ? (value.step as StepName) : 'type';
    return {
      ...emptyDraft(),
      ...value,
      schedule: { ...emptySchedule(), ...value.schedule },
      step,
    } as RequestDraft;
  } catch {
    return null;
  }
}

export function writeDraft(draft: RequestDraft): void {
  try {
    storage()?.setItem(DRAFT_KEY, JSON.stringify(draft));
  } catch {
    // Stockage plein ou bloqué : le parcours continue sans brouillon.
  }
}

export function clearDraft(): void {
  try {
    storage()?.removeItem(DRAFT_KEY);
  } catch {
    // Rien à faire.
  }
}

/* ——— Types de nettoyage et paramètres ——— */

/** Offres affichées : un pack choisi masque les types qu'il contient (R-CA-04). */
export function visibleOffers(detail: PlaceTypeDetail, selected: ReadonlyArray<string>) {
  const hidden = new Set(
    detail.offers
      .filter((offer) => offer.cleaningType.isPack && selected.includes(offer.cleaningType.id))
      .flatMap((offer) => offer.cleaningType.packItemIds),
  );
  return detail.offers.filter((offer) => !hidden.has(offer.cleaningType.id));
}

/** Coche ou décoche un type ; choisir un pack retire les types qu'il contient. */
export function toggleType(
  detail: PlaceTypeDetail,
  selected: ReadonlyArray<string>,
  typeId: string,
): string[] {
  if (selected.includes(typeId)) return selected.filter((value) => value !== typeId);
  const offer = detail.offers.find((item) => item.cleaningType.id === typeId);
  const packItems = offer?.cleaningType.isPack ? new Set(offer.cleaningType.packItemIds) : new Set<string>();
  return [...selected.filter((value) => !packItems.has(value)), typeId];
}

/** Types choisis encore proposés par le lieu (catalogue changé entre-temps). */
export function keptTypes(detail: PlaceTypeDetail, selected: ReadonlyArray<string>): string[] {
  const offered = new Set(visibleOffers(detail, selected).map((offer) => offer.cleaningType.id));
  return selected.filter((value) => offered.has(value));
}

/** Paramètres demandés : ceux du lieu, puis ceux des types choisis, sans doublon, actifs seulement. */
export function relevantParameters(detail: PlaceTypeDetail, selected: ReadonlyArray<string>): Parameter[] {
  const seen = new Set<string>();
  const result: Parameter[] = [];
  const extra = detail.offers
    .filter((offer) => selected.includes(offer.cleaningType.id))
    .flatMap((offer) => offer.extraParameters);
  for (const parameter of [...detail.parameters, ...extra]) {
    if (!parameter.active || seen.has(parameter.code)) continue;
    seen.add(parameter.code);
    result.push(parameter);
  }
  return result;
}

/** Codes des paramètres du lieu lui-même (gardés dans « Mes lieux », `declaredValues`). */
export function placeParameterCodes(detail: PlaceTypeDetail): Set<string> {
  return new Set(detail.parameters.map((parameter) => parameter.code));
}

export type ValueErrors = Record<string, string>;

/**
 * Valeurs envoyées (`CleaningValues`) et erreurs de forme, par `values.<code>` : obligatoire, nombre
 * entier, bornes du paramètre, choix proposé. Une valeur vide d'un paramètre facultatif n'est pas envoyée.
 */
export function buildValues(
  parameters: ReadonlyArray<Parameter>,
  raw: Record<string, string>,
): { values: ValuesBody; errors: ValueErrors } {
  const values: ValuesBody = {};
  const errors: ValueErrors = {};
  for (const parameter of parameters) {
    const key = `values.${parameter.code}`;
    const text = (raw[parameter.code] ?? '').trim();
    if (!text) {
      if (parameter.required) errors[key] = 'Ce champ est obligatoire.';
      continue;
    }
    if (parameter.kind === 'number') {
      if (!/^\d+$/.test(text)) {
        errors[key] = 'Indiquez un nombre entier.';
        continue;
      }
      const value = Number(text);
      const min = parameter.min ?? 0;
      const max = parameter.max ?? MAX_VALUE;
      if (value < min || value > max) {
        errors[key] =
          `Indiquez une valeur entre ${min} et ${max}${parameter.unit ? ` ${parameter.unit}` : ''}.`;
        continue;
      }
      values[parameter.code] = value;
    } else if (parameter.kind === 'boolean') {
      if (text !== 'yes' && text !== 'no') errors[key] = 'Répondez par oui ou par non.';
      else values[parameter.code] = text === 'yes';
    } else {
      const choice = parameter.choices.find((item) => item.code === text && item.active);
      if (!choice) errors[key] = 'Choisissez une valeur proposée.';
      else values[parameter.code] = choice.code;
    }
  }
  return { values, errors };
}

/** Saisie brute reprise de valeurs déjà déclarées (un lieu de « Mes lieux »). */
export function rawValues(values: CleaningValues): Record<string, string> {
  const raw: Record<string, string> = {};
  for (const [code, value] of Object.entries(values)) {
    raw[code] = typeof value === 'boolean' ? (value ? 'yes' : 'no') : String(value);
  }
  return raw;
}

/* ——— Corps envoyés ——— */

/** Corps de la simulation, ou null tant que la saisie n'est pas complète. */
export function simulationBody(
  draft: RequestDraft,
  detail: PlaceTypeDetail | null,
): { body: SimulateBody | null; errors: ValueErrors } {
  if (!detail || draft.freeDescription || !draft.cleaningTypeIds.length) return { body: null, errors: {} };
  const types = keptTypes(detail, draft.cleaningTypeIds);
  if (!types.length) return { body: null, errors: {} };
  const { values, errors } = buildValues(relevantParameters(detail, types), draft.values);
  if (Object.keys(errors).length) return { body: null, errors };
  let schedule: SimulateBody['schedule'];
  if (draft.withSchedule) {
    const built = buildSchedule(draft.schedule);
    if ('errors' in built) return { body: null, errors: built.errors };
    schedule = built.plan;
  }
  return {
    body: {
      placeTypeId: detail.placeType.id,
      cleaningTypeIds: types,
      values,
      ...(schedule ? { schedule } : {}),
      ...(draft.communeKey ? { communeKey: draft.communeKey } : {}),
    },
    errors: {},
  };
}

/** Créneaux de visite en ISO 8601 (UTC), à l'heure du Bénin ; erreurs par `visitSlots.<n>`. */
export function buildSlots(slots: ReadonlyArray<SlotDraft>): { slots: TimeSlotBody[]; errors: ValueErrors } {
  const errors: ValueErrors = {};
  const result: TimeSlotBody[] = [];
  slots.forEach((slot, index) => {
    const key = `visitSlots.${index}`;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(slot.date)) errors[key] = 'Choisissez un jour.';
    else if (!/^\d{2}:\d{2}$/.test(slot.from) || !/^\d{2}:\d{2}$/.test(slot.to) || slot.from >= slot.to) {
      errors[key] = 'L’heure de fin doit suivre l’heure de début.';
    } else {
      result.push(beninSlot(slot.date, slot.from, slot.to));
    }
  });
  if (!slots.length) errors['visitSlots'] = 'Proposez au moins un créneau.';
  return { slots: result, errors };
}

/** Corps de `POST /cleaning/requests`, ou les erreurs par étape. */
export function requestBody(
  draft: RequestDraft,
  detail: PlaceTypeDetail,
): { body: SubmitRequestBody } | { errors: ValueErrors } {
  const errors: ValueErrors = {};
  const types = draft.freeDescription ? [] : keptTypes(detail, draft.cleaningTypeIds);
  if (!draft.freeDescription && !types.length) errors['cleaningTypeIds'] = 'Choisissez au moins un type.';
  const { values, errors: valueErrors } = buildValues(relevantParameters(detail, types), draft.values);
  Object.assign(errors, valueErrors);
  const description = draft.description.trim();
  if (draft.freeDescription && !description) errors['freeDescription'] = 'Décrivez votre besoin.';
  const schedule = buildSchedule(draft.schedule);
  if ('errors' in schedule) Object.assign(errors, schedule.errors);
  if (!draft.placeId) errors['placeId'] = 'Choisissez ou enregistrez le lieu.';
  const slots = buildSlots(draft.slots);
  Object.assign(errors, slots.errors);
  if (Object.keys(errors).length || 'errors' in schedule || !draft.placeId) return { errors };
  const comment = draft.comment.trim();
  return {
    body: {
      placeId: draft.placeId,
      cleaningTypeIds: types,
      values,
      ...(draft.freeDescription ? { freeDescription: description } : {}),
      schedule: schedule.plan,
      visitSlots: slots.slots,
      ...(comment ? { comment } : {}),
      ...(draft.photos.length ? { photoFileIds: draft.photos.map((photo) => photo.id) } : {}),
    },
  };
}

/** Étape où corriger un champ refusé (`values.surface` → paramètres, `visitSlots.0` → créneaux). */
export function stepOfField(path: string): StepName {
  const head = path.split(/[.[]/)[0] ?? path;
  if (head === 'cleaningTypeIds' || head === 'placeTypeId') return 'type';
  if (head === 'values' || head === 'freeDescription') return 'params';
  if (head === 'schedule') return 'schedule';
  if (head === 'placeId') return 'place';
  if (head === 'visitSlots') return 'slots';
  return 'details';
}
