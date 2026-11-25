'use client';

import Link from 'next/link';
import { useCallback, useRef, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { BandHeader, BandTitle } from '@/components/ui/band-header';
import { Button, ButtonLink } from '@/components/ui/button';
import { FormMessage } from '@/components/ui/field';
import { Skeleton } from '@/components/ui/skeleton';
import { contextKey, useSession } from '@/lib/api';
import { cn } from '@/lib/cn';
import { formatDateTime, formatShortDate, formatXof } from '@/lib/format';
import { useResource } from '@/lib/use-resource';
import { useOrganizationRole } from '@/features/identity';
import { walletPaths } from '@/features/wallet';
import { addClaimMessage, getClaim } from '@/features/cleaning/api';
import {
  type CleaningErrorView,
  describeCleaningError,
  errorWithReference,
} from '@/features/cleaning/errors';
import { idempotentSubmission } from '@/lib/idempotency';
import { cleaningPaths } from '@/features/cleaning/paths';
import { claimTexts as t } from '@/features/cleaning/program-texts';
import type { Claim } from '@/features/cleaning/schemas';
import {
  OPEN_CLAIM_STATUSES,
  claimCategory,
  claimOutcome,
  claimStatus,
} from '@/features/cleaning/status-texts';
import { cleaningTexts } from '@/features/cleaning/texts';
import { Panel, TextAreaField } from '@/components/ui/form-fields';
import { SessionPhotos } from './session-parts';

const MAX_MESSAGE = 2000;

/**
 * Page d'une réclamation (`/mon-espace/nettoyage/reclamations/[id]`, adresse des notifications) :
 * nature, texte et photos, fil des messages, réponse tant qu'elle est ouverte, décision de KSP (séance
 * gratuite, crédit, rejet). Lecteur d'une entreprise : lecture seule.
 */
export function ClaimDetail({ id }: { id: string }) {
  const key = contextKey(useSession()) ?? 'none';
  return <Detail key={`${key}-${id}`} id={id} />;
}

function Detail({ id }: { id: string }) {
  const load = useCallback(() => getClaim(id), [id]);
  const resource = useResource(load);
  const role = useOrganizationRole();
  const state = resource.state;

  if (state.status === 'loading') {
    return (
      <div role="status" className="grid gap-8">
        <span className="sr-only">{t.detailLoading}</span>
        <BandHeader>
          <div className="grid gap-3" aria-hidden="true">
            <Skeleton className="h-11 w-48" />
            <Skeleton className="h-11 w-2/3 max-w-md" />
          </div>
        </BandHeader>
        <Skeleton className="rounded-card h-56" />
      </div>
    );
  }
  if (state.status === 'error') {
    const view = describeCleaningError(state.error);
    return (
      <div className="grid gap-8">
        <BandHeader>
          <BandTitle back={{ href: cleaningPaths.claims, label: t.back }} title={cleaningTexts.space.title} />
        </BandHeader>
        <div className="rounded-card border-line bg-surface grid justify-items-start gap-4 border p-5 shadow-xs sm:p-6">
          <FormMessage>{view.kind === 'notFound' ? t.notFound : errorWithReference(view)}</FormMessage>
          {view.kind === 'notFound' ? null : (
            <Button variant="secondary" onClick={resource.reload}>
              {t.retry}
            </Button>
          )}
        </div>
      </div>
    );
  }

  const claim = state.data;
  const status = claimStatus(claim.status);
  const open = OPEN_CLAIM_STATUSES.has(claim.status);
  return (
    <div className="grid gap-8">
      <BandHeader>
        <BandTitle
          back={{ href: cleaningPaths.claims, label: t.back }}
          eyebrow={t.eyebrow}
          title={claimCategory(claim.category)}
          lead={[
            t.openedAt(formatShortDate(claim.openedAt)),
            claim.closedAt ? t.closedAt(formatShortDate(claim.closedAt)) : null,
          ]
            .filter(Boolean)
            .join(' · ')}
        >
          <div className="flex flex-wrap items-center gap-3">
            <Badge tone={status.tone} dot>
              {status.label}
            </Badge>
            <Link
              href={cleaningPaths.session(claim.programId, claim.sessionId)}
              className="text-small inline-flex min-h-11 items-center font-semibold underline underline-offset-4"
            >
              {t.seeSession}
            </Link>
          </div>
        </BandTitle>
      </BandHeader>

      {claim.decision ? <Decision claim={claim} /> : null}
      <Panel id="reclamation-texte-titre" title={t.yourClaim}>
        <p className="text-ink whitespace-pre-line">{claim.text}</p>
        <p className="text-small text-ink-muted mt-3">
          {claim.firstResponseAt
            ? t.firstResponse(formatDateTime(claim.firstResponseAt))
            : open
              ? t.awaitingResponse
              : null}
        </p>
      </Panel>
      <SessionPhotos photos={claim.photos} onRefresh={resource.refresh} />
      <Thread claim={claim} />
      {open ? (
        role === 'org_viewer' ? (
          <FormMessage tone="info">{t.readOnly}</FormMessage>
        ) : (
          <Reply claim={claim} onReplace={resource.set} onStale={resource.refresh} />
        )
      ) : (
        <p className="text-ink-muted">{t.replyClosed}</p>
      )}
    </div>
  );
}

/** Décision de KSP : séance gratuite (lien), crédit (portefeuille ou avoir), rejet motivé. */
function Decision({ claim }: { claim: Claim }) {
  const decision = claim.decision!;
  const rejected = decision.outcome === 'rejected';
  return (
    <section
      aria-labelledby="decision-titre"
      className={cn(
        'rounded-panel bg-surface signature-edge border p-5 shadow-xs sm:p-8',
        rejected ? 'border-line' : 'border-action-muted',
      )}
    >
      <h2 id="decision-titre" className="font-display text-h3 text-ink font-semibold">
        {t.decisionTitle}
      </h2>
      <p className="text-ink mt-3 text-lg font-semibold">{claimOutcome(decision.outcome)}</p>
      <p className="text-ink mt-2 whitespace-pre-line">{decision.reason}</p>
      <p className="text-small text-ink-muted mt-2">{t.decidedAt(formatShortDate(decision.decidedAt))}</p>
      {decision.approvalStatus === 'pending' ? (
        <FormMessage tone="info" className="mt-4">
          {t.approvalPending}
        </FormMessage>
      ) : null}
      {decision.outcome === 'wallet_credit' && decision.creditAmount ? (
        <div className="mt-4 grid justify-items-start gap-2">
          <p className="text-ink font-semibold tabular-nums">{t.credit(formatXof(decision.creditAmount))}</p>
          <p className="text-small text-ink-muted">{claim.organizationId ? t.creditNote : t.creditWallet}</p>
          {claim.organizationId ? null : (
            <Link
              href={walletPaths.home}
              className="text-brand-ink inline-flex min-h-11 items-center font-semibold underline underline-offset-4"
            >
              {t.seeWallet}
            </Link>
          )}
        </div>
      ) : null}
      {decision.outcome === 'free_redo' && decision.redoSessionId ? (
        <ButtonLink
          href={cleaningPaths.session(claim.programId, decision.redoSessionId)}
          variant="action"
          className="mt-4"
        >
          {t.seeRedo}
        </ButtonLink>
      ) : null}
    </section>
  );
}

/** Fil des messages, dans l'ordre chronologique : le client à droite, KSP à gauche. */
function Thread({ claim }: { claim: Claim }) {
  return (
    <Panel id="echanges-titre" title={t.threadTitle}>
      {claim.messages.length ? (
        <ol className="grid gap-3">
          {claim.messages.map((message) => {
            const mine = message.author === 'customer';
            return (
              <li
                key={message.id}
                className={cn(
                  'rounded-card grid max-w-[85%] gap-1 p-3 sm:p-4',
                  mine
                    ? 'bg-brand-soft justify-self-end'
                    : 'bg-surface-muted ring-line justify-self-start ring-1 ring-inset',
                )}
              >
                <p className="text-small text-ink-muted font-semibold">
                  {mine ? t.you : t.staff} · {formatDateTime(message.at)}
                </p>
                <p className="text-ink whitespace-pre-line">{message.text}</p>
              </li>
            );
          })}
        </ol>
      ) : (
        <p className="text-ink-muted">{t.threadEmpty}</p>
      )}
    </Panel>
  );
}

function Reply({
  claim,
  onReplace,
  onStale,
}: {
  claim: Claim;
  onReplace: (claim: Claim) => void;
  onStale: () => void;
}) {
  const [text, setText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<CleaningErrorView | null>(null);
  const [sent, setSent] = useState(false);
  const submission = useRef(idempotentSubmission());

  async function send() {
    const value = text.trim();
    if (!value) {
      setError(t.replyRequired);
      return;
    }
    setError(null);
    setBusy(true);
    setProblem(null);
    setSent(false);
    try {
      const updated = await addClaimMessage(
        claim.id,
        value,
        submission.current.keyFor({ claim: claim.id, value }),
      );
      submission.current.done();
      setText('');
      setSent(true);
      onReplace(updated);
    } catch (caught) {
      const view = describeCleaningError(caught);
      if (view.code === 'CLEANING_IDEMPOTENCY_KEY_REUSED') submission.current.done();
      setProblem(view);
      if (view.code === 'CLEANING_INVALID_TRANSITION') onStale();
    } finally {
      setBusy(false);
    }
  }

  return (
    <form
      noValidate
      className="rounded-panel border-line bg-surface grid gap-4 border p-5 shadow-xs sm:p-7"
      onSubmit={(event) => {
        event.preventDefault();
        void send();
      }}
    >
      <TextAreaField
        id="reclamation-reponse"
        label={t.replyLabel}
        value={text}
        rows={3}
        maxLength={MAX_MESSAGE}
        onChange={(event) => setText(event.target.value)}
        counter={t.counter(text.length, MAX_MESSAGE)}
        error={error ?? problem?.fields['text'] ?? null}
      />
      {sent ? <FormMessage tone="success">{t.replyDone}</FormMessage> : null}
      {problem && !problem.fields['text'] ? <FormMessage>{errorWithReference(problem)}</FormMessage> : null}
      <Button type="submit" variant="action" className="justify-self-start" disabled={busy}>
        {busy ? t.replying : t.replySubmit}
      </Button>
    </form>
  );
}
