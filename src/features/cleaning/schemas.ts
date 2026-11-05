import * as z from 'zod/mini';

/*
 * Réponses de la gateway pour le Nettoyage (contrat `ksp-api.v1.yaml`, routes `/api/v1/cleaning/*`).
 * Champ par champ selon le contrat : un champ obligatoire absent rend la réponse invalide ; un champ
 * facultatif du contrat est `z.optional` ; un champ inconnu du contrat est ignoré. Les énumérations restent
 * des chaînes pour qu'un nouvel état ne casse pas l'écran (il s'affiche avec un libellé neutre) ; leurs
 * valeurs sont listées dans `texts.ts`.
 * Les champs « Back-office » du contrat (`customerName`, `organizationName`, `agentName`,
 * `recordedByName`, ADR-029) valent null dans l'espace client : décrits, jamais affichés.
 * Schémas lus dans le navigateur : `zod/mini`, bien plus léger que `zod`.
 */

/** Montant en entiers de FCFA (`Money`). */
export const moneySchema = z.object({ amount: z.int(), currency: z.literal('XOF') });

export const timeSlotSchema = z.object({ start: z.string(), end: z.string() });

export const priceLineSchema = z.object({
  label: z.string(),
  quantity: z.int(),
  unitPrice: moneySchema,
  amount: moneySchema,
});

export const priceRangeSchema = z.object({ low: moneySchema, high: moneySchema });

/** `CleaningRecurrence` : passages par semaine ou par mois, pendant une durée en mois. */
export const recurrenceSchema = z.object({
  period: z.string(),
  visitsPerPeriod: z.int(),
  durationMonths: z.int(),
});

/** `CleaningServiceOffer` : une prestation du catalogue. */
export const serviceOfferSchema = z.object({
  code: z.string(),
  name: z.string(),
  description: z.string(),
  unit: z.string(),
  options: z.array(z.object({ code: z.string(), label: z.string(), price: z.nullable(moneySchema) })),
  priced: z.boolean(),
  minimumPrice: z.nullable(moneySchema),
});

export const serviceListSchema = z.object({ data: z.array(serviceOfferSchema) });

/**
 * `CleaningServedZone` : commune où le Nettoyage est ouvert. `commune` est le nom affiché, renvoyé tel
 * quel dans le champ `commune` d'une simulation ou d'une demande de devis.
 */
export const servedZoneSchema = z.object({ code: z.string(), commune: z.string() });

export const servedZoneListSchema = z.object({ data: z.array(servedZoneSchema) });

/*
 * Parcours par lieu (ADR-033, ADR-034) : catalogue des types de lieu et formulaires des prestations,
 * estimation de plusieurs prestations, position GPS, demandes groupées. Le formulaire public ne porte
 * aucun prix : seuls l'estimation et le devis donnent des montants.
 */

/** `CleaningFormField` : champ du formulaire d'une prestation (`number`, `choice` ou `boolean`). */
export const formFieldSchema = z.object({
  code: z.string(),
  label: z.string(),
  type: z.string(),
  required: z.boolean(),
  helpText: z.nullable(z.string()),
  unitLabel: z.nullable(z.string()),
  min: z.nullable(z.int()),
  max: z.nullable(z.int()),
  choices: z.array(z.object({ code: z.string(), label: z.string() })),
});

/** `CleaningServiceForm` : champs, options (avec leurs propres champs) et fréquences actives. */
export const serviceFormSchema = z.object({
  fields: z.array(formFieldSchema),
  options: z.array(
    z.object({
      code: z.string(),
      label: z.string(),
      description: z.nullable(z.string()),
      fields: z.array(formFieldSchema),
    }),
  ),
  frequencies: z.array(z.object({ code: z.string(), label: z.string() })),
});

/** Prestation du catalogue par lieu (`CleaningServiceOffer` : seuls les champs utiles au parcours). */
export const placeServiceSchema = z.object({
  code: z.string(),
  name: z.string(),
  description: z.string(),
  priced: z.boolean(),
  form: serviceFormSchema,
});

/** `CleaningPublicPlaceType` : type de lieu et codes de ses prestations, dans l'ordre d'affichage. */
export const placeTypeSchema = z.object({
  code: z.string(),
  label: z.string(),
  description: z.nullable(z.string()),
  icon: z.string(),
  displayOrder: z.int(),
  serviceCodes: z.array(z.string()),
});

/** `CleaningPlaceCatalog` (`GET /cleaning/catalog`). */
export const placeCatalogSchema = z.object({
  placeTypes: z.array(placeTypeSchema),
  services: z.array(placeServiceSchema),
});

/** `CleaningEstimateItem` : estimation d'une prestation (le détail du calcul n'est pas affiché). */
export const estimateItemSchema = z.object({
  serviceCode: z.string(),
  serviceName: z.string(),
  priced: z.boolean(),
  /** `price_not_set`, `option_price_not_set`, `answers_incomplete`, null si chiffrée. */
  reason: z.nullable(z.string()),
  notice: z.string(),
  estimate: z.nullable(priceRangeSchema),
  computedPrice: z.nullable(moneySchema),
  recommendedTeamSize: z.int(),
});

/**
 * `CleaningEstimate` (`POST /cleaning/estimates`). `total` : somme des prix si toutes les prestations
 * en ont un (entier XOF), sinon null avec `status` = `partially_priced` ou `unpriced`. Sans commune,
 * `communeApplied` est faux : l'estimation est indicative.
 */
export const estimateSchema = z.object({
  placeType: z.string(),
  commune: z.nullable(z.string()),
  communeApplied: z.boolean(),
  covered: z.boolean(),
  status: z.string(),
  total: z.nullable(z.int()),
  currency: z.literal('XOF'),
  notice: z.string(),
  items: z.array(estimateItemSchema),
});

/** `CleaningLocationResolution` (`POST /cleaning/locations/resolve`, client connecté). */
export const locationResolutionSchema = z.object({
  latitude: z.number(),
  longitude: z.number(),
  commune: z.nullable(z.string()),
  zoneCode: z.nullable(z.string()),
  served: z.boolean(),
  displayAddress: z.nullable(z.string()),
  provider: z.nullable(z.string()),
});

/** `CleaningSiteVisit` : visite des lieux, obligatoire avant tout devis. */
export const siteVisitSchema = z.object({
  id: z.string(),
  status: z.string(),
  scheduledAt: z.string(),
  agentId: z.string(),
  report: z.nullable(z.string()),
  completedAt: z.nullable(z.string()),
  /** Back-office (ADR-029), facultatif. */
  agentName: z.optional(z.nullable(z.string())),
});

export const quoteSchema = z.object({
  id: z.string(),
  lines: z.array(priceLineSchema),
  subtotal: moneySchema,
  interventionCount: z.int(),
  total: moneySchema,
  proposedSlots: z.array(timeSlotSchema),
  validUntil: z.string(),
  depositPercent: z.int(),
  depositAmount: moneySchema,
  recurrence: z.nullable(recurrenceSchema),
  teamSize: z.int(),
  durationMinutes: z.int(),
  sentAt: z.string(),
});

/**
 * `CleaningQuoteRequest` : une demande de devis du client. `customerKind` et `organizationId` viennent
 * du contexte actif au moment de la demande (particulier, ou entreprise et son organisation).
 */
export const quoteRequestSchema = z.object({
  id: z.string(),
  status: z.string(),
  customerId: z.string(),
  customerKind: z.string(),
  organizationId: z.nullable(z.string()),
  serviceCode: z.string(),
  premisesType: z.string(),
  quantity: z.int(),
  options: z.array(z.string()),
  commune: z.string(),
  address: z.string(),
  preferredSlots: z.array(timeSlotSchema),
  comment: z.nullable(z.string()),
  recurrence: z.nullable(recurrenceSchema),
  /** Nombre d'agents souhaité par le client, null s'il ne l'a pas indiqué. */
  requestedTeamSize: z.nullable(z.int()),
  /** Entreprise : jours d'intervention par semaine indiqués à la demande, null sinon. */
  daysPerWeek: z.nullable(z.int()),
  recommendedTeamSize: z.int(),
  estimate: z.nullable(priceRangeSchema),
  visit: z.nullable(siteVisitSchema),
  quote: z.nullable(quoteSchema),
  missionId: z.nullable(z.string()),
  closingReason: z.nullable(z.string()),
  createdAt: z.string(),
  updatedAt: z.string(),
  /** Back-office (ADR-029), facultatifs ; null dans l'espace client. */
  customerName: z.optional(z.nullable(z.string())),
  organizationName: z.optional(z.nullable(z.string())),
});

export const quoteRequestListSchema = z.object({
  data: z.array(quoteRequestSchema),
  nextCursor: z.nullable(z.string()),
});

/**
 * `CleaningQuoteRequestGroup` : une demande par prestation, liées par un groupe (ADR-034), dans l'ordre
 * envoyé. `quotesTotal` et `remainingDue` (ADR-035) sont facultatifs ici : ils servent au suivi.
 */
export const requestGroupSchema = z.object({
  groupId: z.string(),
  placeType: z.string(),
  commune: z.string(),
  zoneCode: z.string(),
  createdAt: z.string(),
  items: z.array(quoteRequestSchema),
  quotesTotal: z.optional(z.nullable(moneySchema)),
  remainingDue: z.optional(z.nullable(moneySchema)),
});

export const checklistItemSchema = z.object({ code: z.string(), label: z.string(), done: z.boolean() });

/** `CleaningIntervention` : un passage de la mission. */
export const interventionSchema = z.object({
  id: z.string(),
  status: z.string(),
  scheduledStart: z.string(),
  durationMinutes: z.int(),
  agents: z.array(z.object({ agentId: z.string(), displayName: z.string() })),
  checklist: z.array(checklistItemSchema),
  incidentNote: z.nullable(z.string()),
  /** Références du service file (photos avant et après), pas encore lisibles par le portail. */
  beforePhotoFileIds: z.array(z.string()),
  afterPhotoFileIds: z.array(z.string()),
  startedAt: z.nullable(z.string()),
  completedAt: z.nullable(z.string()),
  /** Passage annulé : `suspension` (impayés, reprogrammé au déblocage) ou `manual` ; null sinon. */
  cancellationCause: z.nullable(z.string()),
});

export const paymentPlanSchema = z.object({ option: z.string(), timing: z.string(), method: z.string() });

export const paymentStateSchema = z.object({
  plan: paymentPlanSchema,
  status: z.string(),
  total: moneySchema,
  depositPercent: z.int(),
  depositAmount: moneySchema,
  paid: moneySchema,
  payments: z.array(
    z.object({
      id: z.string(),
      amount: moneySchema,
      method: z.string(),
      reference: z.nullable(z.string()),
      recordedBy: z.string(),
      /** Back-office (ADR-029), facultatif. */
      recordedByName: z.optional(z.nullable(z.string())),
      recordedAt: z.string(),
    }),
  ),
});

/**
 * `CleaningSuspension` : suspension en cours (partie 10 du cahier des charges ; ADR-030). `cause` est la
 * plus ancienne cause active : `unpaid_invoices`, `unpaid_interventions` ou `organization_suspended`
 * (compte entreprise suspendu par KSP). `causes` (ajout de l'ADR-030, obligatoire au contrat, au moins
 * une) les donne toutes, la plus ancienne d'abord. `unpaidCount` peut valoir 0 quand seule l'organisation
 * est suspendue.
 */
export const suspensionSchema = z.object({
  cause: z.string(),
  causes: z.array(z.string()).check(z.minLength(1)),
  since: z.string(),
  unpaidCount: z.int().check(z.nonnegative()),
});

// `suspensionCauses` (repli sur `[cause]`) vit dans `suspension.ts`, sans zod : les textes l'importent.
export { suspensionCauses } from './suspension';

/**
 * `CleaningMission` : la prestation réservée et ses passages. `customerKind` et `organizationId` ne sont
 * pas obligatoires au contrat (la gateway les renvoie toujours) : absents, la mission est lue comme celle
 * d'un particulier, sans organisation.
 */
export const missionSchema = z.object({
  id: z.string(),
  requestId: z.string(),
  quoteId: z.string(),
  customerId: z.string(),
  /** Particulier ou entreprise : une mission d'entreprise se règle par sa facture mensuelle. */
  customerKind: z.optional(z.string()),
  /** Organisation de la mission ; null pour un particulier. */
  organizationId: z.optional(z.nullable(z.string())),
  /** Back-office (ADR-029), facultatifs ; null dans l'espace client. */
  customerName: z.optional(z.nullable(z.string())),
  organizationName: z.optional(z.nullable(z.string())),
  status: z.string(),
  serviceCode: z.string(),
  commune: z.string(),
  address: z.string(),
  chosenSlot: timeSlotSchema,
  recurrence: z.nullable(recurrenceSchema),
  plannedInterventions: z.int(),
  completedInterventions: z.int(),
  interventions: z.array(interventionSchema),
  payment: paymentStateSchema,
  cancellationReason: z.nullable(z.string()),
  daysPerWeek: z.nullable(z.int()),
  suspension: z.nullable(suspensionSchema),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const missionListSchema = z.object({
  data: z.array(missionSchema),
  nextCursor: z.nullable(z.string()),
});

export const acceptResponseSchema = z.object({ request: quoteRequestSchema, mission: missionSchema });

export type Money = z.infer<typeof moneySchema>;
export type TimeSlot = z.infer<typeof timeSlotSchema>;
export type PriceLine = z.infer<typeof priceLineSchema>;
export type Recurrence = z.infer<typeof recurrenceSchema>;
export type ServiceOffer = z.infer<typeof serviceOfferSchema>;
export type ServedZone = z.infer<typeof servedZoneSchema>;
export type Quote = z.infer<typeof quoteSchema>;
export type QuoteRequest = z.infer<typeof quoteRequestSchema>;
export type QuoteRequestList = z.infer<typeof quoteRequestListSchema>;
export type Intervention = z.infer<typeof interventionSchema>;
export type PaymentPlan = z.infer<typeof paymentPlanSchema>;
export type Suspension = z.infer<typeof suspensionSchema>;
export type Mission = z.infer<typeof missionSchema>;
export type MissionList = z.infer<typeof missionListSchema>;
export type AcceptResponse = z.infer<typeof acceptResponseSchema>;
export type FormField = z.infer<typeof formFieldSchema>;
export type ServiceForm = z.infer<typeof serviceFormSchema>;
export type PlaceService = z.infer<typeof placeServiceSchema>;
export type PlaceType = z.infer<typeof placeTypeSchema>;
export type PlaceCatalog = z.infer<typeof placeCatalogSchema>;
export type Estimate = z.infer<typeof estimateSchema>;
export type EstimateItem = z.infer<typeof estimateItemSchema>;
export type LocationResolution = z.infer<typeof locationResolutionSchema>;
export type RequestGroup = z.infer<typeof requestGroupSchema>;
