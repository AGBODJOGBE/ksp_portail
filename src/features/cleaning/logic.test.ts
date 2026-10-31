import { ApiError } from '@/lib/api';
import { draftFromParams, requestHref } from './draft';
import { describeCleaningError } from './errors';
import { SERVICES, ZONES } from './fake-gateway.test-utils';
import { idempotentSubmission } from './idempotency';
import { buildQuoteRequest, firstAllowedDate, type RequestFormValues } from './request-form';
import { missionSchema, type ServiceOffer, suspensionCauses } from './schemas';
import { mission } from './fake-gateway.test-utils';
import { suspendedStatus, suspensionText } from './texts';
import { draftFromAnswers, simulatorSteps } from './simulator-steps';
import { OTHER_COMMUNE, zoneFor, zonesSentence } from './zones';

const services = SERVICES.data as ServiceOffer[];
const zones = ZONES.data;
const draft = {
  serviceCode: 'home_cleaning',
  premisesType: 'house',
  quantity: 6,
  options: ['windows'],
  commune: 'Abomey-Calavi',
  frequency: 'once' as const,
};
const NOW = new Date('2026-10-23T10:00:00Z');

describe('simulation reprise dans l’adresse de la demande', () => {
  it('fait l’aller-retour sans perte', () => {
    const href = requestHref(draft);
    expect(href).toBe(
      '/nettoyage/devis?prestation=home_cleaning&locaux=house&quantite=6&options=windows&commune=Abomey-Calavi&frequence=once',
    );
    expect(draftFromParams(new URL(href, 'http://x').searchParams)).toEqual(draft);
  });

  it('refuse une adresse altérée ou incomplète', () => {
    const read = (query: string) => draftFromParams(new URLSearchParams(query));
    expect(read('')).toBeNull();
    expect(read('prestation=home_cleaning&locaux=chateau&quantite=6&commune=Cotonou')).toBeNull();
    expect(read('prestation=home_cleaning&locaux=house&quantite=-1&commune=Cotonou')).toBeNull();
    expect(read('prestation=Home!&locaux=house&quantite=6&commune=Cotonou')).toBeNull();
  });

  it('garde la commune telle quelle : elle est comparée aux zones de la gateway', () => {
    const other = draftFromParams(
      new URLSearchParams('prestation=home_cleaning&locaux=house&quantite=6&commune=Parakou'),
    );
    expect(other?.commune).toBe('Parakou');
    expect(zoneFor(zones, 'Porto-Novo')?.code).toBe('porto-novo');
    expect(zoneFor(zones, 'porto-novo')?.commune).toBe('Porto-Novo');
    expect(zoneFor(zones, 'Parakou')).toBeNull();
  });

  it('met les zones en phrase, dans l’ordre de la gateway', () => {
    expect(zonesSentence(zones)).toBe('Abomey-Calavi, Cotonou et Porto-Novo');
    expect(zonesSentence([])).toBeNull();
  });
});

describe('questions du simulateur', () => {
  it('reprend les prestations du catalogue et l’unité de la prestation choisie', () => {
    const steps = simulatorSteps(services, zones, {
      prestation: { kind: 'choice', value: 'home_cleaning' },
    });
    expect(steps.map((step) => step.id)).toEqual([
      'prestation',
      'locaux',
      'taille',
      'options',
      'commune',
      'frequence',
    ]);
    const [service, , size] = steps;
    expect(service?.kind === 'choice' && service.options.map((option) => option.label)).toEqual([
      'Nettoyage à domicile',
      'Désinsectisation',
    ]);
    expect(size?.kind === 'quantity' && size.modes[0]?.unit).toBe('pièces');
    const commune = steps.find((step) => step.id === 'commune');
    expect(commune?.kind === 'choice' && commune.options.map((option) => option.value)).toEqual([
      'Abomey-Calavi',
      'Cotonou',
      'Porto-Novo',
      OTHER_COMMUNE,
    ]);
  });

  it('saute l’étape des options quand la prestation n’en a pas', () => {
    const steps = simulatorSteps(services, zones, { prestation: { kind: 'choice', value: 'pest_control' } });
    expect(steps.map((step) => step.id)).not.toContain('options');
    const size = steps[2];
    expect(size?.kind === 'quantity' && size.modes[0]?.unit).toBe('m²');
  });

  it('traduit les réponses en demande de simulation', () => {
    expect(
      draftFromAnswers(services, {
        prestation: { kind: 'choice', value: 'home_cleaning' },
        locaux: { kind: 'choice', value: 'house' },
        taille: { kind: 'quantity', mode: '', amount: '6' },
        options: { kind: 'multi', values: ['windows', 'inconnue'] },
        commune: { kind: 'choice', value: 'Abomey-Calavi' },
        frequence: { kind: 'choice', value: 'once' },
      }),
    ).toEqual(draft);
    expect(draftFromAnswers(services, { prestation: { kind: 'choice', value: 'home_cleaning' } })).toBeNull();
  });
});

describe('saisie de la demande de devis', () => {
  const values = (patch: Partial<RequestFormValues> = {}): RequestFormValues => ({
    kind: 'individual',
    commune: 'Abomey-Calavi',
    address: ' Lot 12 ',
    slots: [{ date: '2026-10-26', period: 'morning' }],
    visits: '',
    months: '',
    days: '',
    team: '',
    comment: '',
    ...patch,
  });

  it('construit le corps du contrat, créneaux en heures du Bénin', () => {
    const { errors, input } = buildQuoteRequest(draft, values({ comment: ' Portail bleu. ' }), NOW);
    expect(errors).toEqual({});
    expect(input).toEqual({
      serviceCode: 'home_cleaning',
      premisesType: 'house',
      quantity: 6,
      options: ['windows'],
      commune: 'Abomey-Calavi',
      address: 'Lot 12',
      preferredSlots: [{ start: '2026-10-26T07:00:00.000Z', end: '2026-10-26T11:00:00.000Z' }],
      comment: 'Portail bleu.',
    });
  });

  it('propose des dates à partir de J+2 au Bénin et refuse plus tôt', () => {
    expect(firstAllowedDate(NOW)).toBe('2026-10-25');
    const { errors, input } = buildQuoteRequest(
      draft,
      values({ slots: [{ date: '2026-10-24', period: 'morning' }] }),
      NOW,
    );
    expect(input).toBeNull();
    expect(errors.slots).toMatch(/à partir du 25 octobre 2026/);
  });

  it('exige l’adresse et au moins un créneau', () => {
    const { errors } = buildQuoteRequest(
      draft,
      values({ address: ' ', slots: [{ date: '', period: 'morning' }] }),
      NOW,
    );
    expect(Object.keys(errors).sort()).toEqual(['address', 'slots']);
  });

  it('refuse une commune hors zone', () => {
    const { errors, input } = buildQuoteRequest(
      draft,
      values({ commune: 'other' }),
      NOW,
      zonesSentence(zones),
    );
    expect(input).toBeNull();
    expect(errors.commune).toMatch(/intervient aujourd’hui à Abomey-Calavi, Cotonou et Porto-Novo/);
  });

  it('envoie le nombre d’agents souhaité (1 à 50), facultatif', () => {
    expect(buildQuoteRequest(draft, values({ team: '3' }), NOW).input?.requestedTeamSize).toBe(3);
    expect(buildQuoteRequest(draft, values({ team: '51' }), NOW).errors.team).toBeDefined();
    expect(buildQuoteRequest(draft, values(), NOW).input).not.toHaveProperty('requestedTeamSize');
  });

  it('envoie les jours d’intervention d’une entreprise (1 à 7)', () => {
    expect(buildQuoteRequest(draft, values({ kind: 'business', days: '5' }), NOW).input?.daysPerWeek).toBe(5);
    expect(buildQuoteRequest(draft, values({ kind: 'business', days: '9' }), NOW).errors.days).toBeDefined();
    expect(buildQuoteRequest(draft, values({ kind: 'business' }), NOW).input).not.toHaveProperty(
      'daysPerWeek',
    );
  });

  it('envoie la régularité d’un particulier en prestation hebdomadaire', () => {
    const weekly = { ...draft, frequency: 'weekly' as const };
    expect(buildQuoteRequest(weekly, values({ visits: '2', months: '6' }), NOW).input?.recurrence).toEqual({
      period: 'week',
      visitsPerPeriod: 2,
      durationMonths: 6,
    });
    expect(buildQuoteRequest(weekly, values({ visits: '2' }), NOW).errors.recurrence).toBeDefined();
  });
});

describe('clé d’idempotence', () => {
  it('reprend la même clé pour un même envoi, une clé neuve après un changement ou un succès', () => {
    let count = 0;
    const submission = idempotentSubmission(() => `cle-${++count}-abcdef`);
    const first = submission.keyFor({ a: 1 });
    expect(submission.keyFor({ a: 1 })).toBe(first);
    expect(submission.keyFor({ a: 2 })).not.toBe(first);
    const third = submission.keyFor({ a: 2 });
    submission.done();
    expect(submission.keyFor({ a: 2 })).not.toBe(third);
  });
});

describe('erreurs du Nettoyage', () => {
  const error = (status: number, code: string) => new ApiError(status, code, `Message ${code}.`);

  it('garde le message de la gateway et en tire la conséquence', () => {
    expect(describeCleaningError(error(422, 'CLEANING_QUOTE_EXPIRED'))).toEqual({
      message: 'Message CLEANING_QUOTE_EXPIRED.',
      kind: 'expired',
    });
    expect(describeCleaningError(error(422, 'CLEANING_ZONE_NOT_COVERED')).kind).toBe('zone');
    expect(describeCleaningError(error(422, 'IDENTITY_PROFILE_INCOMPLETE')).kind).toBe('profile');
    expect(describeCleaningError(error(422, 'CLEANING_LEAD_TIME_TOO_SHORT')).kind).toBe('slots');
    expect(describeCleaningError(error(409, 'CLEANING_CONCURRENT_UPDATE')).kind).toBe('stale');
    expect(describeCleaningError(error(404, 'CLEANING_REQUEST_NOT_FOUND')).kind).toBe('notFound');
    expect(describeCleaningError(error(422, 'CLEANING_ORGANIZATION_SUSPENDED')).kind).toBe(
      'organizationSuspended',
    );
    expect(describeCleaningError(new Error('x')).kind).toBe('other');
  });
});

describe('suspension d’une mission (ADR-030)', () => {
  const since = '11 décembre 2026';

  it('lit une suspension sans `causes` (gateway antérieure) comme une seule cause', () => {
    const parsed = missionSchema.parse(
      mission({
        suspension: { cause: 'unpaid_interventions', since: '2026-12-11T09:00:00Z', unpaidCount: 1 },
      }),
    );
    expect(parsed.suspension && suspensionCauses(parsed.suspension)).toEqual(['unpaid_interventions']);
  });

  it('accepte la nouvelle cause et 0 impayé', () => {
    const suspension = {
      cause: 'organization_suspended',
      causes: ['organization_suspended'],
      since: '2026-12-11T09:00:00Z',
      unpaidCount: 0,
    };
    expect(missionSchema.parse(mission({ suspension })).suspension).toEqual(suspension);
  });

  it('écrit chaque cas sans jamais citer « 0 » impayé', () => {
    const organization = { cause: 'organization_suspended', unpaidCount: 0 };
    expect(suspensionText(organization, since)).toContain(
      'Votre compte entreprise est suspendu par KSP : le service reprendra à sa réactivation.',
    );
    expect(suspensionText(organization, since)).not.toMatch(/0|impayé/);
    expect(suspendedStatus(organization).label).toBe('Suspendue (compte entreprise)');

    const invoices = { cause: 'unpaid_invoices', unpaidCount: 2 };
    expect(suspensionText(invoices, since)).toContain('2 factures impayées');
    expect(suspendedStatus(invoices).label).toBe('Suspendue (impayés)');

    const both = {
      cause: 'organization_suspended',
      causes: ['organization_suspended', 'unpaid_invoices'],
      unpaidCount: 0,
    };
    expect(suspensionText(both, since)).toContain('il reste des factures impayées');
    expect(suspensionText(both, since)).not.toMatch(/0/);
    expect(suspendedStatus(both).label).toBe('Suspendue (compte entreprise et impayés)');

    const interventions = {
      cause: 'unpaid_interventions',
      causes: ['unpaid_interventions', 'organization_suspended'],
      unpaidCount: 3,
    };
    expect(suspensionText(interventions, since)).toContain('il reste 3 passages impayés');
    expect(suspensionText(interventions, since)).toContain('la régularisation des passages');

    expect(suspensionText({ cause: 'nouvelle_cause', unpaidCount: 0 }, since)).toBe(
      'Service suspendu depuis le 11 décembre 2026. Les passages à venir sont annulés ; ils seront reprogrammés automatiquement à la reprise du service. Contactez KSP pour en savoir plus.',
    );
    expect(suspendedStatus({ cause: 'nouvelle_cause' }).label).toBe('Suspendue');
  });
});
