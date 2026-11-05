import { beninDate, beninSlot, formatShortDate } from '@/lib/format';
import type { AnswerSet, EstimateInput, GeoLocationInput, PlaceItemInput, QuoteGroupInput } from './api';
import { journeyTexts, servedLine, type SlotPeriod, slotPeriods } from './journey-texts';
import type { FormField, PlaceCatalog, PlaceService, PlaceType, ServedZone } from './schemas';

/*
 * Parcours « demande de devis par lieu » (ADR-034), sans React : brouillon, contrôle de forme des
 * réponses et construction des corps envoyés à la gateway. Les règles (prix, bornes en vigueur, zones,
 * délais) restent celles de la gateway : ici, seulement ce qui évite un aller-retour inutile. Aucun prix
 * n'est calculé par le front.
 */

/** Étapes de saisie (la confirmation suit, hors du fil de progression). */
export const STEPS = ['place', 'services', 'address', 'slots', 'review'] as const;
export type StepName = (typeof STEPS)[number];
export const CONFIRMATION_STEP = STEPS.length;

/** Limites du contrat (`RequestCleaningQuoteGroupRequest`). */
export const MAX_SERVICES = 10;
export const MAX_SLOTS = 3;
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

export interface ServiceDraft {
  fields: RawAnswers;
  /** Options cochées (clé = code de l'option) et réponses à leurs champs. */
  options: Record<string, RawAnswers>;
  frequency: string;
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

export interface SlotDraft {
  date: string;
  period: SlotPeriod;
}

export interface JourneyDraft {
  version: 1;
  step: number;
  placeType: string | null;
  /** Prestations cochées, dans l'ordre du lieu. */
  services: string[];
  answers: Record<string, ServiceDraft>;
  address: AddressDraft;
  slots: SlotDraft[];
  comment: string;
}

/** Erreurs par clé de champ (`services`, `house_cleaning.fields.surface`, `address.landmark`…). */
export type JourneyErrors = Record<string, string>;

export function emptyDraft(placeType: string | null = null): JourneyDraft {
  return {
    version: 1,
    step: 0,
    placeType,
    services: [],
    answers: {},
    address: { location: null, resolved: null, commune: '', district: '', landmark: '' },
    slots: [{ date: '', period: 'morning' }],
    comment: '',
  };
}

export const emptyServiceDraft = (): ServiceDraft => ({ fields: {}, options: {}, frequency: '' });

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

/** Une prestation au format du contrat (`CleaningPlaceItem`), ou ses erreurs. */
export function serviceItem(
  service: PlaceService,
  draft: ServiceDraft | undefined,
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
  const frequencies = service.form.frequencies;
  const frequency = frequencies.some((item) => item.code === current.frequency) ? current.frequency : '';
  if (frequencies.length && !frequency) errors[`${service.code}.frequency`] = journeyTexts.fieldErrors.choose;
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
    const result = serviceItem(service, draft.answers[service.code]);
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

// --- Créneaux ----------------------------------------------------------------------------------------

/** Première date proposée, au Bénin. */
export function firstAllowedDate(now: Date = new Date()): string {
  return beninDate(now, LEAD_DAYS);
}

export function checkSlots(draft: JourneyDraft, now: Date = new Date()): JourneyErrors {
  const t = journeyTexts.slots;
  const errors: JourneyErrors = {};
  const minDate = firstAllowedDate(now);
  const filled = draft.slots.filter((slot) => slot.date);
  if (!filled.length) errors['slots'] = t.required;
  else if (filled.some((slot) => slot.date < minDate)) {
    errors['slots'] = t.tooEarly(formatShortDate(`${minDate}T12:00:00Z`));
  }
  if (draft.comment.trim().length > MAX_COMMENT) errors['comment'] = t.commentTooLong(MAX_COMMENT);
  return errors;
}

/** Créneaux du contrat (heures du Bénin en UTC), sans doublon. */
export function preferredSlots(draft: JourneyDraft) {
  const seen = new Set<string>();
  return draft.slots
    .filter((slot) => slot.date)
    .map((slot) => {
      const range = slotPeriods.find((item) => item.value === slot.period) ?? slotPeriods[0];
      return beninSlot(slot.date, range.from, range.to);
    })
    .filter((slot) => !seen.has(slot.start) && seen.add(slot.start));
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
    case 'slots':
      return checkSlots(draft, now);
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
  if (invalid < STEPS.length - 1 || !draft.placeType || !items.length || !location) {
    return { input: null, invalidStep: Math.min(invalid, STEPS.length - 2) };
  }
  const commune = communeOf(draft.address, zones);
  const comment = draft.comment.trim();
  return {
    invalidStep: null,
    input: {
      placeType: draft.placeType,
      location,
      landmark: landmarkOf(draft.address),
      ...(commune ? { commune } : {}),
      items,
      preferredSlots: preferredSlots(draft),
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
    if (part === 'frequency') return { step: 1, key: `${service.serviceCode}.frequency` };
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
  if (root === 'preferredSlots') return { step: 3, key: 'slots' };
  if (root === 'comment') return { step: 3, key: 'comment' };
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

function readServiceDraft(value: unknown): ServiceDraft | null {
  if (!isRecord(value) || !isStrings(value.fields) || typeof value.frequency !== 'string') return null;
  if (!isRecord(value.options) || !Object.values(value.options).every(isStrings)) return null;
  return {
    fields: value.fields,
    options: value.options as Record<string, RawAnswers>,
    frequency: value.frequency,
  };
}

/** Relit un brouillon enregistré ; `null` s'il est absent, d'une autre version ou altéré. */
export function parseDraft(text: string | null): JourneyDraft | null {
  if (!text) return null;
  let value: unknown;
  try {
    value = JSON.parse(text);
  } catch {
    return null;
  }
  if (!isRecord(value) || value.version !== 1) return null;
  const { step, placeType, services, answers, address, slots, comment } = value;
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
  const parsedSlots = Array.isArray(slots)
    ? slots
        .filter(isRecord)
        .slice(0, MAX_SLOTS)
        .map((slot) => ({
          date: /^\d{4}-\d{2}-\d{2}$/.test(text_(slot.date)) ? text_(slot.date) : '',
          period: (slotPeriods.some((period) => period.value === slot.period)
            ? slot.period
            : 'morning') as SlotPeriod,
        }))
    : [];
  return {
    version: 1,
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
    slots: parsedSlots.length ? parsedSlots : [{ date: '', period: 'morning' }],
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
