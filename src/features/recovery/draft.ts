import { compactPhone, phoneFromInput } from '@/lib/phone';
import type { CaseInputBody, DebtorBody } from './api';
import type { PlanScale, RecoveryCase } from './schemas';

/*
 * Saisie d'un dossier de recouvrement (assistant `/mon-espace/recouvrement/nouveau` et modification d'un
 * brouillon ou d'un dossier en complément), gardée dans l'onglet (`sessionStorage`) pendant l'assistant.
 * Contrôle de forme et construction du corps envoyé (`RecoveryCaseInput`) : les règles (montant minimum,
 * tarifs, doublons, prescription) restent celles de la gateway ; ici, seulement ce qui évite un
 * aller-retour inutile. Les chemins des erreurs suivent ceux du service (`debtors.0.lastName`).
 */

export const DRAFT_KEY = 'ksp.recouvrement.nouveau';
const DRAFT_VERSION = 1;

/** Étapes de l'assistant : la saisie, l'enregistrement du brouillon, puis le mandat et les frais. */
export const STEPS = ['type', 'debtors', 'claims', 'evidence', 'effort', 'review', 'mandate', 'fee'] as const;
export type StepName = (typeof STEPS)[number];
/** Étapes de la saisie (modification d'un dossier existant). */
export const INPUT_STEPS: ReadonlyArray<StepName> = [
  'type',
  'debtors',
  'claims',
  'evidence',
  'effort',
  'review',
];

/** Limites du contrat (`RecoveryCaseInput`, `RecoveryDebtorInput`, `RecoveryClaimInput`). */
export const MAX_DEBTORS = 10;
export const MAX_CLAIMS = 200;
export const MAX_CONTACTS = 5;
export const MAX_EVIDENCE = 20;
export const MAX_PROMISES = 1000;
export const MAX_DESCRIPTION = 300;
export const MAX_COMPLETION_NOTE = 2000;
/** Pièces : finalité `recovery_evidence` du service file. */
export const EVIDENCE_TYPES = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'] as const;
export const EVIDENCE_MAX_BYTES = 10 * 1024 * 1024;

export type DebtorKind = 'person' | 'company';
export type DebtorRole = 'main' | 'co_debtor' | 'guarantor';

export interface DebtorDraft {
  kind: DebtorKind;
  role: DebtorRole;
  firstNames: string;
  lastName: string;
  legalName: string;
  ifu: string;
  rccm: string;
  representativeName: string;
  /** Saisie brute (« 01 97 00 00 45 ») ; normalisée à l'envoi. */
  phones: string[];
  emails: string[];
  address: string;
}

export interface ClaimDraft {
  reference: string;
  /** Texte d'un montant entier en FCFA. */
  amount: string;
  /** AAAA-MM-JJ. */
  dueDate: string;
  description: string;
}

export interface PickedPiece {
  id: string;
  name: string;
}

/** Barème saisi : textes des champs ; les taux en pourcentage (points de base à l'envoi). */
export interface ScaleDraft {
  acceptsPaymentPlan: boolean;
  maxDurationMonths: string;
  minFirstPaymentPercent: string;
  firstPaymentWithinDays: string;
  minInstallment: string;
  maxDiscountPercent: string;
}

export interface EffortDraft {
  remindersCount: string;
  lastReminderDate: string;
  channels: string[];
  debtAcknowledged: boolean;
  /** Preuve de la reconnaissance de dette (facultative). */
  acknowledgment: PickedPiece[];
  promisesReceived: string;
  preserveRelationship: boolean;
}

export interface CaseDraft {
  version: typeof DRAFT_VERSION;
  kind: '' | 'b2b' | 'b2c';
  nature: string;
  debtors: DebtorDraft[];
  claims: ClaimDraft[];
  interests: string;
  alreadyPaid: string;
  evidence: PickedPiece[];
  /** Pièces déjà rattachées au dossier (modification) : gardées par le service, jamais retirées. */
  lockedEvidence: PickedPiece[];
  effort: EffortDraft;
  /** Barème de l'échéancier ; null tant que les préférences ne sont pas lues (il n'est alors pas envoyé). */
  scale: ScaleDraft | null;
  step: StepName;
  /** Brouillon enregistré par la gateway : les modifications suivantes le mettent à jour. */
  caseId: string | null;
  /** Numéro du brouillon enregistré (`RC-000123`). */
  caseNumber: string | null;
  /** Corps envoyé au dernier enregistrement réussi : sans changement, rien n'est renvoyé. */
  saved: string | null;
  /** Dossiers ouverts semblables signalés à la création (`possibleDuplicates`). */
  duplicates: Array<{ id: string; number: string; debtorName: string }>;
}

export function emptyDebtor(role: DebtorRole = 'main'): DebtorDraft {
  return {
    kind: 'company',
    role,
    firstNames: '',
    lastName: '',
    legalName: '',
    ifu: '',
    rccm: '',
    representativeName: '',
    phones: [''],
    emails: [''],
    address: '',
  };
}

export const emptyClaim = (): ClaimDraft => ({ reference: '', amount: '', dueDate: '', description: '' });

export function emptyDraft(): CaseDraft {
  return {
    version: DRAFT_VERSION,
    kind: '',
    nature: '',
    debtors: [emptyDebtor()],
    claims: [emptyClaim()],
    interests: '',
    alreadyPaid: '',
    evidence: [],
    lockedEvidence: [],
    effort: {
      remindersCount: '0',
      lastReminderDate: '',
      channels: [],
      debtAcknowledged: false,
      acknowledgment: [],
      promisesReceived: '',
      preserveRelationship: false,
    },
    scale: null,
    step: 'type',
    caseId: null,
    caseNumber: null,
    saved: null,
    duplicates: [],
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
export function readDraft(): CaseDraft | null {
  try {
    const raw = storage()?.getItem(DRAFT_KEY);
    if (!raw) return null;
    const value = JSON.parse(raw) as Partial<CaseDraft>;
    if (value?.version !== DRAFT_VERSION) return null;
    const empty = emptyDraft();
    const step = STEPS.includes(value.step as StepName) ? (value.step as StepName) : 'type';
    return {
      ...empty,
      ...value,
      debtors: value.debtors?.length ? value.debtors : empty.debtors,
      claims: value.claims?.length ? value.claims : empty.claims,
      effort: { ...empty.effort, ...value.effort },
      step,
    } as CaseDraft;
  } catch {
    return null;
  }
}

export function writeDraft(draft: CaseDraft): void {
  try {
    storage()?.setItem(DRAFT_KEY, JSON.stringify(draft));
  } catch {
    // Stockage plein ou bloqué : l'assistant continue sans brouillon local.
  }
}

export function clearDraft(): void {
  try {
    storage()?.removeItem(DRAFT_KEY);
  } catch {
    // Rien à faire.
  }
}

/* ——— Barème ——— */

const percent = (bps: number) => String(bps / 100).replace('.', ',');

export function scaleToDraft(scale: PlanScale): ScaleDraft {
  return {
    acceptsPaymentPlan: scale.acceptsPaymentPlan,
    maxDurationMonths: String(scale.maxDurationMonths),
    minFirstPaymentPercent: percent(scale.minFirstPaymentBps),
    firstPaymentWithinDays: String(scale.firstPaymentWithinDays),
    minInstallment: String(scale.minInstallment.amount),
    maxDiscountPercent: percent(scale.maxDiscountBps),
  };
}

/** Entier saisi (espaces de milliers acceptés), ou null. */
export function readInteger(value: string): number | null {
  const text = value.replace(/[\s\u00a0\u202f]/g, '');
  if (!/^\d{1,13}$/.test(text)) return null;
  const number = Number(text);
  return Number.isSafeInteger(number) ? number : null;
}

/** Pourcentage saisi (« 10 », « 12,5 ») → points de base, ou null (deux décimales au plus). */
export function readPercent(value: string): number | null {
  const text = value.replace(/[\s%]/g, '').replace(',', '.');
  if (!/^\d{1,3}(\.\d{1,2})?$/.test(text)) return null;
  return Math.round(Number(text) * 100);
}

/** Barème saisi → corps du contrat (bornes de `RecoveryPlanScale`), ou erreurs par champ. */
export function scaleFromDraft(
  draft: ScaleDraft,
  prefix = 'planScale',
): { scale: PlanScale } | { errors: Record<string, string> } {
  const errors: Record<string, string> = {};
  const months = readInteger(draft.maxDurationMonths);
  const first = readPercent(draft.minFirstPaymentPercent);
  const within = readInteger(draft.firstPaymentWithinDays);
  const installment = readInteger(draft.minInstallment);
  const discount = readPercent(draft.maxDiscountPercent);
  if (months === null || months < 1 || months > 36) errors[`${prefix}.maxDurationMonths`] = 'De 1 à 36 mois.';
  if (first === null || first > 10000) errors[`${prefix}.minFirstPaymentBps`] = 'De 0 à 100 %.';
  if (within === null || within < 1 || within > 90) {
    errors[`${prefix}.firstPaymentWithinDays`] = 'De 1 à 90 jours.';
  }
  if (installment === null) errors[`${prefix}.minInstallment`] = 'Montant entier en FCFA.';
  if (discount === null || discount > 10000) errors[`${prefix}.maxDiscountBps`] = 'De 0 à 100 %.';
  if (Object.keys(errors).length) return { errors };
  return {
    scale: {
      acceptsPaymentPlan: draft.acceptsPaymentPlan,
      maxDurationMonths: months!,
      minFirstPaymentBps: first!,
      firstPaymentWithinDays: within!,
      minInstallment: { amount: installment!, currency: 'XOF' },
      maxDiscountBps: discount!,
    },
  };
}

/* ——— Contrôles par étape ——— */

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const DAY = /^\d{4}-\d{2}-\d{2}$/;

/** Téléphone d'un débiteur : la forme envoyée, et si elle diffère de la saisie (ancien numéro, indicatif). */
export function readDebtorPhone(value: string): { phone: string | null; shown: boolean } {
  const phone = phoneFromInput(value);
  return { phone, shown: phone !== null && phone !== compactPhone(value) };
}

function checkDebtors(draft: CaseDraft): Record<string, string> {
  const errors: Record<string, string> = {};
  draft.debtors.forEach((debtor, index) => {
    const at = `debtors.${index}`;
    if (debtor.kind === 'person' && !debtor.lastName.trim()) errors[`${at}.lastName`] = 'Nom obligatoire.';
    if (debtor.kind === 'company' && !debtor.legalName.trim()) {
      errors[`${at}.legalName`] = 'Raison sociale obligatoire.';
    }
    const phones = debtor.phones.map((value) => value.trim()).filter(Boolean);
    const emails = debtor.emails.map((value) => value.trim()).filter(Boolean);
    debtor.phones.forEach((value, i) => {
      if (value.trim() && !phoneFromInput(value))
        errors[`${at}.phones.${i}`] = 'Numéro de téléphone invalide.';
    });
    debtor.emails.forEach((value, i) => {
      if (value.trim() && !EMAIL.test(value.trim())) errors[`${at}.emails.${i}`] = 'Adresse e-mail invalide.';
    });
    if (!phones.length && !emails.length) {
      errors[`${at}.phones.0`] = 'Un téléphone ou un e-mail au moins, pour joindre le débiteur.';
    }
  });
  const mains = draft.debtors.filter((debtor) => debtor.role === 'main').length;
  if (mains !== 1) errors['debtors'] = 'Un débiteur principal, et un seul.';
  return errors;
}

function checkClaims(draft: CaseDraft, today: string): Record<string, string> {
  const errors: Record<string, string> = {};
  const seen = new Set<string>();
  draft.claims.forEach((claim, index) => {
    const at = `claims.${index}`;
    const reference = claim.reference.trim();
    if (!reference) errors[`${at}.reference`] = 'Référence obligatoire (numéro de facture, de contrat…).';
    else if (seen.has(reference.toLowerCase())) errors[`${at}.reference`] = 'Référence en double.';
    seen.add(reference.toLowerCase());
    const amount = readInteger(claim.amount);
    if (amount === null || amount < 1) errors[`${at}.amount`] = 'Montant entier en FCFA.';
    if (!DAY.test(claim.dueDate)) errors[`${at}.dueDate`] = 'Date d’exigibilité obligatoire.';
    else if (claim.dueDate > today) errors[`${at}.dueDate`] = 'La date d’exigibilité doit être atteinte.';
  });
  if (draft.interests.trim() && readInteger(draft.interests) === null) {
    errors['interests'] = 'Montant entier en FCFA.';
  }
  if (draft.alreadyPaid.trim() && readInteger(draft.alreadyPaid) === null) {
    errors['alreadyPaid'] = 'Montant entier en FCFA.';
  }
  return errors;
}

function checkEffort(draft: CaseDraft, today: string): Record<string, string> {
  const errors: Record<string, string> = {};
  const count = readInteger(draft.effort.remindersCount);
  if (count === null || count > 1000) errors['priorEffort.remindersCount'] = 'Nombre de 0 à 1 000.';
  const last = draft.effort.lastReminderDate;
  if (last && (!DAY.test(last) || last > today)) {
    errors['priorEffort.lastReminderDate'] = 'Date passée attendue.';
  }
  if (draft.scale) {
    const scale = scaleFromDraft(draft.scale);
    if ('errors' in scale) Object.assign(errors, scale.errors);
  }
  return errors;
}

/** Contrôle d'une étape avant de passer à la suivante. `today` : AAAA-MM-JJ au Bénin. */
export function checkStep(draft: CaseDraft, step: StepName, today: string): Record<string, string> {
  if (step === 'type') {
    const errors: Record<string, string> = {};
    if (!draft.kind) errors['kind'] = 'Choisissez le type de débiteur.';
    if (!draft.nature) errors['nature'] = 'Choisissez la nature de la créance.';
    return errors;
  }
  if (step === 'debtors') return checkDebtors(draft);
  if (step === 'claims') return checkClaims(draft, today);
  if (step === 'evidence') {
    const count = draft.evidence.length + draft.lockedEvidence.length;
    if (!count) return { evidenceFileIds: 'Ajoutez au moins une pièce qui prouve la créance.' };
    return count > MAX_EVIDENCE ? { evidenceFileIds: `${MAX_EVIDENCE} pièces au plus.` } : {};
  }
  if (step === 'effort') return checkEffort(draft, today);
  return {};
}

/** Étape où corriger un champ refusé (chemin pointé du service ou de la gateway). */
export function stepOfField(field: string): StepName {
  const root = field.split('.')[0] ?? '';
  if (root === 'kind' || root === 'nature') return 'type';
  if (root === 'debtors') return 'debtors';
  if (root === 'claims' || root === 'interests' || root === 'alreadyPaid') return 'claims';
  if (root === 'evidenceFileIds') return 'evidence';
  if (root === 'priorEffort' || root === 'planScale') return 'effort';
  return 'review';
}

/* ——— Corps envoyé ——— */

const optional = (value: string) => value.trim() || undefined;
const money = (amount: number) => ({ amount, currency: 'XOF' as const });

function debtorBody(debtor: DebtorDraft): DebtorBody {
  const person = debtor.kind === 'person';
  return {
    kind: debtor.kind,
    role: debtor.role,
    ...(person
      ? { firstNames: optional(debtor.firstNames), lastName: optional(debtor.lastName) }
      : {
          legalName: optional(debtor.legalName),
          ifu: optional(debtor.ifu),
          rccm: optional(debtor.rccm),
          representativeName: optional(debtor.representativeName),
        }),
    phones: debtor.phones.map((value) => phoneFromInput(value)).filter((value): value is string => !!value),
    emails: debtor.emails.map((value) => value.trim().toLowerCase()).filter(Boolean),
    address: optional(debtor.address),
  };
}

/** Somme saisie (créances + intérêts − déjà payé), envoyée telle quelle à l'estimation ; null si incomplète. */
export function declaredAmount(draft: CaseDraft): number | null {
  let total = 0;
  for (const claim of draft.claims) {
    const amount = readInteger(claim.amount);
    if (amount === null || amount < 1) return null;
    total += amount;
  }
  total += readInteger(draft.interests) ?? 0;
  total -= readInteger(draft.alreadyPaid) ?? 0;
  return total > 0 ? total : null;
}

/** Saisie complète → `RecoveryCaseInput`, ou les erreurs de la première étape en défaut. */
export function caseBody(
  draft: CaseDraft,
  today: string,
): { body: CaseInputBody } | { errors: Record<string, string> } {
  for (const step of INPUT_STEPS) {
    const errors = checkStep(draft, step, today);
    if (Object.keys(errors).length) return { errors };
  }
  const effort = draft.effort;
  const scale = draft.scale ? scaleFromDraft(draft.scale) : null;
  const interests = readInteger(draft.interests);
  const alreadyPaid = readInteger(draft.alreadyPaid);
  return {
    body: {
      kind: draft.kind as 'b2b' | 'b2c',
      nature: draft.nature,
      debtors: draft.debtors.map(debtorBody),
      claims: draft.claims.map((claim) => ({
        reference: claim.reference.trim(),
        amount: money(readInteger(claim.amount)!),
        dueDate: claim.dueDate,
        description: optional(claim.description),
      })),
      ...(interests ? { interests: money(interests) } : {}),
      ...(alreadyPaid ? { alreadyPaid: money(alreadyPaid) } : {}),
      priorEffort: {
        remindersCount: readInteger(effort.remindersCount) ?? 0,
        lastReminderDate: effort.lastReminderDate || undefined,
        channels: effort.channels,
        debtAcknowledged: effort.debtAcknowledged,
        acknowledgmentFileId: effort.debtAcknowledged ? effort.acknowledgment[0]?.id : undefined,
        promisesReceived: optional(effort.promisesReceived),
        preserveRelationship: effort.preserveRelationship,
      },
      ...(scale && 'scale' in scale ? { planScale: scale.scale } : {}),
      evidenceFileIds: [...draft.lockedEvidence, ...draft.evidence].map((piece) => piece.id),
    },
  };
}

/* ——— Dossier existant → saisie (modification) ——— */

/** Saisie d'un dossier lu (brouillon ou complément demandé) ; les pièces déjà rattachées sont gardées. */
export function draftFromCase(recoveryCase: RecoveryCase): CaseDraft {
  const empty = emptyDraft();
  const effort = recoveryCase.priorEffort;
  return {
    ...empty,
    kind: recoveryCase.kind === 'b2c' ? 'b2c' : recoveryCase.kind === 'b2b' ? 'b2b' : '',
    nature: recoveryCase.nature,
    debtors: recoveryCase.debtors.map((debtor) => ({
      kind: debtor.kind === 'person' ? 'person' : 'company',
      role: debtor.role === 'co_debtor' || debtor.role === 'guarantor' ? debtor.role : 'main',
      firstNames: debtor.firstNames ?? '',
      lastName: debtor.lastName ?? '',
      legalName: debtor.legalName ?? '',
      ifu: debtor.ifu ?? '',
      rccm: debtor.rccm ?? '',
      representativeName: debtor.representativeName ?? '',
      phones: debtor.phones.length ? [...debtor.phones] : [''],
      emails: debtor.emails.length ? [...debtor.emails] : [''],
      address: debtor.address ?? '',
    })),
    claims: recoveryCase.claims.map((claim) => ({
      reference: claim.reference,
      amount: String(claim.amount.amount),
      dueDate: claim.dueDate,
      description: claim.description ?? '',
    })),
    interests: recoveryCase.amounts.interests.amount ? String(recoveryCase.amounts.interests.amount) : '',
    alreadyPaid: recoveryCase.amounts.paid.amount ? String(recoveryCase.amounts.paid.amount) : '',
    evidence: [],
    lockedEvidence: recoveryCase.documents
      .filter((document) => document.kind === 'evidence' && document.fileId)
      .map((document) => ({ id: document.fileId!, name: document.label })),
    effort: {
      remindersCount: String(effort.remindersCount),
      lastReminderDate: effort.lastReminderDate ?? '',
      channels: [...effort.channels],
      debtAcknowledged: effort.debtAcknowledged,
      acknowledgment: effort.acknowledgmentFileId
        ? [{ id: effort.acknowledgmentFileId, name: 'Preuve déjà jointe' }]
        : [],
      promisesReceived: effort.promisesReceived ?? '',
      preserveRelationship: effort.preserveRelationship,
    },
    scale: scaleToDraft(recoveryCase.planScale),
    step: 'type',
    caseId: recoveryCase.id,
    caseNumber: recoveryCase.number,
  };
}
