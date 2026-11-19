import { ApiError } from '@/lib/api';
import { describeCleaningError } from './errors';
import { QUOTE, WEEKLY_DATES, WEEKLY_SCHEDULE, mission, quoteRequest } from './fake-gateway.test-utils';
import {
  beninDayOf,
  countPlanDays,
  missionPlanDays,
  planLabel,
  scheduleRhythm,
  scheduleSummary,
} from './schedule';
import {
  interventionPhotoListSchema,
  interventionSchema,
  missionSchema,
  quoteRequestSchema,
  quoteSchema,
  schedulePreviewSchema,
} from './schemas';

const plan = (overrides: Record<string, unknown>) => ({ ...WEEKLY_SCHEDULE, ...overrides });

describe('plan de passages : schémas (ADR-052, 053)', () => {
  it('lit `schedule` et `scheduledDates` sur le devis, la demande et la mission', () => {
    const quote = quoteSchema.parse({ ...QUOTE, schedule: WEEKLY_SCHEDULE, scheduledDates: WEEKLY_DATES });
    expect(quote.schedule?.weekdays).toEqual(['mon', 'wed', 'sat']);
    expect(quote.scheduledDates).toHaveLength(157);
    const request = quoteRequestSchema.parse(
      quoteRequest({ schedule: WEEKLY_SCHEDULE, scheduledDates: WEEKLY_DATES }),
    );
    expect(request.schedule?.startTime).toBe('08:00');
    const parsed = missionSchema.parse(mission({ schedule: null, scheduledDates: [] }));
    expect(parsed.schedule).toBeNull();
  });

  it('reste compatible avec une gateway antérieure (champs absents)', () => {
    expect(quoteSchema.parse(QUOTE).schedule).toBeUndefined();
    expect(missionSchema.parse(mission()).scheduledDates).toBeUndefined();
  });

  it('accepte les rangs `last` d’un plan mensuel et l’aperçu avec ses avertissements', () => {
    expect(
      quoteSchema.parse({
        ...QUOTE,
        schedule: plan({ mode: 'monthly', weekdays: ['fri'], weeksOfMonth: [1, 'last'] }),
        scheduledDates: ['2026-12-04'],
      }).schedule?.weeksOfMonth,
    ).toEqual([1, 'last']);
    const preview = schedulePreviewSchema.parse({
      dates: ['2027-01-05', '2027-01-31'],
      count: 2,
      firstDate: '2027-01-05',
      lastDate: '2027-01-31',
      warnings: [{ code: 'moved_to_month_end', date: '2027-02-28', message: 'Ramené au 28 février.' }],
    });
    expect(preview.warnings[0]?.code).toBe('moved_to_month_end');
  });

  it('lit un passage à replanifier, son motif, et les photos d’un passage', () => {
    const intervention = interventionSchema.parse({
      ...mission().interventions[0],
      status: 'cancelled',
      cancellationCause: 'manual',
      toReschedule: true,
      changeReason: 'Agent malade.',
    });
    expect(intervention.toReschedule).toBe(true);
    expect(intervention.changeReason).toBe('Agent malade.');
    const photos = interventionPhotoListSchema.parse({
      data: [
        {
          fileId: '0192f1c4-7a2b-7c3d-8e4f-5a6b7c8d6101',
          kind: 'before',
          fileName: 'salon-avant.jpg',
          contentType: 'image/jpeg',
          sizeBytes: 482113,
          uploadedAt: '2026-11-10T08:05:00Z',
          downloadUrl: null,
          downloadExpiresAt: null,
        },
      ],
    });
    expect(photos.data[0]?.downloadUrl).toBeNull();
  });
});

describe('résumé du plan', () => {
  it('donne le nombre, le rythme, la période réelle et l’heure (exemple du contrat)', () => {
    expect(scheduleSummary(WEEKLY_SCHEDULE, WEEKLY_DATES)).toBe(
      '157 passages, chaque lundi, mercredi et samedi, du 11 nov. 2026 au 10 nov. 2027, à 08:00',
    );
  });

  it('décrit une semaine sur deux, les jours du mois et les rangs', () => {
    expect(scheduleRhythm(plan({ weekdays: ['fri'], everyWeeks: 2 }))).toBe(
      'le vendredi, une semaine sur deux',
    );
    expect(scheduleRhythm(plan({ weekdays: ['tue', 'mon'], everyWeeks: 3 }))).toBe(
      'le lundi et le mardi, toutes les 3 semaines',
    );
    expect(scheduleRhythm(plan({ mode: 'monthly', weekdays: [], monthDays: [31, 5] }))).toBe(
      'le 5 et le 31 de chaque mois (ou le dernier jour du mois)',
    );
    expect(scheduleRhythm(plan({ mode: 'monthly', weekdays: [], monthDays: [1] }))).toBe(
      'le 1er de chaque mois',
    );
    expect(scheduleRhythm(plan({ mode: 'monthly', weekdays: ['mon'], weeksOfMonth: ['last', 1] }))).toBe(
      'le 1er et le dernier lundi de chaque mois',
    );
  });

  it('décrit une prestation ponctuelle et des dates choisies', () => {
    const dates = plan({ mode: 'dates', startDate: null, endDate: null, weekdays: [], startTime: '14:00' });
    expect(scheduleSummary({ ...dates, dates: ['2026-11-20'] }, ['2026-11-20'])).toBe(
      '1 passage, le 20 nov. 2026, à 14:00',
    );
    expect(scheduleSummary(dates, ['2027-01-15', '2026-11-20', '2026-12-24'])).toBe(
      '3 passages à des dates choisies, du 20 nov. 2026 au 15 janv. 2027, à 14:00',
    );
  });

  it('garde l’ancienne récurrence en repli, sans plan', () => {
    expect(planLabel({ recurrence: { period: 'week', visitsPerPeriod: 2, durationMonths: 3 } })).toBe(
      '2 passages par semaine, pendant 3 mois',
    );
    expect(planLabel({ schedule: null, scheduledDates: [], recurrence: null })).toBeNull();
    expect(
      planLabel({
        schedule: WEEKLY_SCHEDULE,
        scheduledDates: WEEKLY_DATES,
        recurrence: { period: 'week', visitsPerPeriod: 3, durationMonths: 12 },
      }),
    ).toMatch(/^157 passages, chaque lundi/);
  });
});

describe('dates d’une mission', () => {
  const passage = (status: string, scheduledStart: string) => ({ status, scheduledStart });

  it('distingue fait, planifié et à planifier ; un passage à replanifier rend sa date à planifier', () => {
    const days = missionPlanDays(
      ['2026-11-11', '2026-11-14', '2026-11-16', '2026-11-18'],
      [
        passage('completed', '2026-11-11T07:00:00Z'),
        passage('planned', '2026-11-14T07:00:00Z'),
        // Annulé pour être replanifié : la date redevient à planifier.
        passage('cancelled', '2026-11-16T07:00:00Z'),
        // Reporté hors du plan : figure à sa nouvelle date.
        passage('planned', '2026-11-19T07:00:00Z'),
      ],
      '2026-11-12',
    );
    expect(days).toEqual([
      { date: '2026-11-11', state: 'done' },
      { date: '2026-11-14', state: 'planned' },
      { date: '2026-11-16', state: 'toPlan' },
      { date: '2026-11-18', state: 'toPlan' },
      { date: '2026-11-19', state: 'planned' },
    ]);
    expect(countPlanDays(days)).toEqual({ done: 1, planned: 2, toPlan: 2, missed: 0 });
    // Date passée sans passage (le passage a été reporté ailleurs) : « sans passage », pas « à planifier ».
    expect(missionPlanDays(['2026-11-11', '2026-11-18'], [], '2026-11-15')).toEqual([
      { date: '2026-11-11', state: 'missed' },
      { date: '2026-11-18', state: 'toPlan' },
    ]);
  });

  it('lit le jour d’un passage à l’heure du Bénin', () => {
    expect(beninDayOf('2026-11-13T23:30:00Z')).toBe('2026-11-14');
  });
});

describe('droits (ADR-049 §3)', () => {
  it('membre lecteur : `AUTH_FORBIDDEN` donne un message clair et le genre `forbidden`', () => {
    const view = describeCleaningError(new ApiError(403, 'AUTH_FORBIDDEN', 'Accès refusé.'));
    expect(view.kind).toBe('forbidden');
    expect(view.message).toMatch(/lecture seule/);
  });

  it('passage d’une autre mission : introuvable', () => {
    const view = describeCleaningError(new ApiError(404, 'CLEANING_INTERVENTION_NOT_FOUND', 'Introuvable.'));
    expect(view.kind).toBe('notFound');
  });
});
