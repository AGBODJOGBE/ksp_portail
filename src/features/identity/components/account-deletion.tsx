'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { FormMessage } from '@/components/ui/field';
import { IconArrowRight } from '@/components/ui/icons';
import { session } from '@/lib/api';
import { frenchSpacing } from '@/lib/typography';
import { requestAccountDeletion } from '@/features/identity/api';
import { type DeletionErrorView, deletionNotice, describeDeletionError } from '@/features/identity/deletion';
import type { DeletionObstacle } from '@/features/identity/schemas';
import { accountTexts, deletionObstacle } from '@/features/identity/texts';
import { Section } from './space-parts';

const t = accountTexts.deletion;
const SUBTITLE = 'font-display text-ink text-lg font-semibold';

/** Obligations en cours, avec ce qu'il faut faire et l'écran où le faire. */
export function ObstacleList({ obstacles }: { obstacles: ReadonlyArray<DeletionObstacle> }) {
  return (
    <ul className="divide-line border-line grid divide-y border-y">
      {obstacles.map((obstacle, index) => {
        const { label, href } = deletionObstacle(obstacle);
        return (
          <li key={`${index}-${obstacle.kind}-${obstacle.reference}`} className="grid gap-1 py-3">
            <p className="text-ink font-semibold">{label}</p>
            <p className="text-small text-ink-muted">{frenchSpacing(obstacle.description)}</p>
            {href ? (
              <Link
                href={href}
                className="text-action-ink inline-flex min-h-11 items-center gap-1 text-sm font-semibold underline-offset-4 hover:underline"
              >
                {`${t.obstacleLink} : ${label.toLowerCase()}`}
                <IconArrowRight className="size-4" />
              </Link>
            ) : null}
          </li>
        );
      })}
    </ul>
  );
}

/**
 * « Supprimer mon compte » (ADR-036) : ce qui se passe, puis confirmation avant la demande (action
 * lourde). Refus : obligations en cours listées, ou « réessayez plus tard » si un service n'a pas pu
 * répondre. Acceptée : la gateway ferme toutes les sessions ; la session de l'onglet est vidée et la garde
 * de l'espace affiche la date prévue.
 */
export function AccountDeletion() {
  const [confirming, setConfirming] = useState(false);
  const [pending, setPending] = useState(false);
  const [refusal, setRefusal] = useState<DeletionErrorView | null>(null);
  const confirmRef = useRef<HTMLHeadingElement>(null);
  const startRef = useRef<HTMLButtonElement>(null);
  const opened = useRef(false);

  // Le focus suit le panneau : son titre à l'ouverture, le bouton de départ à la fermeture.
  useEffect(() => {
    if (confirming) confirmRef.current?.focus();
    else if (opened.current) startRef.current?.focus();
    opened.current = confirming;
  }, [confirming]);

  async function confirm() {
    if (pending) return;
    setPending(true);
    setRefusal(null);
    try {
      const deletion = await requestAccountDeletion();
      deletionNotice.set(deletion.scheduledFor);
      session.clear();
    } catch (caught) {
      setRefusal(describeDeletionError(caught));
      setConfirming(false);
      setPending(false);
    }
  }

  return (
    <Section id="suppression-titre" title={t.title} lead={t.lead}>
      <div className="grid gap-2">
        <h3 className={SUBTITLE}>{t.stepsTitle}</h3>
        <ul className="text-ink grid list-disc gap-1.5 pl-5">
          {t.steps.map((step) => (
            <li key={step}>{frenchSpacing(step)}</li>
          ))}
        </ul>
      </div>
      <p className="text-small text-ink-muted">{frenchSpacing(t.conditions)}</p>

      <FormMessage>{refusal?.message}</FormMessage>
      {refusal?.obstacles.length ? (
        <div className="grid gap-2">
          <h3 className={SUBTITLE}>{t.blockedTitle}</h3>
          <ObstacleList obstacles={refusal.obstacles} />
        </div>
      ) : null}

      {confirming ? (
        <div
          role="group"
          aria-labelledby="suppression-confirmation"
          className="rounded-card border-danger/40 bg-danger-soft grid gap-4 border p-5"
        >
          <h3
            id="suppression-confirmation"
            ref={confirmRef}
            tabIndex={-1}
            className={`${SUBTITLE} focus:outline-none`}
          >
            {t.confirmTitle}
          </h3>
          <p className="text-ink">{frenchSpacing(t.confirmText)}</p>
          <div className="flex flex-wrap gap-3">
            <Button variant="primary" onClick={confirm} disabled={pending} aria-busy={pending || undefined}>
              {pending ? t.confirming : t.confirm}
            </Button>
            <Button variant="ghost" onClick={() => setConfirming(false)} disabled={pending}>
              {t.keep}
            </Button>
          </div>
        </div>
      ) : (
        <Button
          ref={startRef}
          variant="danger"
          className="-ml-3 justify-self-start"
          onClick={() => setConfirming(true)}
        >
          {t.start}
        </Button>
      )}
    </Section>
  );
}
