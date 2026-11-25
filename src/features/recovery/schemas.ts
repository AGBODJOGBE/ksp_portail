import * as z from 'zod/mini';

/*
 * Recouvrement lu par le créancier (contrat `ksp-api.v1.yaml`, routes `/api/v1/recovery/*`, ADR-060 à
 * 062), champ par champ : un champ obligatoire absent rend la réponse invalide, un champ ajouté est ignoré,
 * un état, une étape ou une nature inconnus s'affichent avec un libellé neutre (chaînes, pas
 * d'énumérations fermées). Schémas lus dans le navigateur : `zod/mini`.
 *
 * Volontairement non lus (absents des schémas, donc jamais gardés par le front) : `score` (décision : il
 * n'est pas montré au créancier), `partnerAssignment` (espace pro), et les objets des décisions et des
 * étapes payantes (`promises`, `disputes`, `notices`, `feeQuotes`, `provisions`), affichés avec les
 * décisions (lot suivant).
 */

export const moneySchema = z.object({ amount: z.int(), currency: z.literal('XOF') });
export type Money = z.infer<typeof moneySchema>;

/** `RecoveryActor` : auteur d'une action (`staff`, `creditor`, `debtor`, `partner`, `system`). */
const actorSchema = z.object({
  type: z.string(),
  userId: z.nullable(z.string()),
  displayName: z.nullable(z.string()),
});
export type RecoveryActor = z.infer<typeof actorSchema>;

/** `RecoveryParty` : titulaire du dossier, compte (`user`) ou organisation. */
const partySchema = z.object({ type: z.string(), id: z.string(), displayName: z.string() });

/** `RecoveryDebtor` : personne (`person`) ou société (`company`) ; rôle `main`, `co_debtor`, `guarantor`. */
export const debtorSchema = z.object({
  id: z.string(),
  kind: z.string(),
  role: z.string(),
  displayName: z.string(),
  firstNames: z.nullable(z.string()),
  lastName: z.nullable(z.string()),
  legalName: z.nullable(z.string()),
  ifu: z.nullable(z.string()),
  rccm: z.nullable(z.string()),
  representativeName: z.nullable(z.string()),
  phones: z.array(z.string()),
  emails: z.array(z.string()),
  address: z.nullable(z.string()),
  communeKey: z.nullable(z.string()),
});
export type RecoveryDebtor = z.infer<typeof debtorSchema>;

export const claimSchema = z.object({
  id: z.string(),
  reference: z.string(),
  amount: moneySchema,
  dueDate: z.string(),
  description: z.nullable(z.string()),
});
export type RecoveryClaim = z.infer<typeof claimSchema>;

/** `RecoveryPriorEffort` : démarches déjà faites par le créancier. */
export const priorEffortSchema = z.object({
  remindersCount: z.int(),
  lastReminderDate: z.optional(z.nullable(z.string())),
  /** `phone`, `sms`, `whatsapp`, `email`, `letter`, `visit`. */
  channels: z.array(z.string()),
  debtAcknowledged: z.boolean(),
  acknowledgmentFileId: z.optional(z.nullable(z.string())),
  promisesReceived: z.optional(z.nullable(z.string())),
  preserveRelationship: z.boolean(),
});
export type PriorEffort = z.infer<typeof priorEffortSchema>;

/** `RecoveryPlanScale` : barème d'échéancier accepté par le créancier (points de base : 1 000 = 10 %). */
export const planScaleSchema = z.object({
  acceptsPaymentPlan: z.boolean(),
  maxDurationMonths: z.int(),
  minFirstPaymentBps: z.int(),
  firstPaymentWithinDays: z.int(),
  minInstallment: moneySchema,
  maxDiscountBps: z.int(),
});
export type PlanScale = z.infer<typeof planScaleSchema>;

/** `RecoveryCaseAmounts` : montants calculés par recovery. */
const amountsSchema = z.object({
  principal: moneySchema,
  interests: moneySchema,
  costs: moneySchema,
  paid: moneySchema,
  waived: moneySchema,
  due: moneySchema,
  overpaid: moneySchema,
});

/** `RecoveryCaseDocument` : pièce du dossier (justificatif, mandat, relevé…). */
export const caseDocumentSchema = z.object({
  id: z.string(),
  kind: z.string(),
  fileId: z.nullable(z.string()),
  documentId: z.nullable(z.string()),
  label: z.string(),
  addedBy: actorSchema,
  addedAt: z.string(),
  visibleToDebtor: z.boolean(),
});
export type RecoveryCaseDocument = z.infer<typeof caseDocumentSchema>;

const installmentSchema = z.object({
  id: z.nullable(z.string()),
  rank: z.int(),
  dueDate: z.string(),
  amount: moneySchema,
  paidAmount: moneySchema,
  /** `upcoming`, `due`, `paid`, `partial`, `missed`. */
  status: z.string(),
  paidAt: z.nullable(z.string()),
});

/** `RecoveryPaymentPlan` : échéancier en cours, réduit à ce que montre la fiche. */
const paymentPlanSchema = z.object({
  id: z.string(),
  status: z.string(),
  total: moneySchema,
  installments: z.array(installmentSchema),
  missedCount: z.int(),
  signedAt: z.nullable(z.string()),
});

/** `RecoveryCollection` : encaissement (brut, commission, net crédité au portefeuille). */
const collectionSchema = z.object({
  id: z.string(),
  source: z.string(),
  gross: moneySchema,
  commission: moneySchema,
  netToCreditor: moneySchema,
  stage: z.string(),
  receivedAt: z.string(),
  walletTransactionId: z.nullable(z.string()),
  receiptDocumentId: z.nullable(z.string()),
});
export type RecoveryCollection = z.infer<typeof collectionSchema>;

/** `RecoveryCaseFee` : frais de dossier (`unpaid`, `paid`, `refunded`), tels que les renvoie recovery. */
const caseFeeSchema = z.object({
  amount: moneySchema,
  status: z.string(),
  paidAt: z.nullable(z.string()),
  refundedAmount: moneySchema,
  walletTransactionId: z.nullable(z.string()),
});
export type RecoveryCaseFee = z.infer<typeof caseFeeSchema>;

/** `RecoveryFrozenPricing` : règles figées au mandat, commission en clair. */
const frozenPricingSchema = z.object({
  feeRuleId: z.string(),
  feeRuleVersion: z.int(),
  commissionRuleId: z.string(),
  commissionRuleVersion: z.int(),
  commissionSummary: z.string(),
});

/** `RecoveryMandate` : `pending_signature` ou `signed`. */
const mandateSchema = z.object({
  documentId: z.string(),
  signatureRequestId: z.nullable(z.string()),
  status: z.string(),
  signedAt: z.nullable(z.string()),
});

const stageTransitionSchema = z.object({
  fromStage: z.nullable(z.string()),
  toStage: z.string(),
  at: z.string(),
  by: actorSchema,
  reason: z.nullable(z.string()),
  skipReason: z.nullable(z.string()),
});

/** `RecoveryDeadline` : prochaine échéance (`fee_payment`, `review`, `info_completion`…). */
const deadlineSchema = z.object({ kind: z.string(), dueAt: z.string() });
export type RecoveryDeadline = z.infer<typeof deadlineSchema>;

const closureSchema = z.object({
  reason: z.string(),
  note: z.nullable(z.string()),
  closedAt: z.string(),
  closedBy: actorSchema,
  settlementCertificateDocumentId: z.nullable(z.string()),
});

/** `RecoveryCase` : fiche d'un dossier. */
export const caseSchema = z.object({
  id: z.string(),
  /** `RC-000123`. */
  number: z.string(),
  /** `b2b`, `b2c`, `rent`. */
  kind: z.string(),
  nature: z.string(),
  /** `draft`, `awaiting_fee`, `under_review`, `info_requested`, `active`, `suspended`, `closed`, `rejected`. */
  status: z.string(),
  /** Étape d'un dossier actif ou suspendu ; null avant l'acceptation. */
  stage: z.nullable(z.string()),
  creditor: partySchema,
  debtors: z.array(debtorSchema),
  claims: z.array(claimSchema),
  priorEffort: priorEffortSchema,
  planScale: planScaleSchema,
  amounts: amountsSchema,
  prescriptionDate: z.nullable(z.string()),
  assignedAgent: z.nullable(actorSchema),
  mandate: z.nullable(mandateSchema),
  fee: z.nullable(caseFeeSchema),
  pricing: z.nullable(frozenPricingSchema),
  currentPlan: z.nullable(paymentPlanSchema),
  collections: z.array(collectionSchema),
  documents: z.array(caseDocumentSchema),
  stageHistory: z.array(stageTransitionSchema),
  nextDeadline: z.nullable(deadlineSchema),
  /** Motif du complément demandé ou du refus. */
  reviewNote: z.nullable(z.string()),
  /** `prescribed`, `illegal`, `no_evidence`, `debtor_unreachable`, `other`, `incomplete`. */
  rejectionReason: z.nullable(z.string()),
  closure: z.nullable(closureSchema),
  /** `form`, `import`, `rental`. */
  source: z.string(),
  createdAt: z.string(),
  submittedAt: z.nullable(z.string()),
  acceptedAt: z.nullable(z.string()),
  updatedAt: z.string(),
});
export type RecoveryCase = z.infer<typeof caseSchema>;

/** `RecoveryCaseSummary` : un dossier dans une liste. */
export const caseSummarySchema = z.object({
  id: z.string(),
  number: z.string(),
  kind: z.string(),
  status: z.string(),
  stage: z.nullable(z.string()),
  creditor: partySchema,
  /** Débiteur principal. */
  debtorName: z.string(),
  due: moneySchema,
  paid: moneySchema,
  nextDeadline: z.nullable(deadlineSchema),
  lastActionAt: z.nullable(z.string()),
  createdAt: z.string(),
});
export type RecoveryCaseSummary = z.infer<typeof caseSummarySchema>;

export const casePageSchema = z.object({
  cases: z.array(caseSummarySchema),
  nextCursor: z.nullable(z.string()),
  total: z.int(),
});
export type RecoveryCasePage = z.infer<typeof casePageSchema>;

/** `RecoveryJournalEntry` : action horodatée et attribuée (sans les notes internes de KSP). */
export const journalEntrySchema = z.object({
  id: z.string(),
  kind: z.string(),
  channel: z.nullable(z.string()),
  direction: z.nullable(z.string()),
  outcome: z.nullable(z.string()),
  deliveryStatus: z.nullable(z.string()),
  summary: z.string(),
  amount: z.nullable(moneySchema),
  author: actorSchema,
  internal: z.boolean(),
  documentId: z.nullable(z.string()),
  fileId: z.nullable(z.string()),
  occurredAt: z.string(),
});
export type RecoveryJournalEntry = z.infer<typeof journalEntrySchema>;

export const journalPageSchema = z.object({
  entries: z.array(journalEntrySchema),
  nextCursor: z.nullable(z.string()),
});

/** `RecoveryCreditorDashboard`. */
export const dashboardSchema = z.object({
  entrusted: moneySchema,
  recovered: moneySchema,
  outstanding: moneySchema,
  /** Recouvré / confié, en points de base. */
  recoveryRateBps: z.int(),
  casesByStage: z.array(z.object({ stage: z.string(), count: z.int() })),
  pendingDecisions: z.int(),
  upcomingInstallments: z.array(
    z.object({
      caseId: z.string(),
      caseNumber: z.string(),
      debtorName: z.string(),
      dueDate: z.string(),
      amount: moneySchema,
    }),
  ),
});
export type RecoveryDashboard = z.infer<typeof dashboardSchema>;

/** `RecoveryCreditorPreferences` (`notifyUserIds` lu mais jamais montré : notification ne s'en sert pas). */
export const preferencesSchema = z.object({
  b2bScale: planScaleSchema,
  b2cScale: planScaleSchema,
  notifyUserIds: z.array(z.string()),
});
export type RecoveryPreferences = z.infer<typeof preferencesSchema>;

/** `RecoveryFeeEstimate` : frais et commission qui seront figés au mandat. */
export const feeEstimateSchema = z.object({
  caseFee: moneySchema,
  commissionSummary: z.string(),
  /** Taux par groupe d'étapes (`amicable`, `formal_notice`, `litigation`) d'une commission par étape. */
  stageRates: z.array(z.object({ stageGroup: z.string(), rateBps: z.int() })),
  minimumAmountDue: moneySchema,
  pricing: frozenPricingSchema,
});
export type RecoveryFeeEstimate = z.infer<typeof feeEstimateSchema>;

/** `RecoveryCaseCreated` : brouillon créé, dossiers ouverts semblables (sans blocage). */
export const caseCreatedSchema = z.object({
  case: caseSchema,
  possibleDuplicates: z.array(caseSummarySchema),
});
export type RecoveryCaseCreated = z.infer<typeof caseCreatedSchema>;

/** `RecoveryMandatePrepared` : mandat produit, code de signature envoyé au créancier. */
export const mandatePreparedSchema = z.object({
  case: caseSchema,
  documentId: z.string(),
  signatureRequestId: z.string(),
});
export type RecoveryMandatePrepared = z.infer<typeof mandatePreparedSchema>;
