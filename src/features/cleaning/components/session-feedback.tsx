'use client';

import Link from 'next/link';
import { useRef, useState } from 'react';
import { Button, ButtonLink } from '@/components/ui/button';
import { FormMessage } from '@/components/ui/field';
import { IconStar } from '@/components/ui/icons';
import { cn } from '@/lib/cn';
import { formatShortDate } from '@/lib/format';
import { type ClaimCategory, openClaim, rateSession } from '@/features/cleaning/api';
import {
  type CleaningErrorView,
  describeCleaningError,
  errorWithReference,
} from '@/features/cleaning/errors';
import { idempotentSubmission } from '@/features/cleaning/idempotency';
import { cleaningPaths } from '@/features/cleaning/paths';
import { sessionTexts as t } from '@/features/cleaning/program-texts';
import type { Claim, Session } from '@/features/cleaning/schemas';
import { CLAIM_CATEGORIES } from '@/features/cleaning/status-texts';
import { ChoicePill, Fieldset, Panel, TextAreaField } from './fields';
import { type PickedPhoto, PhotoPicker } from './photo-picker';

/** Bornes du contrat (`CleaningRateSessionBody`, `CleaningOpenClaimBody`). */
const MAX_RATING_COMMENT = 1000;
const MAX_CLAIM_TEXT = 2000;
const MAX_CLAIM_PHOTOS = 10;
const STARS = [1, 2, 3, 4, 5] as const;
/**
 * Fenêtre de réclamation après la fin réelle de la séance (R-RC-01, 48 h par défaut, réglable par KSP).
 * Sert seulement à proposer le formulaire ; la gateway reste juge (`CLEANING_CLAIM_WINDOW_CLOSED`).
 */
export const CLAIM_WINDOW_MS = 48 * 3_600_000;

/** Étoiles affichées (lecture seule) : le nombre est écrit pour les lecteurs d'écran. */
export function Stars({ value, className }: { value: number; className?: string }) {
  return (
    <span role="img" aria-label={t.yourRating(value)} className={cn('inline-flex gap-0.5', className)}>
      {STARS.map((star) => (
        <IconStar
          key={star}
          className={cn('size-5', star <= value ? 'text-accent-strong' : 'text-line-strong')}
          fill={star <= value ? 'currentColor' : 'none'}
        />
      ))}
    </span>
  );
}

/**
 * Note d'une séance réalisée (une seule fois) : 1 à 5 étoiles (boutons radio), commentaire facultatif.
 * Déjà notée : la note est affichée.
 */
export function SessionRating({
  session,
  canAct,
  onReplace,
}: {
  session: Session;
  canAct: boolean;
  onReplace: (session: Session) => void;
}) {
  const [stars, setStars] = useState(0);
  const [comment, setComment] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<CleaningErrorView | null>(null);
  const [thanks, setThanks] = useState(false);
  const submission = useRef(idempotentSubmission());

  if (session.rating) {
    return (
      <Panel id="avis-titre" title={t.ratingTitle}>
        <div className="grid gap-2">
          {thanks ? <FormMessage tone="success">{t.ratingDone}</FormMessage> : null}
          <Stars value={session.rating.stars} />
          {session.rating.comment ? (
            <p className="text-ink whitespace-pre-line">{session.rating.comment}</p>
          ) : null}
          <p className="text-small text-ink-muted">{t.ratedOn(formatShortDate(session.rating.ratedAt))}</p>
        </div>
      </Panel>
    );
  }
  if (!canAct) return null;

  async function send() {
    if (!stars) {
      setError(t.ratingRequired);
      return;
    }
    setError(null);
    setBusy(true);
    setProblem(null);
    const body = { stars, ...(comment.trim() ? { comment: comment.trim() } : {}) };
    try {
      const updated = await rateSession(session.id, body, submission.current.keyFor(body));
      submission.current.done();
      setThanks(true);
      onReplace(updated);
    } catch (caught) {
      const view = describeCleaningError(caught);
      if (view.code === 'CLEANING_IDEMPOTENCY_KEY_REUSED') submission.current.done();
      setProblem(view);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Panel id="avis-titre" title={t.ratingTitle}>
      <form
        noValidate
        className="grid gap-5"
        onSubmit={(event) => {
          event.preventDefault();
          void send();
        }}
      >
        <p className="text-ink">{t.ratingLead}</p>
        <Fieldset id="avis-etoiles" legend={t.stars} error={error}>
          <div className="flex flex-wrap gap-1">
            {STARS.map((star) => (
              <label
                key={star}
                className="has-[:focus-visible]:outline-focus grid size-11 cursor-pointer place-items-center rounded-full has-[:focus-visible]:outline-2"
              >
                <input
                  type="radio"
                  name="avis-etoiles"
                  value={star}
                  checked={stars === star}
                  onChange={() => setStars(star)}
                  className="sr-only"
                  aria-label={t.starLabel(star)}
                />
                <IconStar
                  className={cn('size-8', star <= stars ? 'text-accent-strong' : 'text-line-strong')}
                  fill={star <= stars ? 'currentColor' : 'none'}
                />
              </label>
            ))}
          </div>
        </Fieldset>
        <TextAreaField
          id="avis-commentaire"
          label={t.ratingComment}
          value={comment}
          rows={3}
          maxLength={MAX_RATING_COMMENT}
          onChange={(event) => setComment(event.target.value)}
          counter={t.counter(comment.length, MAX_RATING_COMMENT)}
          error={problem?.fields['comment'] ?? null}
        />
        {problem && !problem.fields['comment'] ? (
          <FormMessage>{errorWithReference(problem)}</FormMessage>
        ) : null}
        <Button type="submit" variant="action" className="justify-self-start" disabled={busy}>
          {busy ? t.ratingSending : t.ratingSubmit}
        </Button>
      </form>
    </Panel>
  );
}

/**
 * « Signaler un problème » sur une séance réalisée : nature, description, photos (service file). La
 * fenêtre de réclamation est jugée par la gateway (`CLEANING_CLAIM_WINDOW_CLOSED`) ; les réclamations
 * déjà ouvertes sur la séance sont listées.
 */
export function SessionClaim({
  session,
  canAct,
  now = new Date(),
}: {
  session: Session;
  canAct: boolean;
  now?: Date;
}) {
  const [open, setOpen] = useState(false);
  const [created, setCreated] = useState<Claim | null>(null);
  const [refused, setRefused] = useState(false);
  const closed =
    refused ||
    (!!session.completedAt && now.getTime() - new Date(session.completedAt).getTime() > CLAIM_WINDOW_MS);
  if (closed && !session.claimIds.length && !canAct) return null;

  return (
    <Panel id="probleme-titre" title={t.claimTitle}>
      <div className="grid gap-4">
        {session.claimIds.length ? (
          <div className="grid gap-1">
            <p className="text-small text-ink-muted font-semibold">{t.claimsTitle}</p>
            <ul className="flex flex-wrap gap-x-4">
              {session.claimIds.map((claimId, index) => (
                <li key={claimId}>
                  <Link
                    href={cleaningPaths.claim(claimId)}
                    className="text-brand-ink inline-flex min-h-11 items-center font-semibold underline underline-offset-4"
                  >
                    {t.claimLink(index + 1)}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
        {created ? (
          <div className="grid justify-items-start gap-3">
            <FormMessage tone="success">{t.claimSent}</FormMessage>
            <ButtonLink href={cleaningPaths.claim(created.id)} variant="action">
              {t.claimSeeIt}
            </ButtonLink>
          </div>
        ) : closed ? (
          <FormMessage tone="info">{t.claimClosed}</FormMessage>
        ) : !canAct ? null : open ? (
          <ClaimForm
            session={session}
            onClose={() => setOpen(false)}
            onCreated={setCreated}
            onWindowClosed={() => setRefused(true)}
          />
        ) : (
          <>
            <p className="text-ink">{t.claimLead}</p>
            <Button variant="secondary" className="justify-self-start" onClick={() => setOpen(true)}>
              {t.claimOpen}
            </Button>
          </>
        )}
      </div>
    </Panel>
  );
}

function ClaimForm({
  session,
  onClose,
  onCreated,
  onWindowClosed,
}: {
  session: Session;
  onClose: () => void;
  onCreated: (claim: Claim) => void;
  onWindowClosed: () => void;
}) {
  const [category, setCategory] = useState<ClaimCategory | ''>('');
  const [text, setText] = useState('');
  const [photos, setPhotos] = useState<PickedPhoto[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<CleaningErrorView | null>(null);
  const submission = useRef(idempotentSubmission());

  async function send() {
    const found: Record<string, string> = {
      ...(category ? {} : { category: t.claimCategoryRequired }),
      ...(text.trim() ? {} : { text: t.claimTextRequired }),
    };
    setErrors(found);
    if (Object.keys(found).length || !category) return;
    const body = {
      category,
      text: text.trim(),
      ...(photos.length ? { photoFileIds: photos.map((photo) => photo.id) } : {}),
    };
    setBusy(true);
    setProblem(null);
    try {
      const claim = await openClaim(session.id, body, submission.current.keyFor(body));
      submission.current.done();
      onCreated(claim);
    } catch (caught) {
      const view = describeCleaningError(caught);
      if (view.code === 'CLEANING_IDEMPOTENCY_KEY_REUSED') submission.current.done();
      if (view.code === 'CLEANING_CLAIM_WINDOW_CLOSED') {
        onWindowClosed();
        return;
      }
      if (view.kind === 'fields') setErrors(view.fields);
      setProblem(view);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form
      noValidate
      className="swap-in grid gap-6"
      onSubmit={(event) => {
        event.preventDefault();
        void send();
      }}
    >
      <Fieldset id="reclamation-nature" legend={t.claimCategory} error={errors['category']}>
        <div className="grid gap-2 sm:grid-cols-2">
          {(Object.keys(CLAIM_CATEGORIES) as ClaimCategory[]).map((code) => (
            <ChoicePill
              key={code}
              name="reclamation-nature"
              checked={category === code}
              onChange={() => setCategory(code)}
              label={CLAIM_CATEGORIES[code]}
            />
          ))}
        </div>
      </Fieldset>
      <TextAreaField
        id="reclamation-texte"
        label={t.claimText}
        hint={t.claimTextHint}
        value={text}
        maxLength={MAX_CLAIM_TEXT}
        onChange={(event) => setText(event.target.value)}
        counter={t.counter(text.length, MAX_CLAIM_TEXT)}
        error={errors['text']}
      />
      <PhotoPicker
        photos={photos}
        max={MAX_CLAIM_PHOTOS}
        onChange={setPhotos}
        legend={t.claimPhotos}
        hint={t.claimPhotosHint}
        error={errors['photoFileIds']}
        disabled={busy}
      />
      {problem && problem.kind !== 'fields' ? <FormMessage>{errorWithReference(problem)}</FormMessage> : null}
      <div className="flex flex-col gap-3 sm:flex-row">
        <Button type="submit" variant="action" disabled={busy}>
          {busy ? t.claimSending : t.claimSubmit}
        </Button>
        <Button variant="ghost" onClick={onClose} disabled={busy}>
          {t.claimCancel}
        </Button>
      </div>
    </form>
  );
}
