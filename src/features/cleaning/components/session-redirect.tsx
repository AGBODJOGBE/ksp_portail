'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useEffect } from 'react';
import { BandHeader, BandTitle } from '@/components/ui/band-header';
import { Button } from '@/components/ui/button';
import { FormMessage } from '@/components/ui/field';
import { contextKey, useSession } from '@/lib/api';
import { useResource } from '@/lib/use-resource';
import { getSession } from '@/features/cleaning/api';
import { describeCleaningError, errorWithReference } from '@/features/cleaning/errors';
import { cleaningPaths } from '@/features/cleaning/paths';
import { programTexts, sessionTexts as t } from '@/features/cleaning/program-texts';

/**
 * Séance ouverte sans son programme (`/mon-espace/nettoyage/seances/[id]`, retour d'un paiement :
 * `subjectPath` du service payment) : la séance est lue pour son programme, puis la page est remplacée
 * par l'adresse imbriquée, avec la même recherche (`?organisation=`).
 */
export function SessionRedirect({ id }: { id: string }) {
  const key = contextKey(useSession()) ?? 'none';
  return <Redirect key={`${key}-${id}`} id={id} />;
}

function Redirect({ id }: { id: string }) {
  const router = useRouter();
  const search = useSearchParams().toString();
  const load = useCallback(() => getSession(id), [id]);
  const { state, reload } = useResource(load);

  useEffect(() => {
    if (state.status !== 'ready') return;
    const target = cleaningPaths.session(state.data.programId, state.data.id);
    router.replace(search ? `${target}?${search}` : target);
  }, [state, router, search]);

  if (state.status !== 'error') {
    return (
      <p role="status" className="text-ink-muted">
        {t.loading}
      </p>
    );
  }
  const view = describeCleaningError(state.error);
  return (
    <div className="grid gap-8">
      <BandHeader>
        <BandTitle
          back={{ href: cleaningPaths.programs, label: programTexts.back }}
          title={programTexts.sessionsTitle}
        />
      </BandHeader>
      <div className="rounded-card border-line bg-surface grid justify-items-start gap-4 border p-5 shadow-xs sm:p-6">
        <FormMessage>{view.kind === 'notFound' ? t.notFound : errorWithReference(view)}</FormMessage>
        {view.kind === 'notFound' ? null : (
          <Button variant="secondary" onClick={reload}>
            {programTexts.retry}
          </Button>
        )}
      </div>
    </div>
  );
}
