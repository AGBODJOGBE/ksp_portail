import { CATALOG, ZONES } from './fake-gateway.test-utils';
import {
  buildGroupInput,
  checkSchedule,
  emptySchedule,
  frequencyFor,
  periodEnd,
  scheduleErrorKey,
  type ScheduleDraft,
  scheduleInputOf,
  checkFields,
  DRAFT_KEY,
  emptyDraft,
  estimateInput,
  firstInvalidStep,
  type JourneyDraft,
  landmarkOf,
  loadDraft,
  locateContractField,
  outOfZone,
  parseDraft,
  saveDraft,
  servicesOf,
  stepErrors,
  toggleService,
  visiblePlaces,
  withPlace,
} from './journey';
import type { PlaceCatalog } from './schemas';

const catalog = CATALOG as PlaceCatalog;
const zones = ZONES.data;
const NOW = new Date('2026-11-05T10:00:00Z');
const house = catalog.services[0]!;

/** Brouillon complet : maison, ménage avec l’option vitres, position à Cotonou, plan mensuel. */
function complete(): JourneyDraft {
  let draft = withPlace(emptyDraft(), catalog, 'house');
  draft = toggleService(draft, catalog, 'house_cleaning');
  return {
    ...draft,
    step: 4,
    answers: {
      house_cleaning: {
        fields: { surface: '180', condition: 'normal', pets: 'yes' },
        options: { windows: { window_count: '6' } },
      },
    },
    address: {
      location: { latitude: 6.3654, longitude: 2.4183, accuracyMeters: 12 },
      resolved: null,
      commune: 'Cotonou',
      district: 'Fidjrossè',
      landmark: 'Portail vert',
    },
    schedule: {
      ...emptySchedule(),
      mode: 'monthly',
      startDate: '2026-12-01',
      period: '6',
      monthDays: [31, 5],
      startTime: '08:00',
      // Gardés pendant la saisie, jamais envoyés en mode mensuel par jours du mois.
      dates: ['2026-11-20'],
      weekdays: ['mon'],
      weeksOfMonth: [1],
    },
    comment: '  Chien gentil.  ',
  };
}

describe('catalogue par lieu', () => {
  it('trie les lieux et ignore une prestation absente du catalogue', () => {
    expect(visiblePlaces(catalog).map((place) => place.code)).toEqual(['house', 'apartment']);
    expect(servicesOf(catalog, catalog.placeTypes[1]).map((service) => service.code)).toEqual([
      'house_cleaning',
      'window_cleaning',
    ]);
  });

  it('garde l’ordre du lieu en cochant, et retire ce que le nouveau lieu ne propose pas', () => {
    let draft = withPlace(emptyDraft(), catalog, 'house');
    draft = toggleService(draft, catalog, 'window_cleaning');
    draft = toggleService(draft, catalog, 'house_cleaning');
    expect(draft.services).toEqual(['house_cleaning', 'window_cleaning']);
    expect(withPlace(draft, catalog, 'apartment').services).toEqual(['window_cleaning']);
    expect(toggleService(draft, catalog, 'house_cleaning').services).toEqual(['window_cleaning']);
  });
});

describe('réponses aux formulaires (ADR-033)', () => {
  it('convertit nombres, choix et oui/non ; un facultatif vide n’est pas envoyé', () => {
    expect(checkFields(house.form.fields, { surface: '180', condition: 'dirty' }, 'p')).toEqual({
      answers: { surface: 180, condition: 'dirty' },
      errors: {},
    });
    expect(checkFields(house.form.fields, { surface: '0', condition: 'x', pets: 'no' }, 'p')).toEqual({
      answers: { pets: false },
      errors: {
        'p.surface': 'Indiquez un nombre entre 1 et 100000.',
        'p.condition': 'Choisissez une réponse.',
      },
    });
    expect(checkFields(house.form.fields, { surface: '1,5' }, 'p').errors['p.surface']).toBe(
      'Indiquez un nombre entier, sans virgule.',
    );
  });

  it('exige les champs d’une option cochée ; la fréquence n’est plus demandée (elle suit le plan)', () => {
    const draft = {
      ...complete(),
      answers: { house_cleaning: { fields: {}, options: { windows: {} } } },
    };
    expect(Object.keys(stepErrors(1, draft, catalog, zones, NOW))).toEqual([
      'house_cleaning.fields.surface',
      'house_cleaning.fields.condition',
      'house_cleaning.options.windows.window_count',
    ]);
  });

  it('n’estime que les prestations complètes, commune facultative', () => {
    let draft = toggleService(complete(), catalog, 'window_cleaning');
    expect(estimateInput(catalog, draft, null)).toEqual({
      placeType: 'house',
      items: [
        {
          serviceCode: 'house_cleaning',
          answers: { surface: 180, condition: 'normal', pets: true },
          options: [{ code: 'windows', answers: { window_count: 6 } }],
          frequency: 'monthly',
        },
      ],
    });
    draft = {
      ...draft,
      answers: { ...draft.answers, house_cleaning: { fields: {}, options: {} } },
    };
    expect(estimateInput(catalog, draft, 'Cotonou')).toBeNull();
  });
});

describe('adresse et envoi', () => {
  it('construit la demande groupée : position, repère avec le quartier, plan sans créneaux ni récurrence', () => {
    const built = buildGroupInput(complete(), catalog, zones, NOW);
    expect(built.input).toEqual({
      placeType: 'house',
      location: { latitude: 6.3654, longitude: 2.4183, accuracyMeters: 12 },
      landmark: 'Fidjrossè — Portail vert',
      commune: 'Cotonou',
      items: [expect.objectContaining({ serviceCode: 'house_cleaning', frequency: 'monthly' })],
      schedule: {
        mode: 'monthly',
        startDate: '2026-12-01',
        endDate: '2027-05-31',
        monthDays: [5, 31],
        startTime: '08:00',
      },
      comment: 'Chien gentil.',
    });
    expect(built.input).not.toHaveProperty('preferredSlots');
    expect(built.input).not.toHaveProperty('recurrence');
  });

  it('exige la position (contrat), le repère et une commune desservie', () => {
    const draft = complete();
    draft.address = { location: null, resolved: null, commune: '', district: '', landmark: ' ' };
    expect(stepErrors(2, draft, catalog, zones, NOW)).toEqual({
      'address.location': expect.stringContaining('position du lieu'),
      'address.commune': 'Choisissez la commune.',
      'address.landmark': 'Indiquez un point de repère.',
    });
    expect(buildGroupInput(draft, catalog, zones, NOW)).toEqual({ input: null, invalidStep: 2 });
  });

  it('reconnaît une commune hors zone, retrouvée par la position ou choisie', () => {
    const base = complete().address;
    expect(
      outOfZone({ ...base, resolved: { commune: 'Parakou', served: false, displayAddress: null } }),
    ).toEqual({
      commune: 'Parakou',
    });
    expect(outOfZone({ ...base, commune: 'other' })).toEqual({ commune: null });
    expect(
      outOfZone({
        ...base,
        commune: 'other',
        resolved: { commune: 'Cotonou', served: true, displayAddress: null },
      }),
    ).toBeNull();
    expect(landmarkOf({ ...base, district: '' })).toBe('Portail vert');
  });

  it('refuse des dates précises avant J+2 au Bénin, et un plan incomplet', () => {
    const early = {
      ...complete().schedule,
      mode: 'dates' as const,
      dates: ['2026-11-06', '2026-11-20'],
    };
    expect(stepErrors(3, { ...complete(), schedule: early }, catalog, zones, NOW)).toEqual({
      'schedule.dates': 'Choisissez des jours à partir du 2026-11-07.',
    });
    expect(stepErrors(3, { ...complete(), schedule: emptySchedule() }, catalog, zones, NOW)).toEqual({
      'schedule.mode': 'Choisissez comment se répartissent vos passages.',
    });
    const draft = { ...complete(), schedule: { ...emptySchedule(), mode: 'weekly' as const } };
    expect(stepErrors(3, draft, catalog, zones, NOW)).toEqual({
      'schedule.startDate': 'Indiquez la date de début.',
      'schedule.weekdays': 'Choisissez au moins un jour de la semaine.',
      'schedule.startTime': 'Indiquez l’heure d’arrivée (heure du Bénin).',
    });
    expect(buildGroupInput(draft, catalog, zones, NOW)).toEqual({ input: null, invalidStep: 3 });
  });

  it('situe une erreur de la gateway dans le parcours', () => {
    const items = buildGroupInput(complete(), catalog, zones, NOW).input!.items;
    expect(locateContractField('items[0].answers.surface', items)).toEqual({
      step: 1,
      key: 'house_cleaning.fields.surface',
    });
    expect(locateContractField('items[0].options[0].answers.window_count', items)).toEqual({
      step: 1,
      key: 'house_cleaning.options.windows.window_count',
    });
    expect(locateContractField('preferredSlots[0].start', items)).toEqual({ step: 3, key: 'schedule' });
    expect(locateContractField('landmark', items)).toEqual({ step: 2, key: 'address.landmark' });
    expect(locateContractField('recurrence', items)).toBeNull();
  });

  it('rattache les erreurs du plan (schedule.*) et de la fréquence à l’étape des passages', () => {
    const items = buildGroupInput(complete(), catalog, zones, NOW).input!.items;
    expect(locateContractField('schedule.weekdays', items)).toEqual({ step: 3, key: 'schedule.weekdays' });
    expect(locateContractField('schedule.endDate', items)).toEqual({ step: 3, key: 'schedule.endDate' });
    expect(locateContractField('schedule.excludedDates[2]', items)).toEqual({
      step: 3,
      key: 'schedule.excludedDates',
    });
    // Plan sans passage ou trop chargé : message général, affiché avec l’aperçu.
    expect(locateContractField('schedule', items)).toEqual({ step: 3, key: 'schedule' });
    expect(locateContractField('schedule.inconnu', items)).toEqual({ step: 3, key: 'schedule' });
    expect(locateContractField('items[0].frequency', items)).toEqual({ step: 3, key: 'schedule.mode' });
    expect(locateContractField('comment', items)).toEqual({ step: 3, key: 'comment' });
  });
});

describe('brouillon de l’onglet', () => {
  afterEach(() => window.sessionStorage.clear());

  it('survit à un rafraîchissement et reprend à la première étape incomplète', () => {
    const draft = complete();
    saveDraft(draft);
    expect(window.sessionStorage.getItem(DRAFT_KEY)).not.toBeNull();
    const read = loadDraft();
    expect(read).toEqual(draft);
    const broken = { ...draft, address: { ...draft.address, landmark: '' } };
    expect(firstInvalidStep(4, broken, catalog, zones, NOW)).toBe(2);
  });

  it('ignore un brouillon altéré et fonctionne sans stockage', () => {
    expect(parseDraft('{')).toBeNull();
    expect(parseDraft(JSON.stringify({ version: 2 }))).toBeNull();
    expect(parseDraft(JSON.stringify({ ...complete(), version: 3 }))).toBeNull();
    expect(parseDraft(JSON.stringify({ ...complete(), step: 9 }))).toBeNull();
    const position = parseDraft(
      JSON.stringify({
        ...complete(),
        address: { ...complete().address, location: { latitude: 200, longitude: 0 } },
      }),
    );
    expect(position?.address.location).toBeNull();
    const spy = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('bloqué');
    });
    expect(loadDraft()).toBeNull();
    spy.mockRestore();
  });
});

/** Plan de départ pour les tests du plan : heure posée, rien d’autre. */
const plan = (patch: Partial<ScheduleDraft>): ScheduleDraft => ({
  ...emptySchedule(),
  startTime: '09:30',
  // Champs des autres modes, remplis exprès : ils ne doivent jamais partir.
  dates: ['2026-12-24'],
  startDate: '2026-12-01',
  period: '6',
  weekdays: ['fri', 'mon'],
  everyWeeks: 2,
  monthDays: [15],
  weeksOfMonth: ['last', 1],
  ...patch,
});

describe('plan de passages (ADR-052) : seuls les champs du mode choisi partent', () => {
  it('dates précises : jours triés sans doublon, aucune période ni jour de semaine', () => {
    expect(
      scheduleInputOf(plan({ mode: 'dates', dates: ['2026-12-24', '2026-11-20', '2026-12-24'] }), NOW),
    ).toEqual({ mode: 'dates', dates: ['2026-11-20', '2026-12-24'], startTime: '09:30' });
  });

  it('chaque semaine : jours dans l’ordre de la semaine, rythme seulement s’il n’est pas de 1', () => {
    expect(scheduleInputOf(plan({ mode: 'weekly', period: '12' }), NOW)).toEqual({
      mode: 'weekly',
      startDate: '2026-12-01',
      endDate: '2027-11-30',
      weekdays: ['mon', 'fri'],
      everyWeeks: 2,
      startTime: '09:30',
    });
    expect(
      scheduleInputOf(plan({ mode: 'weekly', everyWeeks: 1, period: 'until', endDate: '2027-01-31' }), NOW),
    ).toEqual({
      mode: 'weekly',
      startDate: '2026-12-01',
      endDate: '2027-01-31',
      weekdays: ['mon', 'fri'],
      startTime: '09:30',
    });
  });

  it('chaque mois : jours du mois, ou jour de semaine et rang, jamais les deux', () => {
    expect(
      scheduleInputOf(plan({ mode: 'monthly', monthlyForm: 'monthDays', monthDays: [31, 5] }), NOW),
    ).toEqual({
      mode: 'monthly',
      startDate: '2026-12-01',
      endDate: '2027-05-31',
      monthDays: [5, 31],
      startTime: '09:30',
    });
    expect(scheduleInputOf(plan({ mode: 'monthly', monthlyForm: 'weekdays' }), NOW)).toEqual({
      mode: 'monthly',
      startDate: '2026-12-01',
      endDate: '2027-05-31',
      weekdays: ['mon', 'fri'],
      weeksOfMonth: [1, 'last'],
      startTime: '09:30',
    });
  });

  it('ajuster : jours retirés et ajoutés triés, envoyés seulement s’il y en a', () => {
    expect(
      scheduleInputOf(
        plan({
          mode: 'weekly',
          excludedDates: ['2027-01-01', '2026-12-25'],
          extraDates: ['2026-12-20'],
        }),
        NOW,
      ),
    ).toMatchObject({ excludedDates: ['2026-12-25', '2027-01-01'], extraDates: ['2026-12-20'] });
  });

  it('plan incomplet : rien n’est envoyé, chaque manque est signalé sous son champ', () => {
    expect(scheduleInputOf(emptySchedule(), NOW)).toBeNull();
    expect(checkSchedule(plan({ mode: 'monthly', monthlyForm: 'monthDays', monthDays: [] }), NOW)).toEqual({
      'schedule.monthDays': 'Choisissez au moins un jour du mois.',
    });
    expect(checkSchedule(plan({ mode: 'monthly', monthlyForm: 'weekdays', weeksOfMonth: [] }), NOW)).toEqual({
      'schedule.weeksOfMonth': 'Choisissez au moins une semaine du mois.',
    });
    expect(checkSchedule(plan({ mode: 'weekly', period: null }), NOW)).toEqual({
      'schedule.endDate': 'Choisissez la durée.',
    });
    expect(checkSchedule(plan({ mode: 'weekly', period: 'until', endDate: '2026-11-30' }), NOW)).toEqual({
      'schedule.endDate': 'La date de fin doit suivre la date de début.',
    });
    expect(checkSchedule(plan({ mode: 'dates', startTime: '25:00' }), NOW)).toEqual({
      'schedule.startTime': 'Indiquez l’heure d’arrivée (heure du Bénin).',
    });
  });

  it('raccourcis de durée : la veille du même jour N mois plus tard', () => {
    expect(periodEnd('2027-01-01', 12)).toBe('2027-12-31');
    expect(periodEnd('2026-11-25', 3)).toBe('2027-02-24');
    expect(periodEnd('2027-01-31', 1)).toBe('2027-02-27');
  });

  it('clé d’erreur d’un champ nommé par la gateway', () => {
    expect(scheduleErrorKey('schedule.startTime')).toBe('schedule.startTime');
    expect(scheduleErrorKey('weekdays[3]')).toBe('schedule.weekdays');
    expect(scheduleErrorKey('schedule')).toBe('schedule');
  });
});

describe('fréquence de prix déduite du plan (ADR-033, décision A2)', () => {
  const service = (codes: string[]) => ({
    ...house,
    form: { ...house.form, frequencies: codes.map((code) => ({ code, label: code })) },
  });

  it('suit le mode : once pour des dates précises ou sans plan, weekly, monthly', () => {
    const all = service(['once', 'weekly', 'monthly']);
    expect(frequencyFor(all, null)).toBe('once');
    expect(frequencyFor(all, 'dates')).toBe('once');
    expect(frequencyFor(all, 'weekly')).toBe('weekly');
    expect(frequencyFor(all, 'monthly')).toBe('monthly');
  });

  it('repli prudent sur once si la prestation n’a pas ce rythme, sinon sa première fréquence', () => {
    expect(frequencyFor(service(['once', 'monthly']), 'weekly')).toBe('once');
    expect(frequencyFor(service(['quarterly', 'yearly']), 'weekly')).toBe('quarterly');
    expect(frequencyFor(service([]), 'weekly')).toBeUndefined();
  });

  it('n’envoie pas de fréquence pour une prestation qui n’en a pas', () => {
    const draft = toggleService(
      { ...complete(), schedule: plan({ mode: 'weekly' }) },
      catalog,
      'window_cleaning',
    );
    draft.answers['window_cleaning'] = { fields: { window_count: '4' }, options: {} };
    const items = buildGroupInput(draft, catalog, zones, NOW).input!.items;
    expect(items.map((item) => item.frequency)).toEqual(['once', undefined]);
  });
});

describe('brouillon : version 2 et reprise d’un brouillon v1', () => {
  afterEach(() => window.sessionStorage.clear());

  it('garde le plan de passages d’un brouillon v2, et rejette un plan altéré champ par champ', () => {
    const draft = complete();
    expect(parseDraft(JSON.stringify(draft))).toEqual(draft);
    const altered = parseDraft(
      JSON.stringify({
        ...draft,
        schedule: {
          ...draft.schedule,
          mode: 'yearly',
          dates: ['2026-02-30', '2026-12-01', 4],
          everyWeeks: 40,
          weekdays: ['mon', 'xyz'],
          weeksOfMonth: [5, 'last'],
          monthDays: [0, 12, 12],
          startTime: '8h',
        },
      }),
    );
    expect(altered?.schedule).toMatchObject({
      mode: null,
      dates: ['2026-12-01'],
      everyWeeks: 1,
      weekdays: ['mon'],
      weeksOfMonth: ['last'],
      monthDays: [12],
      startTime: '',
    });
  });

  it('migre un brouillon v1 : réponses, adresse et commentaire gardés, créneaux abandonnés', () => {
    const v1 = {
      version: 1,
      step: 4,
      placeType: 'house',
      services: ['house_cleaning'],
      answers: {
        house_cleaning: {
          fields: { surface: '180', condition: 'normal' },
          options: {},
          frequency: 'once',
        },
      },
      address: complete().address,
      slots: [{ date: '2026-11-10', period: 'morning' }],
      comment: 'Portail bleu.',
    };
    window.sessionStorage.setItem(DRAFT_KEY, JSON.stringify(v1));
    const read = loadDraft();
    expect(read).toEqual({
      version: 2,
      step: 4,
      placeType: 'house',
      services: ['house_cleaning'],
      answers: { house_cleaning: { fields: { surface: '180', condition: 'normal' }, options: {} } },
      address: complete().address,
      schedule: emptySchedule(),
      comment: 'Portail bleu.',
    });
    // Reprise à l’étape des passages, à refaire.
    expect(firstInvalidStep(4, read!, catalog, zones, NOW)).toBe(3);
    // Un brouillon v1 sans réponse lisible ne fait pas planter la reprise.
    expect(parseDraft(JSON.stringify({ ...v1, answers: { x: { fields: 3 } }, slots: 'x' }))?.answers).toEqual(
      {},
    );
  });
});
