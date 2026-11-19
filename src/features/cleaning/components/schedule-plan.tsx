'use client';

import { type CalendarMark, MonthCalendar } from '@/components/ui/month-calendar';
import { cleaningTexts } from '@/features/cleaning/texts';
import {
  countPlanDays,
  formatPlanDayLong,
  missionPlanDays,
  type PlanDayState,
  scheduleSummary,
} from '@/features/cleaning/schedule';
import type { Intervention, Schedule } from '@/features/cleaning/schemas';
import { Facts } from './detail-parts';

const t = cleaningTexts.schedule;

const MISSION_TONES: Record<PlanDayState, { tone: CalendarMark['tone']; label: string }> = {
  done: { tone: 'brand', label: t.done },
  planned: { tone: 'action', label: t.planned },
  toPlan: { tone: 'pending', label: t.toPlan },
  missed: { tone: 'muted', label: t.missed },
};

const BAR: Record<PlanDayState, string> = {
  done: 'bg-brand',
  planned: 'bg-action',
  toPlan: 'bg-accent-muted',
  missed: 'bg-line-strong',
};

/** Mission : passages faits, planifiés et restant à planifier ; progression « N sur prévus ». */
export interface MissionProgress {
  interventions: ReadonlyArray<Pick<Intervention, 'status' | 'scheduledStart'>>;
  /** `completedInterventions` et `plannedInterventions` de la gateway. */
  completed: number;
  planned: number;
}

/**
 * Plan de passages en affichage seul (ADR-052) : résumé, premier et dernier passage, jours retirés ou
 * ajoutés, puis calendrier mois par mois des dates exactes renvoyées par la gateway. Pour une mission,
 * chaque date porte son état (fait, planifié, à planifier) et la progression est celle de la gateway.
 * Réutilisable par la saisie du plan (aperçu `previewSchedule`).
 */
export function SchedulePlan({
  schedule,
  dates,
  lead,
  mission,
}: {
  schedule: Schedule;
  /** `scheduledDates` (ou les dates d'un aperçu), `AAAA-MM-JJ`. */
  dates: ReadonlyArray<string>;
  lead?: string;
  mission?: MissionProgress;
}) {
  const sorted = [...dates].sort();
  const first = sorted[0];
  const last = sorted.at(-1);
  const days = mission ? missionPlanDays(sorted, mission.interventions) : null;
  const counts = days ? countPlanDays(days) : null;
  const marks: CalendarMark[] = days
    ? days.map((day) => ({ date: day.date, ...MISSION_TONES[day.state] }))
    : sorted.map((date) => ({ date, tone: 'soft', label: t.planDay }));
  // Mission : le calendrier s'ouvre sur la première date qui n'est pas encore faite.
  const opening = days?.find((day) => day.state !== 'done')?.date ?? first;

  return (
    <div className="grid gap-5">
      <p className="text-ink font-semibold">{scheduleSummary(schedule, sorted)}</p>
      {lead ? <p className="text-small text-ink-muted -mt-3">{lead}</p> : null}
      {mission && counts ? (
        <div className="grid gap-2">
          <div className="flex flex-wrap items-baseline justify-between gap-x-3">
            <p className="text-small text-ink-muted font-semibold">{t.progressLabel}</p>
            <p className="text-ink font-semibold tabular-nums">
              {t.progress(mission.completed, mission.planned)}
            </p>
          </div>
          {/* Barre empilée : faits, planifiés, restant à planifier (part de chaque état dans les dates). */}
          <div
            role="progressbar"
            aria-label={t.progressLabel}
            aria-valuemin={0}
            aria-valuemax={mission.planned}
            aria-valuenow={mission.completed}
            aria-valuetext={t.progress(mission.completed, mission.planned)}
            className="bg-surface-sunken flex h-2 overflow-hidden rounded-full"
          >
            {(['done', 'planned', 'missed', 'toPlan'] as const).map((state) =>
              counts[state] ? (
                <span
                  key={state}
                  className={BAR[state]}
                  style={{ width: `${(counts[state] / Math.max(1, days!.length)) * 100}%` }}
                />
              ) : null,
            )}
          </div>
        </div>
      ) : null}
      <Facts
        rows={[
          [t.first, first ? `${formatPlanDayLong(first)}, ${schedule.startTime}` : null],
          [t.last, last && last !== first ? formatPlanDayLong(last) : null],
          [
            t.excluded(schedule.excludedDates.length),
            schedule.excludedDates.length
              ? [...schedule.excludedDates].sort().map(formatPlanDayLong).join(' ; ')
              : null,
          ],
          [
            t.extra(schedule.extraDates.length),
            schedule.extraDates.length
              ? [...schedule.extraDates].sort().map(formatPlanDayLong).join(' ; ')
              : null,
          ],
        ]}
      />
      {marks.length ? (
        <MonthCalendar
          className="w-full max-w-md"
          marks={marks}
          initialMonth={opening?.slice(0, 7)}
          label={t.calendar}
          previousLabel={t.previousMonth}
          nextLabel={t.nextMonth}
          monthCount={t.monthCount}
          legend={
            counts
              ? [
                  { tone: 'brand', label: t.done, count: counts.done },
                  { tone: 'action', label: t.planned, count: counts.planned },
                  { tone: 'pending', label: t.toPlan, count: counts.toPlan },
                  ...(counts.missed
                    ? [{ tone: 'muted' as const, label: t.missed, count: counts.missed }]
                    : []),
                ]
              : [{ tone: 'soft', label: t.planLegend, count: sorted.length }]
          }
        />
      ) : null}
    </div>
  );
}
