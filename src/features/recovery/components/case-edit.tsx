'use client';

import { useCallback } from 'react';
import { BandHeader, BandTitle } from '@/components/ui/band-header';
import { Button, ButtonLink } from '@/components/ui/button';
import { FormMessage } from '@/components/ui/field';
import { SkeletonCards } from '@/components/ui/skeleton';
import { useResource } from '@/lib/use-resource';
import { useReadOnly } from '@/features/identity';
import { getCase } from '@/features/recovery/api';
import { caseTexts } from '@/features/recovery/case-texts';
import { draftFromCase } from '@/features/recovery/draft';
import { describeRecoveryError, errorWithReference } from '@/features/recovery/errors';
import { recoveryPaths } from '@/features/recovery/paths';
import { recoveryTexts } from '@/features/recovery/texts';
import { wizardTexts as t } from '@/features/recovery/wizard-texts';
import { CaseEditor } from './case-wizard';

/**
 * Modification d'un dossier (`/mon-espace/recouvrement/dossiers/[id]/modifier`) : brouillon (modification
 * libre ; un mandat préparé mais pas signé sera préparé de nouveau) ou complément demandé par KSP (motif
 * affiché, note de réponse, le dossier repasse en examen). Autre état ou membre lecteur : explication.
 */
export function CaseEdit({ id }: { id: string }) {
  const { state, reload } = useResource(useCallback(() => getCase(id), [id]));
  const readOnly = useReadOnly();
  const back = { href: recoveryPaths.case(id), label: caseTexts.back };

  if (state.status === 'loading') return <SkeletonCards label={t.loading} rows={2} />;
  if (state.status === 'error') {
    const view = describeRecoveryError(state.error);
    return (
      <div className="grid justify-items-start gap-3">
        <FormMessage>{view.kind === 'notFound' ? caseTexts.notFound : errorWithReference(view)}</FormMessage>
        {view.kind === 'notFound' ? null : (
          <Button variant="secondary" onClick={reload}>
            {t.retry}
          </Button>
        )}
      </div>
    );
  }
  const recoveryCase = state.data;
  const completing = recoveryCase.status === 'info_requested';
  const editable = recoveryCase.status === 'draft' || completing;
  return (
    <div className="grid gap-10">
      <BandHeader>
        <BandTitle
          back={{ href: recoveryPaths.case(id), label: caseTexts.numberOf(recoveryCase.number) }}
          eyebrow={recoveryTexts.title}
          title={completing ? t.completeTitle(recoveryCase.number) : t.editTitle(recoveryCase.number)}
          lead={completing ? t.completeLead : t.editLead}
        />
      </BandHeader>
      {readOnly ? (
        <FormMessage tone="info">{recoveryTexts.readOnly}</FormMessage>
      ) : !editable ? (
        <div className="grid justify-items-start gap-3">
          <FormMessage tone="info">{t.notEditable}</FormMessage>
          <ButtonLink href={back.href} variant="secondary">
            {caseTexts.numberOf(recoveryCase.number)}
          </ButtonLink>
        </div>
      ) : (
        <CaseEditor
          initial={{ ...draftFromCase(recoveryCase), step: completing ? 'review' : 'type' }}
          recoveryCase={recoveryCase}
        />
      )}
    </div>
  );
}
