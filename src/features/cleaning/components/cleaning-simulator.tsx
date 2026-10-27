'use client';

import { lazy, Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import { GuidedForm } from '@/components/sections/guided-form';
import type { Answers } from '@/components/sections/guided-form-logic';
import type { GuidedFormContent } from '@/components/sections/guided-form-types';
import { Button } from '@/components/ui/button';
import { FormMessage } from '@/components/ui/field';
import { listServices } from '@/features/cleaning/api';
import { describeCleaningError } from '@/features/cleaning/errors';
import type { ServiceOffer } from '@/features/cleaning/schemas';
import { draftFromAnswers, simulatorSteps } from '@/features/cleaning/simulator-steps';
import { cleaningTexts } from '@/features/cleaning/texts';

// L'écran d'estimation n'est téléchargé qu'à la dernière étape.
const SimulationResult = lazy(() =>
  import('./simulation-result').then((module_) => ({ default: module_.SimulationResult })),
);

const t = cleaningTexts.simulator;

type State =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; services: ServiceOffer[] };

/**
 * Simulateur du Nettoyage branché sur la gateway : prestations lues dans le catalogue
 * (`GET /cleaning/services`), estimation demandée à la dernière étape (`POST /cleaning/simulations`).
 * Sans compte ni donnée personnelle ; rien n'est enregistré.
 */
export function CleaningSimulator({
  content,
  whatsappNumber,
}: {
  content: GuidedFormContent;
  whatsappNumber?: string;
}) {
  const [state, setState] = useState<State>({ status: 'loading' });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let active = true;
    listServices()
      .then((services) => active && setState({ status: 'ready', services }))
      .catch((error: unknown) => {
        if (active) setState({ status: 'error', message: describeCleaningError(error).message });
      });
    return () => {
      active = false;
    };
  }, [attempt]);

  const services = useMemo(() => (state.status === 'ready' ? state.services : []), [state]);
  const stepsFor = useCallback((answers: Answers) => simulatorSteps(services, answers), [services]);
  const renderResult = useCallback(
    (answers: Answers) => {
      const draft = draftFromAnswers(services, answers);
      if (!draft) return null;
      return (
        <Suspense
          fallback={
            <p role="status" className="text-ink-muted">
              {t.computing}
            </p>
          }
        >
          <SimulationResult draft={draft} />
        </Suspense>
      );
    },
    [services],
  );

  if (state.status === 'loading') {
    return (
      <p role="status" className="rounded-panel border-line bg-surface text-ink-muted border p-8">
        {t.loadingServices}
      </p>
    );
  }
  if (state.status === 'error') {
    return (
      <div className="rounded-panel border-line bg-surface grid justify-items-start gap-4 border p-8">
        <FormMessage>{`${t.servicesError} ${state.message}`}</FormMessage>
        <Button
          variant="secondary"
          onClick={() => {
            setState({ status: 'loading' });
            setAttempt((value) => value + 1);
          }}
        >
          {cleaningTexts.common.retry}
        </Button>
      </div>
    );
  }
  if (!state.services.length) {
    return <p className="rounded-panel border-line bg-surface text-ink-muted border p-8">{t.noServices}</p>;
  }
  return (
    <GuidedForm
      content={content}
      whatsappNumber={whatsappNumber}
      stepsFor={stepsFor}
      renderResult={renderResult}
    />
  );
}
