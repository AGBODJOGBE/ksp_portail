import * as z from 'zod/mini';

/*
 * Nettoyage v2 lu par le portail (contrat `ksp-api.v1.yaml`, routes `/api/v1/cleaning/*`, ADR-054 à 059),
 * champ par champ : un champ obligatoire absent rend la réponse invalide, un champ ajouté est ignoré, un
 * état ou une nature inconnus s'affichent avec un libellé neutre (chaînes, pas d'énumérations fermées).
 * Les montants marqués « absents pour qui n'a pas le droit de les voir » sont facultatifs : le client
 * titulaire du contexte actif les reçoit toujours. Schémas lus dans le navigateur : `zod/mini`.
 */

export const moneySchema = z.object({ amount: z.int(), currency: z.literal('XOF') });
export type Money = z.infer<typeof moneySchema>;

const optionalMoney = z.optional(z.nullable(moneySchema));

/** `CleaningScalar` : nombre entier, code de choix ou oui/non. */
export const scalarSchema = z.union([z.int(), z.string(), z.boolean()]);
export type Scalar = z.infer<typeof scalarSchema>;

/** `CleaningValues` : code du paramètre → valeur. */
export const valuesSchema = z.record(z.string(), scalarSchema);
export type CleaningValues = z.infer<typeof valuesSchema>;

/* ——— Catalogue (public) ——— */

export const placeTypeSummarySchema = z.object({
  id: z.string(),
  code: z.string(),
  name: z.string(),
  icon: z.nullable(z.string()),
  /** Lien temporaire de la photo. */
  photoUrl: z.nullable(z.string()),
  description: z.nullable(z.string()),
  /** Lieu « Autre » : pas de simulateur, le besoin est décrit (R-CA-05). */
  freeDescription: z.boolean(),
});
export type PlaceTypeSummary = z.infer<typeof placeTypeSummarySchema>;

export const catalogSchema = z.object({
  data: z.array(
    z.object({
      id: z.string(),
      code: z.string(),
      name: z.string(),
      icon: z.nullable(z.string()),
      placeTypes: z.array(placeTypeSummarySchema),
    }),
  ),
});
export type Catalog = z.infer<typeof catalogSchema>;
export type PlaceCategory = Catalog['data'][number];

/** `CleaningPublicParameter` : paramètre demandé au client. */
export const parameterSchema = z.object({
  id: z.string(),
  code: z.string(),
  label: z.string(),
  /** `number`, `choice` ou `boolean`. */
  kind: z.string(),
  unit: z.nullable(z.string()),
  min: z.nullable(z.int()),
  max: z.nullable(z.int()),
  choices: z.array(z.object({ code: z.string(), label: z.string(), active: z.boolean() })),
  required: z.boolean(),
  help: z.nullable(z.string()),
  active: z.boolean(),
});
export type Parameter = z.infer<typeof parameterSchema>;

export const placeTypeDetailSchema = z.object({
  placeType: placeTypeSummarySchema,
  categoryId: z.string(),
  parameters: z.array(parameterSchema),
  offers: z.array(
    z.object({
      offerId: z.string(),
      cleaningType: z.object({
        id: z.string(),
        code: z.string(),
        name: z.string(),
        description: z.nullable(z.string()),
        icon: z.nullable(z.string()),
        isPack: z.boolean(),
        /** Types masqués quand le pack est choisi (R-CA-04). */
        packItemIds: z.array(z.string()),
      }),
      extraParameters: z.array(parameterSchema),
    }),
  ),
  /** Frais de la catégorie, hors majoration de commune. */
  visitFee: moneySchema,
});
export type PlaceTypeDetail = z.infer<typeof placeTypeDetailSchema>;
export type Offer = PlaceTypeDetail['offers'][number];

export const zonesSchema = z.object({
  data: z.array(z.object({ communeKey: z.string(), name: z.string() })),
});
export type Zone = z.infer<typeof zonesSchema>['data'][number];

/* ——— Programme souhaité et aperçu des dates ——— */

/** `CleaningSchedulePlan`, tel que relu sur une demande ou un devis (champs absents selon la nature). */
export const schedulePlanSchema = z.object({
  kind: z.string(),
  startTime: z.string(),
  dates: z.optional(z.nullable(z.array(z.string()))),
  weekdays: z.optional(z.nullable(z.array(z.string()))),
  everyWeeks: z.optional(z.nullable(z.int())),
  monthDays: z.optional(z.nullable(z.array(z.int()))),
  monthWeekdays: z.optional(z.nullable(z.array(z.object({ rank: z.string(), weekday: z.string() })))),
  startDate: z.optional(z.nullable(z.string())),
  endDate: z.optional(z.nullable(z.string())),
  durationWeeks: z.optional(z.nullable(z.int())),
  durationMonths: z.optional(z.nullable(z.int())),
  excludedDates: z.optional(z.nullable(z.array(z.string()))),
  addedDates: z.optional(z.nullable(z.array(z.string()))),
  excludeHolidays: z.optional(z.nullable(z.boolean())),
});
export type SchedulePlanView = z.infer<typeof schedulePlanSchema>;

export const schedulePreviewSchema = z.object({
  occurrences: z.array(z.object({ date: z.string(), start: z.string() })),
  count: z.int(),
  firstStart: z.nullable(z.string()),
  lastStart: z.nullable(z.string()),
  notices: z.array(z.object({ code: z.string(), date: z.string(), label: z.nullable(z.string()) })),
});
export type SchedulePreview = z.infer<typeof schedulePreviewSchema>;

/* ——— Prix (simulation, demande) ——— */

const priceRangeSchema = z.object({ low: z.optional(moneySchema), high: z.optional(moneySchema) });

export const pricingLineSchema = z.object({
  /** bracket, supplement, coefficient, frequency, minimum, pack_discount, commune. */
  kind: z.string(),
  label: z.string(),
  parameterCode: z.nullable(z.string()),
  quantity: z.nullable(z.int()),
  unitAmount: optionalMoney,
  coefficientBps: z.nullable(z.int()),
  amount: optionalMoney,
});

export const pricedOfferSchema = z.object({
  offerId: z.string(),
  cleaningTypeId: z.string(),
  cleaningTypeCode: z.string(),
  name: z.string(),
  tariffVersion: z.nullable(z.int()),
  /** `priced` ou `on_quote`. */
  status: z.string(),
  minimumApplied: z.boolean(),
  price: optionalMoney,
  lines: z.array(pricingLineSchema),
  onQuoteReason: z.nullable(z.string()),
  tariffStatus: z.nullable(z.string()),
});
export type PricedOffer = z.infer<typeof pricedOfferSchema>;

export const pricingSchema = z.object({
  communeKey: z.nullable(z.string()),
  communeCoefficientBps: z.int(),
  offers: z.array(pricedOfferSchema),
  complete: z.boolean(),
  packDiscount: optionalMoney,
  /** Prix d'une séance ; null si le prix n'est pas complet (R-PX-08). */
  sessionPrice: optionalMoney,
  range: z.nullable(priceRangeSchema),
  sessionsCount: z.nullable(z.int()),
  programTotal: optionalMoney,
  frequencyDiscount: optionalMoney,
  visitFee: optionalMoney,
  calculatedAt: z.string(),
  /** Somme des offres chiffrées, « à partir de » si `partially_priced`. */
  pricedSubtotal: optionalMoney,
  /** `priced`, `partially_priced` ou `on_quote`. */
  status: z.string(),
  programRange: z.nullable(priceRangeSchema),
  teamSize: z.nullable(z.int()),
  durationMinutes: z.nullable(z.int()),
});
export type Pricing = z.infer<typeof pricingSchema>;

export const simulationSchema = z.object({
  pricing: pricingSchema,
  schedule: z.nullable(schedulePreviewSchema),
  disclaimer: z.string(),
  covered: z.boolean(),
  communeApplied: z.boolean(),
  /** `no_commune`, `commune_not_covered`, `partially_priced`, `on_quote` (traduits par le front). */
  notices: z.array(z.string()),
  usesDrafts: z.boolean(),
});
export type Simulation = z.infer<typeof simulationSchema>;

/* ——— Mes lieux ——— */

export const placeLocationSchema = z.object({
  latitude: z.number(),
  longitude: z.number(),
  landmark: z.string(),
  address: z.nullable(z.string()),
  readableAddress: z.nullable(z.string()),
  accuracyMeters: z.nullable(z.int()),
});

export const placeSchema = z.object({
  id: z.string(),
  name: z.string(),
  placeTypeId: z.string(),
  placeTypeName: z.string(),
  communeKey: z.string(),
  communeName: z.string(),
  /** Commune dans une zone active. */
  served: z.boolean(),
  /** null après effacement de la position (R-DP-01) : position à redonner. */
  location: z.nullable(placeLocationSchema),
  declaredValues: valuesSchema,
  archived: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string(),
  locationCorrectedAt: z.nullable(z.string()),
  locationErasedAt: z.nullable(z.string()),
});
export type Place = z.infer<typeof placeSchema>;

export const placeListSchema = z.object({
  data: z.array(placeSchema),
  nextCursor: z.nullable(z.string()),
  total: z.int(),
});
export type PlaceList = z.infer<typeof placeListSchema>;

/** `CleaningPointLocation` : position vérifiée, rien n'est enregistré. */
export const pointLocationSchema = z.object({
  communeKey: z.nullable(z.string()),
  communeName: z.nullable(z.string()),
  served: z.boolean(),
  readableAddress: z.nullable(z.string()),
});
export type PointLocation = z.infer<typeof pointLocationSchema>;

/* ——— Demande, visite, devis ——— */

const placeSummarySchema = z.object({
  placeId: z.string(),
  name: z.string(),
  placeTypeId: z.string(),
  placeTypeName: z.string(),
  communeKey: z.string(),
  communeName: z.string(),
  location: z.nullable(placeLocationSchema),
});

const typeRefSchema = z.object({ id: z.string(), code: z.string(), name: z.string() });
export type CleaningTypeRef = z.infer<typeof typeRefSchema>;

const photoSchema = z.object({
  fileId: z.string(),
  kind: z.string(),
  takenAt: z.string(),
  url: z.nullable(z.string()),
  urlExpiresAt: z.nullable(z.string()),
});
export type CleaningPhoto = z.infer<typeof photoSchema>;

const timeSlotSchema = z.object({ start: z.string(), end: z.string() });

export const visitFeeSchema = z.object({
  id: z.string(),
  amount: z.optional(moneySchema),
  /** awaiting_payment, paid, refunded, retained, deducted. */
  status: z.string(),
  payBefore: z.nullable(z.string()),
  paidAt: z.nullable(z.string()),
  /** Reçu émis par billing. */
  invoiceId: z.nullable(z.string()),
  /** 1 à l'envoi, puis 2, 3… après chaque absence du client. */
  rank: z.int(),
  refundedAt: z.nullable(z.string()),
});
export type VisitFee = z.infer<typeof visitFeeSchema>;

const agentSchema = z.object({
  agentId: z.string(),
  firstName: z.string(),
  lastName: z.string(),
  photoUrl: z.nullable(z.string()),
  isLead: z.boolean(),
  confirmation: z.string(),
});
export type AssignedAgent = z.infer<typeof agentSchema>;

export const visitSchema = z.object({
  id: z.string(),
  /** scheduled, in_progress, completed, missed, cancelled. */
  status: z.string(),
  scheduledAt: z.string(),
  durationMinutes: z.int(),
  agents: z.array(agentSchema),
  photos: z.array(photoSchema),
  completedAt: z.nullable(z.string()),
  missedAt: z.nullable(z.string()),
  cancelledAt: z.nullable(z.string()),
  cancelCause: z.nullable(z.string()),
});
export type Visit = z.infer<typeof visitSchema>;

/** Écart déclaré / retenu (R-CS-02). Le « constaté » de l'agent n'est jamais affiché. */
export const comparisonSchema = z.object({
  confirmed: z.boolean(),
  rows: z.array(
    z.object({
      parameterCode: z.string(),
      label: z.string(),
      unit: z.nullable(z.string()),
      declared: z.nullable(scalarSchema),
      retained: z.nullable(scalarSchema),
      priceEffect: optionalMoney,
      reason: z.nullable(z.string()),
      declaredDisplay: z.nullable(z.string()),
      retainedDisplay: z.nullable(z.string()),
    }),
  ),
  addedCleaningTypes: z.array(typeRefSchema),
  removedCleaningTypes: z.array(typeRefSchema),
  declaredSessionPrice: optionalMoney,
  retainedSessionPrice: optionalMoney,
});
export type Comparison = z.infer<typeof comparisonSchema>;

export const quoteSchema = z.object({
  id: z.string(),
  requestId: z.string(),
  requestNumber: z.string(),
  programId: z.nullable(z.string()),
  /** initial, amendment, renewal, reorder. */
  kind: z.string(),
  version: z.int(),
  /** sent, accepted, declined, expired, superseded, withdrawn. */
  status: z.string(),
  lines: z.array(
    z.object({
      offerId: z.string(),
      cleaningTypeId: z.string(),
      name: z.string(),
      quantity: z.int(),
      unit: z.nullable(z.string()),
      unitPrice: z.optional(moneySchema),
      amount: z.optional(moneySchema),
      /** `offer` ou `pack_discount`. */
      kind: z.string(),
    }),
  ),
  adjustments: z.array(
    z.object({
      /** `discount` ou `surcharge`. */
      kind: z.string(),
      percentBps: z.nullable(z.int()),
      fixedAmount: optionalMoney,
      amount: z.optional(moneySchema),
      reason: z.string(),
    }),
  ),
  sessionPrice: z.optional(moneySchema),
  sessionsCount: z.int(),
  sessionStarts: z.array(z.string()),
  total: z.optional(moneySchema),
  visitFeeDeduction: z.optional(moneySchema),
  teamSize: z.int(),
  durationMinutes: z.int(),
  schedule: schedulePlanSchema,
  /** `per_session` (particulier) ou `monthly_invoice` (entreprise). */
  paymentTerms: z.string(),
  comparison: z.nullable(comparisonSchema),
  validUntil: z.nullable(z.string()),
  /** Version des conditions générales à accepter. */
  termsVersion: z.string(),
  /** PDF du devis (service document) ; null tant qu'il n'est pas produit. */
  pdfDocumentId: z.nullable(z.string()),
  sentAt: z.nullable(z.string()),
  respondedAt: z.nullable(z.string()),
  createdAt: z.string(),
});
export type Quote = z.infer<typeof quoteSchema>;

export const requestSchema = z.object({
  id: z.string(),
  /** DN-000124. */
  number: z.string(),
  /** Statut effectif, calculé d'après l'heure. */
  status: z.string(),
  customerKind: z.string(),
  organizationId: z.nullable(z.string()),
  place: placeSummarySchema,
  cleaningTypes: z.array(typeRefSchema),
  declaredValues: valuesSchema,
  freeDescription: z.nullable(z.string()),
  comment: z.nullable(z.string()),
  photos: z.array(photoSchema),
  schedule: schedulePlanSchema,
  visitSlots: z.array(timeSlotSchema),
  declaredPricing: pricingSchema,
  /** Frais en cours (le plus récent). */
  visitFee: visitFeeSchema,
  /** Visites, la plus récente d'abord. */
  visits: z.array(visitSchema),
  comparison: z.nullable(comparisonSchema),
  currentQuote: z.nullable(quoteSchema),
  quoteHistory: z.array(quoteSchema),
  programId: z.nullable(z.string()),
  reactivation: z.nullable(
    z.object({ requestedAt: z.string(), status: z.string(), decidedAt: z.nullable(z.string()) }),
  ),
  createdAt: z.string(),
  updatedAt: z.string(),
  /** Déclaré figé à l'envoi, dans l'ordre du formulaire. */
  declaredRows: z.array(
    z.object({
      code: z.string(),
      label: z.string(),
      kind: z.string(),
      unit: z.nullable(z.string()),
      value: z.nullable(scalarSchema),
      display: z.string(),
      choiceLabel: z.nullable(z.string()),
    }),
  ),
  /** Tous les frais du dossier, du plus récent au plus ancien. */
  visitFees: z.array(visitFeeSchema),
  /** `organization_unpaid_invoices` : avertissement non bloquant. */
  warnings: z.array(z.string()),
});
export type CleaningRequest = z.infer<typeof requestSchema>;

export const requestSummarySchema = z.object({
  id: z.string(),
  number: z.string(),
  status: z.string(),
  customerKind: z.string(),
  organizationId: z.nullable(z.string()),
  placeTypeName: z.string(),
  communeKey: z.string(),
  communeName: z.string(),
  cleaningTypes: z.array(typeRefSchema),
  nextVisitAt: z.nullable(z.string()),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type RequestSummary = z.infer<typeof requestSummarySchema>;

export const requestListSchema = z.object({
  data: z.array(requestSummarySchema),
  nextCursor: z.nullable(z.string()),
  total: z.int(),
});
export type RequestList = z.infer<typeof requestListSchema>;

/** `CleaningPaymentOutcome` : un seul chemin pour l'argent, le portefeuille (R-WL-05). */
export const paymentOutcomeSchema = z.object({
  /** `paid` : portefeuille débité ; `awaiting_payment` : paiement Mobile Money créé, le débit suit. */
  status: z.string(),
  amount: moneySchema,
  walletTransactionId: z.nullable(z.string()),
  paymentId: z.nullable(z.string()),
  checkoutUrl: z.nullable(z.string()),
  invoiceId: z.nullable(z.string()),
});
export type PaymentOutcome = z.infer<typeof paymentOutcomeSchema>;

/** Programme créé à l'acceptation (`CleaningProgram`, champs utiles à la confirmation). */
export const programSchema = z.object({
  id: z.string(),
  /** PN-000057. */
  number: z.string(),
  status: z.string(),
  requestId: z.string(),
  quoteId: z.string(),
  sessionsCount: z.int(),
  sessionsCompleted: z.int(),
  firstSessionAt: z.nullable(z.string()),
  lastSessionAt: z.nullable(z.string()),
});
export type Program = z.infer<typeof programSchema>;

export const acceptResultSchema = z.object({ quote: quoteSchema, program: programSchema });
export type AcceptResult = z.infer<typeof acceptResultSchema>;

/* ——— Programme, séances, réclamations (parties 8, 10 et 12) ——— */

/** `CleaningSuspensionCause` : causes cumulables d'une suspension (R-SU-01). */
export const suspensionCauseSchema = z.object({
  /** overdue_sessions, unpaid_invoices, ksp_decision, organization_suspended. */
  cause: z.string(),
  since: z.string(),
  /** Motif d'une décision de KSP. */
  reason: z.nullable(z.string()),
});
export type SuspensionCause = z.infer<typeof suspensionCauseSchema>;

/** `CleaningRenewal` : renouvellement proposé (R-PG-07). */
export const renewalSchema = z.object({
  /** proposed, accepted, declined. */
  status: z.string(),
  proposedAt: z.string(),
  /** Devis de renouvellement (dans sa demande). */
  quoteId: z.nullable(z.string()),
  /** Dernière visite trop ancienne : une nouvelle visite précède le devis. */
  visitRequired: z.boolean(),
});
export type Renewal = z.infer<typeof renewalSchema>;

/** `CleaningProgram` tel que lu par le client (détail et liste). */
export const programDetailSchema = z.extend(programSchema, {
  customerKind: z.string(),
  organizationId: z.nullable(z.string()),
  /** `individual` (paiement après chaque séance) ou `organization` (facture mensuelle). */
  payerKind: z.string(),
  place: placeSummarySchema,
  cleaningTypes: z.array(typeRefSchema),
  schedule: schedulePlanSchema,
  sessionPrice: z.optional(moneySchema),
  total: z.optional(moneySchema),
  /** Vide sauf programme suspendu. */
  suspensionCauses: z.array(suspensionCauseSchema),
  renewal: z.nullable(renewalSchema),
  createdAt: z.string(),
});
export type ProgramDetail = z.infer<typeof programDetailSchema>;

export const programListSchema = z.object({
  data: z.array(programDetailSchema),
  nextCursor: z.nullable(z.string()),
  total: z.int(),
});
export type ProgramList = z.infer<typeof programListSchema>;

/** `CleaningChecklistItem` : point de la liste de contrôle, coché sur place par l'équipe. */
const checklistItemSchema = z.object({
  code: z.string(),
  label: z.string(),
  cleaningTypeCode: z.nullable(z.string()),
  checked: z.boolean(),
  checkedAt: z.nullable(z.string()),
});

/** `CleaningIncident` : incident sur place et décision du superviseur. */
const incidentSchema = z.object({
  id: z.string(),
  /** equipment, access, safety, out_of_scope_request, other. */
  category: z.string(),
  note: z.string(),
  photos: z.array(photoSchema),
  reportedAt: z.string(),
  /** pending, resumed, rescheduled, cancelled. */
  decision: z.string(),
  decidedAt: z.nullable(z.string()),
});
export type Incident = z.infer<typeof incidentSchema>;

export const sessionSchema = z.object({
  id: z.string(),
  programId: z.string(),
  /** PN-000057 : la séance ne porte ni le nom du lieu ni ses types. */
  programNumber: z.string(),
  /** Rang dans le programme : 3 pour « séance 3/15 ». */
  rank: z.int(),
  sessionsCount: z.int(),
  /** to_assign, assigned, in_progress, interrupted, completed, missed, suspended, cancelled. */
  status: z.string(),
  scheduledStart: z.string(),
  scheduledEnd: z.string(),
  /** not_due, due, paid, overdue, waived ; null pour une entreprise (facture mensuelle). */
  paymentStatus: z.nullable(z.string()),
  price: z.optional(moneySchema),
  /** Frais de visite déduits, moitié du prix pour une séance manquée ou annulée tard. */
  amountDue: optionalMoney,
  visitFeeDeduction: optionalMoney,
  /** Fin du délai de paiement. */
  dueBy: z.nullable(z.string()),
  agents: z.array(agentSchema),
  arrival: z.nullable(z.object({ arrivedAt: z.string() })),
  startedAt: z.nullable(z.string()),
  completedAt: z.nullable(z.string()),
  checklist: z.array(checklistItemSchema),
  /** Photos `before`, `after` et `incident`, liens temporaires. */
  photos: z.array(photoSchema),
  incidents: z.array(incidentSchema),
  /** Signature du client sur le téléphone de l'agent. */
  signed: z.boolean(),
  rating: z.nullable(z.object({ stars: z.int(), comment: z.nullable(z.string()), ratedAt: z.string() })),
  /** Anciennes dates d'une séance reportée (un report n'est pas un statut). */
  reschedules: z.array(
    z.object({
      previousStart: z.string(),
      newStart: z.string(),
      /** `customer` ou `ksp`. */
      by: z.string(),
      at: z.string(),
      reason: z.nullable(z.string()),
    }),
  ),
  cancellation: z.nullable(
    z.object({
      by: z.string(),
      /** Annulée tard, par le support : une partie du prix reste due. */
      late: z.boolean(),
      at: z.string(),
      /** customer, customer_late, ksp, no_agent, program_stopped. */
      cause: z.string(),
      reason: z.nullable(z.string()),
    }),
  ),
  /** Repasse gratuite décidée sur une réclamation. */
  isRedo: z.boolean(),
  /** Facture de la séance (particulier). */
  invoiceId: z.nullable(z.string()),
  claimIds: z.array(z.string()),
});
export type Session = z.infer<typeof sessionSchema>;

export const sessionListSchema = z.object({
  data: z.array(sessionSchema),
  nextCursor: z.nullable(z.string()),
  total: z.int(),
});
export type SessionList = z.infer<typeof sessionListSchema>;

export const claimSchema = z.object({
  id: z.string(),
  sessionId: z.string(),
  programId: z.string(),
  organizationId: z.nullable(z.string()),
  /** incomplete_work, damage, behavior, missing_item, other. */
  category: z.string(),
  text: z.string(),
  photos: z.array(photoSchema),
  /** open, in_progress, resolved, rejected. */
  status: z.string(),
  /** Dans l'ordre chronologique. */
  messages: z.array(
    z.object({
      id: z.string(),
      /** `customer` ou `staff`. */
      author: z.string(),
      text: z.string(),
      at: z.string(),
    }),
  ),
  decision: z.nullable(
    z.object({
      /** free_redo, wallet_credit, rejected. */
      outcome: z.string(),
      creditAmount: optionalMoney,
      /** Séance gratuite ajoutée au programme. */
      redoSessionId: z.nullable(z.string()),
      reason: z.string(),
      decidedAt: z.string(),
      /** not_required, pending (deuxième validation), approved. */
      approvalStatus: z.string(),
    }),
  ),
  openedAt: z.string(),
  firstResponseAt: z.nullable(z.string()),
  closedAt: z.nullable(z.string()),
});
export type Claim = z.infer<typeof claimSchema>;

export const claimListSchema = z.object({
  data: z.array(claimSchema),
  nextCursor: z.nullable(z.string()),
  total: z.int(),
});
export type ClaimList = z.infer<typeof claimListSchema>;
