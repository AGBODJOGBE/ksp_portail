import { ApiError } from '@/lib/api';
import { draftFromParams, requestHref } from './draft';
import { describeCleaningError } from './errors';
import { SERVICES } from './fake-gateway.test-utils';
import { idempotentSubmission } from './idempotency';
import { buildQuoteRequest, firstAllowedDate, type RequestFormValues } from './request-form';
import type { ServiceOffer } from './schemas';
import { draftFromAnswers, simulatorSteps } from './simulator-steps';
import { coveredCommune } from './zones';

const services = SERVICES.data as ServiceOffer[];
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

  it('reconnaît une commune desservie, quelle que soit son écriture, et marque les autres', () => {
    expect(coveredCommune('abomey calavi')).toBe('Abomey-Calavi');
    expect(coveredCommune('PORTO-NOVO')).toBe('Porto-Novo');
    expect(coveredCommune('Parakou')).toBeNull();
    const other = draftFromParams(
      new URLSearchParams('prestation=home_cleaning&locaux=house&quantite=6&commune=Parakou'),
    );
    expect(other?.commune).toBe('other');
  });
});

describe('questions du simulateur', () => {
  it('reprend les prestations du catalogue et l’unité de la prestation choisie', () => {
    const steps = simulatorSteps(services, { prestation: { kind: 'choice', value: 'home_cleaning' } });
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
  });

  it('saute l’étape des options quand la prestation n’en a pas', () => {
    const steps = simulatorSteps(services, { prestation: { kind: 'choice', value: 'pest_control' } });
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
    const { errors, input } = buildQuoteRequest(draft, values({ commune: 'other' }), NOW);
    expect(input).toBeNull();
    expect(errors.commune).toMatch(/Cotonou, Porto-Novo et Abomey-Calavi/);
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
    expect(describeCleaningError(new Error('x')).kind).toBe('other');
  });
});
