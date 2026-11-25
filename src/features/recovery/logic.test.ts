import { ApiError } from '@/lib/api';
import {
  type CaseDraft,
  caseBody,
  checkStep,
  declaredAmount,
  draftFromCase,
  emptyDebtor,
  emptyDraft,
  readPercent,
  scaleFromDraft,
  scaleToDraft,
  stepOfField,
} from './draft';
import { PRICING_UNAVAILABLE, describeRecoveryError, normalizeField } from './errors';
import {
  CASE_ID,
  FILE_ID,
  recoveryCase,
  scale,
  stubGateway,
  summary,
  page,
  withMandate,
} from './fixtures.test-utils';
import { loadRecoveryTodo, todoCount } from './overview';
import { caseSchema } from './schemas';
import { formatRate } from './texts';

const TODAY = '2026-11-25';

/** Saisie complète et valide (une société, une créance, une pièce). */
function filled(patch: Partial<CaseDraft> = {}): CaseDraft {
  return {
    ...emptyDraft(),
    kind: 'b2b',
    nature: 'unpaid_invoice',
    debtors: [{ ...emptyDebtor(), legalName: 'SARL Exemple', phones: ['97 00 00 45'], emails: [''] }],
    claims: [{ reference: 'FA-1', amount: '850 000', dueDate: '2026-08-31', description: '' }],
    evidence: [{ id: FILE_ID, name: 'facture.pdf' }],
    scale: scaleToDraft(scale()),
    ...patch,
  };
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('saisie d’un dossier', () => {
  it('corps envoyé : téléphone béninois à 10 chiffres, montants entiers, barème en points de base', () => {
    const built = caseBody(filled(), TODAY);
    expect('body' in built && built.body).toEqual({
      kind: 'b2b',
      nature: 'unpaid_invoice',
      debtors: [
        {
          kind: 'company',
          role: 'main',
          legalName: 'SARL Exemple',
          ifu: undefined,
          rccm: undefined,
          representativeName: undefined,
          phones: ['+2290197000045'],
          emails: [],
          address: undefined,
        },
      ],
      claims: [
        {
          reference: 'FA-1',
          amount: { amount: 850000, currency: 'XOF' },
          dueDate: '2026-08-31',
          description: undefined,
        },
      ],
      priorEffort: {
        remindersCount: 0,
        lastReminderDate: undefined,
        channels: [],
        debtAcknowledged: false,
        acknowledgmentFileId: undefined,
        promisesReceived: undefined,
        preserveRelationship: false,
      },
      planScale: scale(),
      evidenceFileIds: [FILE_ID],
    });
  });

  it('contrôles par étape : type, débiteurs, créances, pièces, barème', () => {
    expect(checkStep(emptyDraft(), 'type', TODAY)).toEqual({
      kind: 'Choisissez le type de débiteur.',
      nature: 'Choisissez la nature de la créance.',
    });
    const debtors = checkStep(
      filled({
        debtors: [
          { ...emptyDebtor(), kind: 'person', phones: ['12'], emails: ['pas-un-email'] },
          { ...emptyDebtor(), role: 'main', legalName: 'Autre', phones: [''], emails: [''] },
        ],
      }),
      'debtors',
      TODAY,
    );
    expect(debtors).toMatchObject({
      'debtors.0.lastName': 'Nom obligatoire.',
      'debtors.0.phones.0': 'Numéro de téléphone invalide.',
      'debtors.0.emails.0': 'Adresse e-mail invalide.',
      'debtors.1.phones.0': expect.stringContaining('Un téléphone ou un e-mail'),
      debtors: 'Un débiteur principal, et un seul.',
    });
    const claims = checkStep(
      filled({
        claims: [
          { reference: 'FA-1', amount: '1,5', dueDate: '2026-12-31', description: '' },
          { reference: 'fa-1', amount: '100', dueDate: '', description: '' },
        ],
      }),
      'claims',
      TODAY,
    );
    expect(claims).toEqual({
      'claims.0.amount': 'Montant entier en FCFA.',
      'claims.0.dueDate': 'La date d’exigibilité doit être atteinte.',
      'claims.1.reference': 'Référence en double.',
      'claims.1.dueDate': 'Date d’exigibilité obligatoire.',
    });
    expect(checkStep(filled({ evidence: [] }), 'evidence', TODAY)).toEqual({
      evidenceFileIds: 'Ajoutez au moins une pièce qui prouve la créance.',
    });
    expect(
      checkStep(filled({ scale: { ...scaleToDraft(scale()), maxDurationMonths: '40' } }), 'effort', TODAY),
    ).toEqual({ 'planScale.maxDurationMonths': 'De 1 à 36 mois.' });
  });

  it('pourcentages saisis → points de base ; barème sans préférences : pas envoyé', () => {
    expect(readPercent('12,5')).toBe(1250);
    expect(readPercent('10 %')).toBe(1000);
    expect(readPercent('1,234')).toBeNull();
    expect(formatRate(1250)).toBe('12,5 %');
    const built = scaleFromDraft({ ...scaleToDraft(scale()), minFirstPaymentPercent: '12,5' });
    expect('scale' in built && built.scale.minFirstPaymentBps).toBe(1250);
    const withoutScale = caseBody(filled({ scale: null }), TODAY);
    expect('body' in withoutScale && withoutScale.body.planScale).toBeUndefined();
  });

  it('montant déclaré pour l’estimation : créances + intérêts − déjà payé, null si incomplet', () => {
    expect(declaredAmount(filled({ interests: '50000', alreadyPaid: '100000' }))).toBe(800000);
    expect(
      declaredAmount(filled({ claims: [{ reference: 'A', amount: '', dueDate: '', description: '' }] })),
    ).toBeNull();
  });

  it('étape à corriger d’après le chemin refusé', () => {
    expect(stepOfField('debtors.0.phones.1')).toBe('debtors');
    expect(stepOfField('claims.2.dueDate')).toBe('claims');
    expect(stepOfField('alreadyPaid')).toBe('claims');
    expect(stepOfField('evidenceFileIds')).toBe('evidence');
    expect(stepOfField('planScale.maxDurationMonths')).toBe('effort');
    expect(stepOfField('kind')).toBe('type');
    expect(stepOfField('inconnu')).toBe('review');
  });

  it('dossier existant → saisie : pièces déjà déposées gardées, renvoyées avec les nouvelles', () => {
    const parsed = caseSchema.parse(withMandate());
    const draft = draftFromCase(parsed);
    expect(draft.lockedEvidence).toEqual([{ id: FILE_ID, name: 'Justificatif 1' }]);
    expect(draft.caseId).toBe(CASE_ID);
    expect(draft.debtors[0]?.legalName).toBe('SARL Exemple Distribution');
    const built = caseBody({ ...draft, evidence: [{ id: 'nouveau', name: 'b.pdf' }] }, TODAY);
    expect('body' in built && built.body.evidenceFileIds).toEqual([FILE_ID, 'nouveau']);
  });

  it('le score n’est jamais lu par le portail', () => {
    expect('score' in caseSchema.parse(recoveryCase())).toBe(false);
  });
});

describe('refus de la gateway', () => {
  const error = (status: number, code: string, details: Record<string, unknown> = {}) =>
    new ApiError(status, code, 'message de la gateway', details, 'corr-1');

  it('tarif non publié, minimum, doublons, champs, clé, droits', () => {
    expect(describeRecoveryError(error(422, 'RECOVERY_PRICING_RULE_INVALID'))).toMatchObject({
      kind: 'pricingUnavailable',
      message: PRICING_UNAVAILABLE,
    });
    expect(
      describeRecoveryError(
        error(400, 'RECOVERY_AMOUNT_BELOW_MINIMUM', { minimum: { amount: 25000, currency: 'XOF' } }),
      ),
    ).toMatchObject({ kind: 'belowMinimum', minimum: 25000 });
    expect(
      describeRecoveryError(
        error(400, 'RECOVERY_VALIDATION_FAILED', {
          field: 'duplicatesAcknowledged',
          duplicates: ['RC-000120'],
        }),
      ),
    ).toMatchObject({ kind: 'duplicates', duplicates: ['RC-000120'] });
    expect(
      describeRecoveryError(error(400, 'RECOVERY_VALIDATION_FAILED', { field: 'debtors[0].phones[1]' }))
        .fields,
    ).toEqual({ 'debtors.0.phones.1': 'message de la gateway' });
    expect(
      describeRecoveryError(
        error(400, 'GATEWAY_VALIDATION_FAILED', {
          fields: [{ field: '/claims/0/amount', reason: 'too_small' }],
        }),
      ).fields,
    ).toEqual({ 'claims.0.amount': 'Cette valeur est trop petite ou ce champ est vide.' });
    expect(describeRecoveryError(error(409, 'RECOVERY_IDEMPOTENCY_KEY_REUSED')).kind).toBe('newKey');
    expect(describeRecoveryError(error(403, 'AUTH_FORBIDDEN')).kind).toBe('forbidden');
    expect(describeRecoveryError(error(422, 'RECOVERY_INVALID_TRANSITION')).kind).toBe('stale');
    expect(describeRecoveryError(error(404, 'RECOVERY_CASE_NOT_FOUND')).kind).toBe('notFound');
    expect(describeRecoveryError(error(503, 'RECOVERY_UNAVAILABLE')).kind).toBe('unavailable');
    expect(normalizeField('input.debtors[2].emails[0]')).toBe('debtors.2.emails.0');
  });
});

describe('à faire du créancier', () => {
  it('brouillons séparés des mandats à signer, frais, compléments, décisions', async () => {
    const draftWithMandate = summary({ id: 'avec-mandat', number: 'RC-000130' });
    const plainDraft = summary({ id: 'sans-mandat', number: 'RC-000131' });
    stubGateway({
      'GET /api/v1/recovery/cases?status=draft': { status: 200, body: page([draftWithMandate, plainDraft]) },
      'GET /api/v1/recovery/cases?status=awaiting_fee': {
        status: 200,
        body: page([summary({ id: 'frais', status: 'awaiting_fee' })]),
      },
      'GET /api/v1/recovery/cases?status=info_requested': { status: 200, body: page([]) },
      'GET /api/v1/recovery/dashboard': {
        status: 200,
        body: {
          entrusted: { amount: 0, currency: 'XOF' },
          recovered: { amount: 0, currency: 'XOF' },
          outstanding: { amount: 0, currency: 'XOF' },
          recoveryRateBps: 0,
          casesByStage: [],
          pendingDecisions: 2,
          upcomingInstallments: [],
        },
      },
      'GET /api/v1/recovery/cases/avec-mandat': { status: 200, body: withMandate({ id: 'avec-mandat' }) },
      'GET /api/v1/recovery/cases/sans-mandat': { status: 200, body: recoveryCase({ id: 'sans-mandat' }) },
    });
    const todo = await loadRecoveryTodo();
    expect(todo.mandates.map((item) => item.id)).toEqual(['avec-mandat']);
    expect(todo.drafts.map((item) => item.id)).toEqual(['sans-mandat']);
    expect(todo.fees.map((item) => item.id)).toEqual(['frais']);
    expect(todo.pendingDecisions).toBe(2);
    expect(todoCount(todo)).toBe(4);
  });
});
