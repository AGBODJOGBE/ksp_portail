import * as z from 'zod/mini';

/*
 * Réponses de la gateway pour le Nettoyage (contrat `ksp-api.v1.yaml`, routes `/api/v1/cleaning/*`).
 * Lecture tolérante : un champ ajouté par la gateway est ignoré ; les énumérations restent des chaînes
 * pour qu'un nouvel état ne casse pas l'écran (il s'affiche avec un libellé neutre).
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
 * `CleaningSimulation`. `covered` : commune desservie ou non (l'estimation est donnée dans tous les cas,
 * mais une demande de devis hors zone est refusée). Facultatif à la lecture pour une gateway plus ancienne.
 */
export const simulationSchema = z.object({
  serviceCode: z.string(),
  priced: z.boolean(),
  estimate: z.nullable(priceRangeSchema),
  computedPrice: z.nullable(moneySchema),
  breakdown: z.array(priceLineSchema),
  minimumApplied: z.boolean(),
  recommendedTeamSize: z.int(),
  notice: z.string(),
  covered: z.optional(z.boolean()),
});

export const siteVisitSchema = z.object({
  id: z.string(),
  status: z.string(),
  scheduledAt: z.string(),
  report: z.nullable(z.string()),
  completedAt: z.nullable(z.string()),
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

/** `CleaningQuoteRequest` : une demande de devis du client. */
export const quoteRequestSchema = z.object({
  id: z.string(),
  status: z.string(),
  customerKind: z.string(),
  serviceCode: z.string(),
  premisesType: z.string(),
  quantity: z.int(),
  options: z.array(z.string()),
  commune: z.string(),
  address: z.string(),
  preferredSlots: z.array(timeSlotSchema),
  comment: z.nullable(z.string()),
  recurrence: z.nullable(recurrenceSchema),
  /** Entreprise : jours d'intervention par semaine indiqués à la demande. */
  daysPerWeek: z.optional(z.nullable(z.int())),
  estimate: z.nullable(priceRangeSchema),
  visit: z.nullable(siteVisitSchema),
  quote: z.nullable(quoteSchema),
  missionId: z.nullable(z.string()),
  closingReason: z.nullable(z.string()),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const quoteRequestListSchema = z.object({
  data: z.array(quoteRequestSchema),
  nextCursor: z.nullable(z.string()),
});

export const interventionSchema = z.object({
  id: z.string(),
  status: z.string(),
  scheduledStart: z.string(),
  durationMinutes: z.int(),
  agents: z.array(z.object({ agentId: z.string(), displayName: z.string() })),
  incidentNote: z.nullable(z.string()),
  startedAt: z.nullable(z.string()),
  completedAt: z.nullable(z.string()),
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
      recordedAt: z.string(),
    }),
  ),
});

/** `CleaningMission` : la prestation réservée et ses passages. */
export const missionSchema = z.object({
  id: z.string(),
  requestId: z.string(),
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
  daysPerWeek: z.optional(z.nullable(z.int())),
  /** Suspension pour impayés en cours (factures d'entreprise ou passages d'un particulier). */
  suspension: z.optional(
    z.nullable(z.object({ cause: z.string(), since: z.string(), unpaidCount: z.int() })),
  ),
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
export type Simulation = z.infer<typeof simulationSchema>;
export type Quote = z.infer<typeof quoteSchema>;
export type QuoteRequest = z.infer<typeof quoteRequestSchema>;
export type QuoteRequestList = z.infer<typeof quoteRequestListSchema>;
export type Intervention = z.infer<typeof interventionSchema>;
export type PaymentPlan = z.infer<typeof paymentPlanSchema>;
export type Mission = z.infer<typeof missionSchema>;
export type MissionList = z.infer<typeof missionListSchema>;
export type AcceptResponse = z.infer<typeof acceptResponseSchema>;
