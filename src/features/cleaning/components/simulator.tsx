'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { Button, ButtonArrow } from '@/components/ui/button';
import { FormMessage } from '@/components/ui/field';
import { IconArrowRight, IconInfo } from '@/components/ui/icons';
import { SkeletonCards } from '@/components/ui/skeleton';
import { formatXof } from '@/lib/format';
import {
  type RequestDraft,
  type StepName,
  buildValues,
  emptyDraft,
  keptTypes,
  readDraft,
  relevantParameters,
  simulationBody,
  toggleType,
  writeDraft,
} from '@/features/cleaning/draft';
import { describeCleaningError } from '@/features/cleaning/errors';
import { cleaningPaths } from '@/features/cleaning/paths';
import { buildSchedule } from '@/features/cleaning/schedule';
import type { PlaceTypeDetail, Simulation } from '@/features/cleaning/schemas';
import { simulatorTexts as t } from '@/features/cleaning/simulator-texts';
import { CleaningTypePicker, ParameterFields, PlaceTypePicker } from './catalog-fields';
import { ChoicePill, SelectField } from './fields';
import { ScheduleFields } from './schedule-fields';
import { SimulationResult } from './simulation-result';
import { type LiveState, useCatalog, usePlaceType, useSimulation, useZones } from './use-public';

/** Étape où reprendre l'assistant : la première qui n'est pas complète. */
export function resumeStep(draft: RequestDraft, detail: PlaceTypeDetail | null): StepName {
  if (!draft.placeTypeId) return 'type';
  if (draft.freeDescription && !draft.description.trim()) return 'params';
  if (!detail) return 'type';
  if (!draft.freeDescription && !keptTypes(detail, draft.cleaningTypeIds).length) return 'type';
  const types = draft.freeDescription ? [] : keptTypes(detail, draft.cleaningTypeIds);
  const { errors } = buildValues(relevantParameters(detail, types), draft.values);
  if (Object.keys(errors).length || (draft.freeDescription && !draft.description.trim())) return 'params';
  if ('errors' in buildSchedule(draft.schedule)) return 'schedule';
  return 'place';
}

/** Erreurs de saisie montrées pendant la simulation : seulement celles des champs déjà remplis. */
export function visibleValueErrors(
  errors: Record<string, string>,
  values: Record<string, string>,
  server: Record<string, string> = {},
): Record<string, string> {
  const shown: Record<string, string> = { ...server };
  for (const [key, message] of Object.entries(errors)) {
    const code = key.startsWith('values.') ? key.slice('values.'.length) : null;
    if (code && (values[code] ?? '').trim()) shown[key] = message;
  }
  return shown;
}

/**
 * Simulateur public de `/nettoyage` (ADR-056) : lieu, types de nettoyage, paramètres, commune et rythme
 * facultatifs ; estimation en direct calculée par la gateway. « Demander un devis » garde la saisie dans
 * l'onglet et ouvre l'assistant à la première étape à compléter.
 */
export function CleaningSimulator() {
  const router = useRouter();
  const catalog = useCatalog();
  const zones = useZones();
  const [draft, setDraft] = useState<RequestDraft>(() => readDraft() ?? emptyDraft());
  const detail = usePlaceType(draft.placeTypeId);
  const placeType = detail.state.status === 'ready' ? detail.state.data : null;

  useEffect(() => writeDraft(draft), [draft]);

  const update = (patch: Partial<RequestDraft>) => setDraft((current) => ({ ...current, ...patch }));
  const { body, errors } = useMemo(() => simulationBody(draft, placeType), [draft, placeType]);
  const simulation = useSimulation(body);
  const serverFields = simulation.status === 'error' ? simulation.error.fields : {};
  const shownErrors = visibleValueErrors(errors, draft.values, serverFields);
  const types = placeType ? keptTypes(placeType, draft.cleaningTypeIds) : [];
  const parameters = placeType ? relevantParameters(placeType, types) : [];

  function goToRequest() {
    writeDraft({ ...draft, step: resumeStep(draft, placeType) });
    router.push(cleaningPaths.request);
  }

  if (catalog.state.status === 'loading') return <SkeletonCards label={t.loading} rows={3} />;
  if (catalog.state.status === 'error') {
    return (
      <div className="grid justify-items-start gap-3">
        <FormMessage>{`${t.catalogError} ${describeCleaningError(catalog.state.error).message}`}</FormMessage>
        <Button variant="secondary" onClick={catalog.reload}>
          {t.retry}
        </Button>
      </div>
    );
  }

  return (
    <div className="grid gap-8 pb-24 lg:grid-cols-12 lg:items-start lg:gap-10 lg:pb-0">
      <div className="rounded-panel border-line bg-surface grid gap-8 border p-5 shadow-xs sm:p-8 lg:col-span-7">
        <PlaceTypePicker
          id="simulateur-lieu"
          catalog={catalog.state.data}
          value={draft.placeTypeId}
          onChange={(placeTypeId, freeDescription) =>
            update({ placeTypeId, freeDescription, cleaningTypeIds: [], values: {} })
          }
        />

        {draft.placeTypeId && draft.freeDescription ? (
          <div className="swap-in rounded-card border-accent-muted bg-accent-soft grid gap-3 border p-5">
            <p className="text-ink flex items-center gap-2 font-semibold">
              <IconInfo className="size-5" />
              {t.otherTitle}
            </p>
            <p className="text-ink">{t.otherText}</p>
            <Button variant="action" className="justify-self-start" onClick={goToRequest}>
              {t.requestOther}
              <ButtonArrow>
                <IconArrowRight />
              </ButtonArrow>
            </Button>
          </div>
        ) : null}

        {draft.placeTypeId && !draft.freeDescription ? (
          detail.state.status === 'loading' ? (
            <SkeletonCards label={t.detailLoading} rows={2} />
          ) : detail.state.status === 'error' ? (
            <div className="grid justify-items-start gap-3">
              <FormMessage>{`${t.detailError} ${describeCleaningError(detail.state.error).message}`}</FormMessage>
              <Button variant="secondary" onClick={detail.reload}>
                {t.retry}
              </Button>
            </div>
          ) : placeType ? (
            <div className="swap-in grid gap-8" key={placeType.placeType.id}>
              <CleaningTypePicker
                id="simulateur-types"
                detail={placeType}
                selected={draft.cleaningTypeIds}
                onToggle={(typeId) =>
                  update({ cleaningTypeIds: toggleType(placeType, draft.cleaningTypeIds, typeId) })
                }
                error={serverFields['cleaningTypeIds'] ?? null}
              />
              {types.length && parameters.length ? (
                <div className="grid gap-4">
                  <h3 className="font-display text-ink text-lg font-semibold">{t.paramsTitle}</h3>
                  <p className="text-small text-ink-muted -mt-2">{t.paramsHint}</p>
                  <ParameterFields
                    idPrefix="simulateur"
                    parameters={parameters}
                    values={draft.values}
                    errors={shownErrors}
                    onChange={(code, value) => update({ values: { ...draft.values, [code]: value } })}
                  />
                </div>
              ) : null}
              {types.length ? (
                <>
                  <SelectField
                    id="simulateur-commune"
                    label={t.communeLabel}
                    hint={zones.state.status === 'error' ? t.zonesError : t.communeHint}
                    value={draft.communeKey}
                    disabled={zones.state.status !== 'ready'}
                    onChange={(event) => update({ communeKey: event.target.value })}
                    className="sm:max-w-sm"
                  >
                    <option value="">{t.communeUnknown}</option>
                    {zones.state.status === 'ready'
                      ? zones.state.data.map((zone) => (
                          <option key={zone.communeKey} value={zone.communeKey}>
                            {zone.name}
                          </option>
                        ))
                      : null}
                  </SelectField>
                  <div className="grid gap-4">
                    <ChoicePill
                      type="checkbox"
                      checked={draft.withSchedule}
                      onChange={() => update({ withSchedule: !draft.withSchedule })}
                      label={t.scheduleToggle}
                      hint={t.scheduleToggleHint}
                    />
                    {draft.withSchedule ? (
                      <ScheduleFields
                        idPrefix="simulateur-rythme"
                        draft={draft.schedule}
                        onChange={(schedule) => update({ schedule })}
                        errors={visibleScheduleErrors(errors, serverFields)}
                      />
                    ) : null}
                  </div>
                </>
              ) : null}
            </div>
          ) : null
        ) : null}
      </div>

      <div className="grid gap-4 lg:sticky lg:top-24 lg:col-span-5">
        <SimulationResult
          state={simulation}
          footer={
            draft.placeTypeId && !draft.freeDescription ? (
              <div className="border-line hidden gap-2 border-t pt-4 lg:grid">
                <Button variant="action" size="lg" onClick={goToRequest}>
                  {t.request}
                  <ButtonArrow>
                    <IconArrowRight />
                  </ButtonArrow>
                </Button>
                <p className="text-small text-ink-muted">{t.requestHint}</p>
              </div>
            ) : null
          }
        />
      </div>

      {draft.placeTypeId && !draft.freeDescription ? (
        <MobileRequestBar state={simulation} onRequest={goToRequest} />
      ) : null}
    </div>
  );
}

/** Erreurs du rythme : seulement après une première saisie (nature choisie), et celles de la gateway. */
function visibleScheduleErrors(errors: Record<string, string>, server: Record<string, string>) {
  const shown: Record<string, string> = {};
  for (const [key, message] of Object.entries({ ...errors, ...server })) {
    if (key.startsWith('schedule.') && key !== 'schedule.kind') shown[key] = message;
  }
  return shown;
}

/** Barre d'action fixée en bas de l'écran du téléphone : l'estimation en bref et « Demander un devis ». */
function MobileRequestBar({ state, onRequest }: { state: LiveState<Simulation>; onRequest: () => void }) {
  const data = state.status === 'ready' ? state.data : state.status === 'idle' ? null : state.last;
  const range = data?.pricing.range;
  const summary =
    data?.pricing.status === 'priced' && range?.low && range.high
      ? t.range(formatXof(range.low), formatXof(range.high))
      : data?.pricing.status === 'partially_priced' && data.pricing.pricedSubtotal
        ? `${t.from} ${formatXof(data.pricing.pricedSubtotal)}`
        : data
          ? t.onQuote
          : null;
  return (
    <div className="border-line bg-surface/95 fixed inset-x-0 bottom-0 z-40 border-t px-4 py-3 shadow-[0_-8px_24px_-16px_rgb(15_40_80/0.35)] backdrop-blur lg:hidden">
      <div className="mx-auto flex max-w-xl items-center gap-3">
        <p aria-live="polite" className="text-small text-ink min-w-0 flex-1 font-semibold tabular-nums">
          {summary ?? t.resultTitle}
        </p>
        <Button variant="action" onClick={onRequest} className="shrink-0">
          {t.request}
        </Button>
      </div>
    </div>
  );
}
