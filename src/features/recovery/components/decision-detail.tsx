'use client';

import Link from 'next/link';
import { useCallback, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { BackendPending } from '@/components/ui/backend-pending';
import { BandBack, BandHeader } from '@/components/ui/band-header';
import { Button } from '@/components/ui/button';
import { FormMessage } from '@/components/ui/field';
import { Heading } from '@/components/ui/heading';
import { IconClock } from '@/components/ui/icons';
import { LinkSheetFacts } from '@/components/ui/link-sheet';
import { Skeleton } from '@/components/ui/skeleton';
import { isBackendPending } from '@/lib/api';
import { formatDateTime, formatShortDate } from '@/lib/format';
import { useResource } from '@/lib/use-resource';
import { useReadOnly } from '@/features/identity';
import { findDecision } from '@/features/recovery/decision-api';
import type { RecoveryDecision } from '@/features/recovery/decision-schemas';
import { decisionKind, decisionStatus, decisionTexts as t } from '@/features/recovery/decision-texts';
import { describeRecoveryError, errorWithReference } from '@/features/recovery/errors';
import { recoveryPaths } from '@/features/recovery/paths';
import {
  type AnswerHandlers,
  ApproveReject,
  DecisionBody,
  DisputeAnswer,
  QuoteAnswer,
  bodyTitle,
} from './decision-parts';

const CARD = 'rounded-panel border-line bg-surface grid gap-4 border p-5 shadow-xs sm:p-7';
const LINK = 'text-brand-ink inline-flex min-h-11 items-center font-semibold underline underline-offset-4';

type Notice = { tone: 'success' | 'info'; text: string } | null;

/**
 * Page d'une décision (`/mon-espace/recouvrement/decisions/[id]`, adresse des notifications) : ce qui est
 * demandé, la date limite et la conséquence d'une absence de réponse, le contenu selon le type
 * (échéancier, remise, devis et provision, contestation, saut d'étape), puis la réponse. Le contrat n'a pas
 * de lecture par identifiant : la décision est retrouvée dans la liste. Membre lecteur : consultation
 * seule. Le message de la réponse reste affiché après la relecture.
 */
export function DecisionDetail({ id }: { id: string }) {
  const { state, reload, refresh, set } = useResource(useCallback(() => findDecision(id), [id]));
  const readOnly = useReadOnly();
  const [notice, setNotice] = useState<Notice>(null);

  if (state.status === 'loading') {
    return (
      <div role="status" className="grid gap-8">
        <span className="sr-only">{t.loading}</span>
        <BandHeader overlap={<Skeleton className="rounded-card h-32" />}>
          <div className="grid gap-3" aria-hidden="true">
            <Skeleton className="h-11 w-40" />
            <Skeleton className="h-11 w-2/3 max-w-md" />
          </div>
        </BandHeader>
      </div>
    );
  }
  if (state.status === 'error' || !state.data) {
    const pending = state.status === 'error' && isBackendPending(state.error);
    const view = state.status === 'error' ? describeRecoveryError(state.error) : null;
    return (
      <div className="grid gap-8">
        <BandHeader>
          <BandBack href={recoveryPaths.decisions} label={t.allDecisions} />
        </BandHeader>
        {pending ? (
          <BackendPending
            id="decision-attente"
            title={t.listTitle}
            needs={[
              { method: 'GET', path: '/api/v1/recovery/decisions', purpose: 'Décisions du créancier.' },
            ]}
          >
            {t.listLead}
          </BackendPending>
        ) : (
          <div className={`${CARD} justify-items-start`}>
            <FormMessage>{view ? errorWithReference(view) : t.notFound}</FormMessage>
            {view && view.kind !== 'forbidden' ? (
              <Button variant="secondary" onClick={reload}>
                {t.retry}
              </Button>
            ) : (
              <Link href={recoveryPaths.decisions} className={LINK}>
                {t.allDecisions}
              </Link>
            )}
          </div>
        )}
      </div>
    );
  }

  const decision = state.data;
  const kind = decisionKind(decision.kind);
  const status = decisionStatus(decision.status);
  const pending = decision.status === 'pending';
  const deadline = formatDateTime(decision.expiresAt);
  const title = bodyTitle(decision);
  const handlers: AnswerHandlers = {
    onAnswered: (result, text) => {
      set(result.decision);
      setNotice({ tone: 'success', text });
    },
    onStale: (text) => {
      setNotice({ tone: 'info', text });
      refresh();
    },
  };

  return (
    <div className="grid gap-8">
      <BandHeader
        overlap={
          <section aria-label={t.deadlineTitle} className={`${CARD} shadow-float`}>
            <LinkSheetFacts
              rows={[
                [t.caseLabel, decision.caseNumber],
                [t.deadlineTitle, deadline],
                [t.requestedLabel, formatShortDate(decision.createdAt)],
                [t.answeredLabel, decision.answeredAt ? formatShortDate(decision.answeredAt) : null],
              ]}
            />
          </section>
        }
      >
        <BandBack href={recoveryPaths.decisions} label={t.allDecisions} />
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <Badge tone={status.tone} dot>
            {status.label}
          </Badge>
          <Link
            href={recoveryPaths.case(decision.caseId)}
            className="text-small text-ink-muted tabular-nums underline underline-offset-4"
          >
            {t.caseNumber(decision.caseNumber)}
          </Link>
        </div>
        <Heading as="h1" size="h1" className="mt-3">
          {kind.title}
        </Heading>
        <p className="text-ink-muted mt-2 max-w-2xl">{kind.lead}</p>
      </BandHeader>

      {notice ? <FormMessage tone={notice.tone}>{notice.text}</FormMessage> : null}

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_24rem] lg:items-start">
        <section aria-labelledby="decision-contenu" className={CARD}>
          <Heading as="h2" size="h3" id="decision-contenu">
            {title ?? kind.title}
          </Heading>
          <DecisionBody decision={decision} />
        </section>
        <section
          aria-labelledby="decision-reponse"
          className={`${CARD} ${pending ? 'border-l-action border-l-4' : ''}`}
        >
          <Heading as="h2" size="h3" id="decision-reponse">
            {pending ? t.answerBefore(deadline) : status.label}
          </Heading>
          {pending ? (
            <>
              <p className="text-small text-ink-muted flex items-start gap-2">
                <IconClock className="mt-0.5 size-4 shrink-0" />
                {t.withoutAnswer(deadline, kind.withoutAnswer)}
              </p>
              {readOnly ? (
                <FormMessage tone="info">{t.readOnly}</FormMessage>
              ) : (
                <Answer decision={decision} {...handlers} />
              )}
            </>
          ) : (
            <p className="text-ink-muted">{t.closedNotice}</p>
          )}
          <Link href={recoveryPaths.case(decision.caseId)} className={LINK}>
            {t.caseLink}
          </Link>
        </section>
      </div>
    </div>
  );
}

/** Réponse selon le type : accord par le portefeuille pour un devis, réponse écrite pour une contestation. */
function Answer({ decision, ...handlers }: AnswerHandlers & { decision: RecoveryDecision }) {
  if (decision.feeQuote)
    return <QuoteAnswer decision={{ ...decision, feeQuote: decision.feeQuote }} {...handlers} />;
  if (decision.kind === 'dispute_response') return <DisputeAnswer decision={decision} {...handlers} />;
  const hint =
    decision.kind === 'plan_off_scale'
      ? t.approvePlan
      : decision.kind === 'settlement_discount'
        ? t.approveSettlement
        : decision.kind === 'stage_skip'
          ? t.approveSkip
          : undefined;
  return <ApproveReject decision={decision} approveHint={hint} {...handlers} />;
}
