import { CATALOG, ZONES } from './fake-gateway.test-utils';
import {
  buildGroupInput,
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

/** Brouillon complet : maison, ménage avec l'option vitres, position à Cotonou, un créneau. */
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
        frequency: 'once',
      },
    },
    address: {
      location: { latitude: 6.3654, longitude: 2.4183, accuracyMeters: 12 },
      resolved: null,
      commune: 'Cotonou',
      district: 'Fidjrossè',
      landmark: 'Portail vert',
    },
    slots: [
      { date: '2026-11-10', period: 'morning' },
      { date: '2026-11-10', period: 'morning' },
    ],
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

  it('exige la fréquence et les champs d’une option cochée', () => {
    const draft = {
      ...complete(),
      answers: { house_cleaning: { fields: {}, options: { windows: {} }, frequency: '' } },
    };
    expect(Object.keys(stepErrors(1, draft, catalog, zones, NOW))).toEqual([
      'house_cleaning.fields.surface',
      'house_cleaning.fields.condition',
      'house_cleaning.options.windows.window_count',
      'house_cleaning.frequency',
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
          frequency: 'once',
        },
      ],
    });
    draft = {
      ...draft,
      answers: { ...draft.answers, house_cleaning: { fields: {}, options: {}, frequency: '' } },
    };
    expect(estimateInput(catalog, draft, 'Cotonou')).toBeNull();
  });
});

describe('adresse et envoi', () => {
  it('construit la demande groupée : position, repère avec le quartier, créneaux sans doublon', () => {
    const built = buildGroupInput(complete(), catalog, zones, NOW);
    expect(built.input).toEqual({
      placeType: 'house',
      location: { latitude: 6.3654, longitude: 2.4183, accuracyMeters: 12 },
      landmark: 'Fidjrossè — Portail vert',
      commune: 'Cotonou',
      items: [expect.objectContaining({ serviceCode: 'house_cleaning' })],
      preferredSlots: [{ start: '2026-11-10T07:00:00.000Z', end: '2026-11-10T11:00:00.000Z' }],
      comment: 'Chien gentil.',
    });
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

  it('refuse un créneau avant J+2 au Bénin', () => {
    const draft = { ...complete(), slots: [{ date: '2026-11-06', period: 'morning' as const }] };
    expect(stepErrors(3, draft, catalog, zones, NOW)).toEqual({
      slots: expect.stringContaining('Choisissez une date à partir du'),
    });
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
    expect(locateContractField('preferredSlots[0].start', items)).toEqual({ step: 3, key: 'slots' });
    expect(locateContractField('landmark', items)).toEqual({ step: 2, key: 'address.landmark' });
    expect(locateContractField('recurrence', items)).toBeNull();
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
