import { ApiError, parseResponse } from '@/lib/api';
import {
  type RequestDraft,
  buildSlots,
  buildValues,
  clearDraft,
  emptyDraft,
  readDraft,
  relevantParameters,
  requestBody,
  simulationBody,
  stepOfField,
  toggleType,
  visibleOffers,
  writeDraft,
} from './draft';
import { describeCleaningError, fieldErrors, fieldMessage } from './errors';
import {
  FLOOR_ID,
  ON_QUOTE,
  OTHER_DETAIL,
  OTHER_ID,
  PACK_ID,
  PROGRAM,
  VILLA_DETAIL,
  VILLA_ID,
  WINDOWS_ID,
  place,
  quote,
  request,
  simulation,
} from './fixtures.test-utils';
import { idempotentSubmission } from '@/lib/idempotency';
import { cleaningPaths } from './paths';
import { buildSchedule, describeSchedule, emptySchedule } from './schedule';
import {
  acceptResultSchema,
  placeSchema,
  placeTypeDetailSchema,
  requestSchema,
  simulationSchema,
  type PlaceTypeDetail,
} from './schemas';
import { requestStage, requestStatus, statusFromParam } from './status-texts';
import { getCleaningTerms } from './terms';

const detail = parseResponse(placeTypeDetailSchema, VILLA_DETAIL) as PlaceTypeDetail;
const other = parseResponse(placeTypeDetailSchema, OTHER_DETAIL) as PlaceTypeDetail;

const weekly = () => ({
  ...emptySchedule(),
  kind: 'weekly' as const,
  weekdays: ['thu' as const, 'mon' as const],
  startDate: '2027-01-04',
  endMode: 'weeks' as const,
  durationWeeks: '12',
});

function draft(overrides: Partial<RequestDraft> = {}): RequestDraft {
  return {
    ...emptyDraft(),
    placeTypeId: VILLA_ID,
    cleaningTypeIds: [FLOOR_ID],
    values: { surface: '120', yard: 'yes', dirt_level: 'normal' },
    schedule: weekly(),
    placeId: 'lieu-1',
    slots: [{ date: '2026-12-01', from: '08:00', to: '12:00' }],
    ...overrides,
  };
}

describe('schémas du contrat', () => {
  it('valide les exemples du contrat (simulation, lieu, demande, acceptation)', () => {
    expect(simulationSchema.safeParse(simulation()).success).toBe(true);
    expect(simulationSchema.safeParse(ON_QUOTE).success).toBe(true);
    expect(placeSchema.safeParse(place({ location: null })).success).toBe(true);
    expect(requestSchema.safeParse(request({ currentQuote: quote() })).success).toBe(true);
    expect(
      acceptResultSchema.safeParse({ quote: quote({ status: 'accepted' }), program: PROGRAM }).success,
    ).toBe(true);
  });

  it('refuse un montant décimal ou une devise autre que XOF', () => {
    expect(
      simulationSchema.safeParse(
        simulation({ pricing: { ...simulation().pricing, sessionPrice: { amount: 1.5, currency: 'XOF' } } }),
      ).success,
    ).toBe(false);
    expect(() => parseResponse(placeSchema, { ...place(), id: undefined })).toThrow(ApiError);
  });

  it('garde un état inconnu (chaîne) au lieu de casser l’écran', () => {
    expect(requestSchema.safeParse(request({ status: 'nouvel_etat' })).success).toBe(true);
    expect(requestStatus('nouvel_etat')).toEqual({ label: 'nouvel etat', tone: 'neutral' });
  });
});

describe('types et paramètres', () => {
  it('un pack choisi masque et retire ses types', () => {
    const selected = toggleType(detail, [FLOOR_ID, WINDOWS_ID], PACK_ID);
    expect(selected).toEqual([PACK_ID]);
    expect(visibleOffers(detail, selected).map((offer) => offer.cleaningType.id)).toEqual([PACK_ID]);
  });

  it('ajoute les paramètres des types choisis, sans doublon', () => {
    expect(relevantParameters(detail, [FLOOR_ID]).map((item) => item.code)).toEqual([
      'surface',
      'yard',
      'dirt_level',
    ]);
    expect(relevantParameters(detail, [WINDOWS_ID]).map((item) => item.code)).toContain('windows_count');
  });

  it('contrôle la forme des valeurs : obligatoire, entier, bornes, choix proposé', () => {
    const parameters = relevantParameters(detail, [FLOOR_ID]);
    expect(buildValues(parameters, { surface: '120', yard: 'no', dirt_level: 'heavy' })).toEqual({
      values: { surface: 120, yard: false, dirt_level: 'heavy' },
      errors: {},
    });
    const { errors } = buildValues(parameters, { surface: '9000', dirt_level: 'inconnu' });
    expect(errors['values.surface']).toMatch(/entre 1 et 5000 m²/);
    expect(errors['values.dirt_level']).toBe('Choisissez une valeur proposée.');
    expect(errors['values.yard']).toBeUndefined();
    expect(buildValues(parameters, {}).errors['values.surface']).toBe('Ce champ est obligatoire.');
  });
});

describe('corps envoyés', () => {
  it('simulation : seulement quand la saisie est complète ; commune et rythme facultatifs', () => {
    expect(simulationBody(draft({ values: {} }), detail).body).toBeNull();
    expect(simulationBody(draft(), detail).body).toEqual({
      placeTypeId: VILLA_ID,
      cleaningTypeIds: [FLOOR_ID],
      values: { surface: 120, yard: true, dirt_level: 'normal' },
    });
    const withAll = simulationBody(draft({ withSchedule: true, communeKey: 'cotonou' }), detail).body;
    expect(withAll?.communeKey).toBe('cotonou');
    expect(withAll?.schedule).toMatchObject({ kind: 'weekly', weekdays: ['mon', 'thu'], durationWeeks: 12 });
  });

  it('demande : créneaux en UTC à l’heure du Bénin, champs facultatifs absents', () => {
    const built = requestBody(draft({ comment: '  ', photos: [] }), detail);
    expect('body' in built && built.body).toEqual({
      placeId: 'lieu-1',
      cleaningTypeIds: [FLOOR_ID],
      values: { surface: 120, yard: true, dirt_level: 'normal' },
      schedule: {
        kind: 'weekly',
        startTime: '08:00',
        excludeHolidays: true,
        weekdays: ['mon', 'thu'],
        everyWeeks: 1,
        startDate: '2027-01-04',
        durationWeeks: 12,
      },
      visitSlots: [{ start: '2026-12-01T07:00:00.000Z', end: '2026-12-01T11:00:00.000Z' }],
    });
  });

  it('lieu « Autre » : aucun type, le besoin décrit', () => {
    const autre = draft({
      placeTypeId: OTHER_ID,
      freeDescription: true,
      cleaningTypeIds: [],
      values: {},
      description: '',
    });
    expect('errors' in requestBody(autre, other) && requestBody(autre, other)).toMatchObject({
      errors: { freeDescription: 'Décrivez votre besoin.' },
    });
    const built = requestBody({ ...autre, description: 'Un hangar de 300 m².' }, other);
    expect('body' in built && built.body).toMatchObject({
      cleaningTypeIds: [],
      values: {},
      freeDescription: 'Un hangar de 300 m².',
    });
  });

  it('créneau incomplet ou à l’envers : erreur près du créneau', () => {
    expect(buildSlots([{ date: '', from: '08:00', to: '12:00' }]).errors).toEqual({
      'visitSlots.0': 'Choisissez un jour.',
    });
    expect(buildSlots([{ date: '2026-12-01', from: '12:00', to: '08:00' }]).errors['visitSlots.0']).toMatch(
      /fin/,
    );
  });

  it('rattache un champ refusé à son étape', () => {
    expect(stepOfField('values.surface')).toBe('params');
    expect(stepOfField('schedule.weekdays')).toBe('schedule');
    expect(stepOfField('visitSlots.0.start')).toBe('slots');
    expect(stepOfField('placeId')).toBe('place');
    expect(stepOfField('cleaningTypeIds')).toBe('type');
    expect(stepOfField('comment')).toBe('details');
  });
});

describe('rythme', () => {
  it('ponctuel, hebdomadaire, mensuel : seuls les champs de la nature choisie', () => {
    expect(
      buildSchedule({ ...emptySchedule(), kind: 'one_off', dates: ['2027-01-05', '2027-01-03'] }),
    ).toEqual({
      plan: {
        kind: 'one_off',
        dates: ['2027-01-03', '2027-01-05'],
        startTime: '08:00',
        excludeHolidays: true,
      },
    });
    expect(
      buildSchedule({
        ...emptySchedule(),
        kind: 'monthly',
        monthlyForm: 'weekdays',
        monthWeekdays: [{ rank: 'first', weekday: 'sat' }],
        startDate: '2027-01-01',
        endMode: 'months',
        durationMonths: '6',
      }),
    ).toEqual({
      plan: {
        kind: 'monthly',
        monthWeekdays: [{ rank: 'first', weekday: 'sat' }],
        startTime: '08:00',
        excludeHolidays: true,
        startDate: '2027-01-01',
        durationMonths: 6,
      },
    });
  });

  it('erreurs de forme par champ', () => {
    expect(buildSchedule(emptySchedule())).toEqual({ errors: { 'schedule.kind': 'Choisissez un rythme.' } });
    const result = buildSchedule({
      ...emptySchedule(),
      kind: 'weekly',
      endMode: 'weeks',
      durationWeeks: '999',
    });
    expect('errors' in result && Object.keys(result.errors).sort()).toEqual([
      'schedule.durationWeeks',
      'schedule.startDate',
      'schedule.weekdays',
    ]);
  });

  it('se lit en français', () => {
    expect(
      describeSchedule({
        kind: 'weekly',
        startTime: '08:00',
        weekdays: ['mon', 'thu'],
        everyWeeks: 2,
        startDate: '2027-01-04',
        durationWeeks: 12,
      }),
    ).toBe(
      'Chaque lundi et jeudi, toutes les 2 semaines, à 08:00, à partir du 4 janvier 2027, pendant 12 semaines',
    );
  });
});

describe('brouillon de l’onglet', () => {
  afterEach(() => clearDraft());

  it('se garde et se relit ; une version inconnue est ignorée', () => {
    writeDraft(draft({ step: 'slots' }));
    expect(readDraft()).toMatchObject({ placeTypeId: VILLA_ID, step: 'slots', cleaningTypeIds: [FLOOR_ID] });
    window.sessionStorage.setItem('ksp.nettoyage.demande', JSON.stringify({ version: 99 }));
    expect(readDraft()).toBeNull();
    window.sessionStorage.setItem('ksp.nettoyage.demande', '{pas du json');
    expect(readDraft()).toBeNull();
  });
});

describe('erreurs de la gateway', () => {
  it('400 de la gateway : chaque champ de `details.fields[]`', () => {
    const error = new ApiError(400, 'GATEWAY_VALIDATION_FAILED', 'La requête est invalide.', {
      fields: [
        { field: 'visitSlots.0.start', reason: 'invalid_format' },
        { field: 'comment', reason: 'too_big' },
      ],
    });
    const view = describeCleaningError(error);
    expect(view.kind).toBe('fields');
    expect(view.fields).toEqual({
      'visitSlots.0.start': 'Ce champ n’a pas le bon format.',
      comment: 'Cette valeur est trop grande ou ce texte trop long.',
    });
    expect(fieldMessage(view.fields, 'visitSlots')).toBe('Ce champ n’a pas le bon format.');
  });

  it('400 du service : `details.field` et `details.reason`, message du service', () => {
    const error = new ApiError(400, 'CLEANING_VALIDATION_FAILED', 'Cette valeur n’est pas proposée.', {
      field: 'values.dirt_level',
      reason: 'unknown_choice',
    });
    expect(fieldErrors(error)).toEqual({ 'values.dirt_level': 'Cette valeur n’est pas proposée.' });
    const slot = new ApiError(400, 'CLEANING_SLOT_INVALID', 'Créneau trop proche.', { reason: 'in_past' });
    expect(fieldErrors(slot)).toEqual({ visitSlots: 'Créneau trop proche.' });
  });

  it('429, solde insuffisant, lecteur, état changé', () => {
    expect(
      describeCleaningError(new ApiError(429, 'GATEWAY_RATE_LIMITED', 'Trop.', { retryAfterSeconds: 12.2 })),
    ).toMatchObject({
      kind: 'rateLimited',
      retryAfterSeconds: 13,
    });
    expect(describeCleaningError(new ApiError(422, 'CLEANING_INSUFFICIENT_BALANCE', 'Solde.')).kind).toBe(
      'insufficientBalance',
    );
    expect(describeCleaningError(new ApiError(403, 'AUTH_FORBIDDEN', 'Non.')).kind).toBe('forbidden');
    expect(describeCleaningError(new ApiError(422, 'CLEANING_INVALID_TRANSITION', 'Non.')).kind).toBe(
      'stale',
    );
  });
});

describe('clé d’idempotence', () => {
  it('même contenu, même clé ; contenu changé ou envoi réussi, clé neuve', () => {
    let counter = 0;
    const submission = idempotentSubmission(() => `cle-${++counter}`);
    expect(submission.keyFor({ a: 1 })).toBe('cle-1');
    expect(submission.keyFor({ a: 1 })).toBe('cle-1');
    expect(submission.keyFor({ a: 2 })).toBe('cle-2');
    submission.done();
    expect(submission.keyFor({ a: 2 })).toBe('cle-3');
  });
});

describe('adresses, états, conditions générales', () => {
  it('adresses des notifications', () => {
    expect(cleaningPaths.requestDetail('a b')).toBe('/mon-espace/nettoyage/demandes/a%20b');
    expect(cleaningPaths.session('p', 's')).toBe('/mon-espace/nettoyage/programmes/p/seances/s');
    expect(cleaningPaths.reorder('p')).toBe('/mon-espace/nettoyage/programmes/p/commander-a-nouveau');
    expect(cleaningPaths.terms('cg-2026-11')).toBe('/conditions/nettoyage/cg-2026-11');
  });

  it('frise et filtre de la liste', () => {
    expect(requestStage('awaiting_visit_fee')).toBe(1);
    expect(requestStage('quote_sent')).toBe(3);
    expect(statusFromParam('devis-a-accepter')).toBe('quote_sent');
    expect(statusFromParam('inconnu')).toBeUndefined();
  });

  it('conditions générales : version du devis, provisoire, sans délai réglable écrit en chiffres', () => {
    const terms = getCleaningTerms('cg-2026-11');
    expect(terms?.provisional).toBe(true);
    const text = JSON.stringify(terms);
    expect(text).not.toMatch(/72 ?h|15 jours/);
    expect(getCleaningTerms('cg-1900-01')).toBeNull();
  });
});
