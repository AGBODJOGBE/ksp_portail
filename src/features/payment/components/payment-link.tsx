'use client';

import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button, ButtonLink, buttonClasses } from '@/components/ui/button';
import { FormMessage } from '@/components/ui/field';
import { IconAlert, IconCheck, IconClock, IconHeadset } from '@/components/ui/icons';
import {
  LinkSheet,
  LinkSheetEyebrow,
  LinkSheetFacts,
  LinkSheetOutcome,
  LinkSheetSection,
  LinkSheetSkeleton,
  LinkSheetTrust,
} from '@/components/ui/link-sheet';
import { contactHref } from '@/config/navigation';
import { formatDateTime, formatShortDate, formatXof } from '@/lib/format';
import { getPaymentLink, payPaymentLink } from '@/features/payment/api';
import {
  LINK_POLL_DELAYS_MS,
  type LinkErrorView,
  describeLinkError,
  isPaymentLinkToken,
  isPortalSimulation,
} from '@/features/payment/link';
import { paymentLinkTexts as t, paymentLinkStatus } from '@/features/payment/link-texts';
import { nextPollDelay, safeCheckoutUrl } from '@/features/payment/polling';
import type { PublicPaymentLink } from '@/features/payment/schemas';
import { UNSUCCESSFUL, paymentStatus } from '@/features/payment/texts';

/** Mode test (prestataire simulé) : jamais dans un build de production, ni son code. */
const TEST_MODE = process.env.NODE_ENV !== 'production';
const PaymentLinkTest = TEST_MODE
  ? dynamic(() => import('./payment-link-test').then((module_) => module_.PaymentLinkTest))
  : null;

/** Redirection vers la page du prestataire (hors du portail). Remplaçable dans les tests. */
export const linkRedirect = { to: (url: string) => window.location.assign(url) };

type View =
  | { status: 'loading' }
  | { status: 'error'; error: LinkErrorView }
  | { status: 'ready'; link: PublicPaymentLink; polling: boolean };

const NOT_FOUND_ERROR: LinkErrorView = { message: t.notFoundText, kind: 'notFound' };

/**
 * Lit le lien, puis le relit toutes les 3 secondes (une minute au plus) tant qu'une tentative attend la
 * confirmation du prestataire : au retour de sa page, le payeur voit l'issue sans recharger. La gateway
 * relit le prestataire au passage ; le retour du navigateur ne confirme jamais rien (ADR-040).
 */
function usePaymentLink(token: string) {
  const valid = isPaymentLinkToken(token);
  const [view, setView] = useState<View>(
    valid ? { status: 'loading' } : { status: 'error', error: NOT_FOUND_ERROR },
  );
  const [round, setRound] = useState(0);

  useEffect(() => {
    // Jeton mal formé : introuvable, sans appel (la gateway répondrait 404 de même).
    if (!valid) return;
    let active = true;
    let timer: ReturnType<typeof setTimeout> | undefined;

    function read(attempt: number) {
      getPaymentLink(token).then(
        (link) => {
          if (!active) return;
          const waiting = link.status === 'active' && link.payment?.status === 'pending';
          const delay = waiting ? nextPollDelay(attempt, LINK_POLL_DELAYS_MS) : null;
          setView({ status: 'ready', link, polling: delay !== null });
          if (delay !== null) timer = setTimeout(() => read(attempt + 1), delay);
        },
        (caught: unknown) => {
          if (!active) return;
          const error = describeLinkError(caught);
          setView((previous) =>
            // Erreur passagère pendant l'attente : on garde le dernier état lu, sans relancer.
            previous.status === 'ready' && error.kind !== 'notFound'
              ? { ...previous, polling: false }
              : { status: 'error', error },
          );
        },
      );
    }
    read(0);
    return () => {
      active = false;
      if (timer) clearTimeout(timer);
    };
  }, [token, valid, round]);

  return {
    view,
    /** Relit en gardant l'affichage (après un paiement lancé ou refusé, « Vérifier à nouveau »). */
    refresh: () => {
      setView((previous) => (previous.status === 'ready' ? { ...previous, polling: true } : previous));
      setRound((value) => value + 1);
    },
    /** Relit en affichant le chargement (« Réessayer »). */
    reload: () => {
      setView({ status: 'loading' });
      setRound((value) => value + 1);
    },
  };
}

/**
 * Paiement : clé d'idempotence tirée au premier clic et gardée pendant les renvois (prestataire
 * injoignable, coupure), en mémoire seulement ; la gateway réutilise d'elle-même une tentative en attente
 * (une seule page payable par lien). Puis redirection vers la page du prestataire.
 */
function usePay(token: string, refresh: () => void, onNotFound: () => void) {
  const key = useRef<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<LinkErrorView | null>(null);
  const [waitUntil, setWaitUntil] = useState(0);

  // Trop d'essais : le bouton revient à la fin du délai annoncé par la gateway.
  useEffect(() => {
    if (!waitUntil) return;
    const timer = setTimeout(() => setWaitUntil(0), Math.max(0, waitUntil - Date.now()));
    return () => clearTimeout(timer);
  }, [waitUntil]);

  async function pay() {
    if (busy || waitUntil) return;
    key.current ??= crypto.randomUUID();
    setBusy(true);
    setError(null);
    try {
      const attempt = await payPaymentLink(token, key.current);
      const checkout = attempt.status === 'pending' ? safeCheckoutUrl(attempt.checkoutUrl) : null;
      if (attempt.status === 'pending' && !checkout) {
        // Page pas encore obtenue : la même clé reprend la même tentative.
        setError({ message: t.noCheckout, kind: 'retry' });
        setBusy(false);
        return;
      }
      key.current = null;
      if (!checkout || (TEST_MODE && isPortalSimulation(checkout))) {
        // Issue déjà connue, ou prestataire simulé : la page relit le lien et montre la suite.
        refresh();
        setBusy(false);
        return;
      }
      linkRedirect.to(checkout);
    } catch (caught) {
      const view = describeLinkError(caught);
      if (view.kind !== 'retry') key.current = null;
      if (view.kind === 'notFound') onNotFound();
      if (view.kind === 'stale') refresh();
      if (view.retryAfterSeconds) setWaitUntil(Date.now() + view.retryAfterSeconds * 1000);
      setError(view);
      setBusy(false);
    }
  }

  return { pay, busy, error, waiting: waitUntil > 0 };
}

function Help({ reference, contact = true }: { reference?: string; contact?: boolean }) {
  return (
    <div className="grid gap-5">
      <LinkSheetTrust title={t.trustTitle} items={t.trust} />
      <p className="text-small text-ink-muted flex flex-wrap items-center gap-x-3 px-1">
        {reference ? t.citeReference(reference) : null}
        {contact ? (
          <Link
            href={contactHref('paiement')}
            className="text-ink inline-flex min-h-11 items-center gap-1.5 font-semibold underline-offset-4 hover:underline"
          >
            <IconHeadset className="size-4" />
            {t.contactSupport}
          </Link>
        ) : null}
      </p>
    </div>
  );
}

/** Lien introuvable, ou lecture impossible (panne, trop d'appels) avec « Réessayer ». */
function LinkError({ error, onRetry }: { error: LinkErrorView; onRetry: () => void }) {
  const notFound = error.kind === 'notFound';
  return (
    <>
      <LinkSheet
        labelledBy="lien-titre"
        head={
          <div className="grid gap-4">
            <LinkSheetEyebrow>{t.eyebrow}</LinkSheetEyebrow>
            <h1 id="lien-titre" className="font-display text-h2 text-ink font-bold">
              {notFound ? t.notFoundTitle : t.metaTitle}
            </h1>
            {notFound ? (
              <p className="text-ink-muted">{t.notFoundText}</p>
            ) : (
              <div className="grid justify-items-start gap-4">
                <FormMessage>{error.message}</FormMessage>
                <Button variant="secondary" onClick={onRetry}>
                  {t.retry}
                </Button>
              </div>
            )}
          </div>
        }
      />
      <Help />
    </>
  );
}

/**
 * Page publique d'un lien de paiement (`/payer/[token]`, ADR-040), pour un payeur **sans compte** :
 * bénéficiaire, libellé, référence, montant, échéance, puis paiement par Mobile Money et suivi de son
 * issue. Aucune session n'est demandée ni ouverte ; rien n'est gardé dans le navigateur.
 */
export function PaymentLink({ token }: { token: string }) {
  const { view, refresh, reload } = usePaymentLink(token);
  const [lost, setLost] = useState(false);
  const { pay, busy, error, waiting } = usePay(token, refresh, () => setLost(true));

  if (lost) return <LinkError error={NOT_FOUND_ERROR} onRetry={reload} />;
  if (view.status === 'loading') return <LinkSheetSkeleton label={t.loading} />;
  if (view.status === 'error') return <LinkError error={view.error} onRetry={reload} />;

  const { link, polling } = view;
  const status = paymentLinkStatus(link.status);
  const attempt = link.payment;
  const active = link.status === 'active';
  const pending = active && attempt?.status === 'pending';
  const checkout = pending ? safeCheckoutUrl(attempt.checkoutUrl) : null;
  const simulated = TEST_MODE && checkout !== null && isPortalSimulation(checkout);
  const lastFailed = active && attempt && UNSUCCESSFUL.has(attempt.status) ? attempt.status : null;
  const amount = formatXof(link.amount);

  return (
    <>
      <LinkSheet
        labelledBy="lien-titre"
        head={
          <div className="grid gap-5">
            <LinkSheetEyebrow>{t.eyebrow}</LinkSheetEyebrow>
            <div className="grid gap-1">
              <p className="text-small text-ink-muted">{t.payTo}</p>
              <h1 id="lien-titre" className="font-display text-h2 text-ink font-bold">
                {link.beneficiaryName}
              </h1>
              <p className="text-ink-muted">{link.description}</p>
            </div>
            <div className="flex flex-wrap items-end justify-between gap-3">
              <p className="grid">
                <span className="text-small text-ink-muted">{active ? t.amount : t.amountLabel}</span>
                <span className="font-display text-ink text-4xl font-semibold tabular-nums">{amount}</span>
              </p>
              <Badge tone={pending ? 'warning' : status.tone} dot>
                {pending ? t.pendingBadge : status.label}
              </Badge>
            </div>
          </div>
        }
      >
        <LinkSheetSection>
          <LinkSheetFacts
            rows={[
              [t.reference, link.reference],
              [t.dueDate, link.dueDate ? formatShortDate(link.dueDate) : null],
              [t.paidAt, link.paidAt ? formatDateTime(link.paidAt) : null],
              [t.expiresAt, active ? formatDateTime(link.expiresAt) : null],
            ]}
          />
        </LinkSheetSection>

        <LinkSheetSection className="pb-8">
          {!active ? (
            <>
              <LinkSheetOutcome
                tone={
                  link.status === 'paid' ? 'success' : link.status === 'under_review' ? 'warning' : 'neutral'
                }
                icon={
                  link.status === 'paid' ? <IconCheck className="size-6" /> : <IconAlert className="size-6" />
                }
                title={status.title ?? status.label}
              >
                <p>{status.text}</p>
              </LinkSheetOutcome>
              {link.status === 'under_review' ? (
                <ButtonLink href={contactHref('paiement')} variant="primary" size="lg" className="w-full">
                  {t.contactSupport}
                </ButtonLink>
              ) : null}
            </>
          ) : pending ? (
            <>
              <LinkSheetOutcome tone="warning" icon={<IconClock className="size-6" />} title={t.pendingTitle}>
                <p>{polling ? t.pendingText : t.stillPending}</p>
                {polling ? <p className="text-small">{t.checking}</p> : null}
              </LinkSheetOutcome>
              {simulated && PaymentLinkTest ? (
                <PaymentLinkTest token={token} onDone={refresh} />
              ) : checkout ? (
                <a
                  href={checkout}
                  className={buttonClasses({ variant: 'action', size: 'lg', className: 'w-full' })}
                >
                  {t.resume}
                </a>
              ) : null}
              {polling ? null : (
                <Button variant="secondary" size="lg" className="w-full" onClick={refresh}>
                  {t.checkAgain}
                </Button>
              )}
            </>
          ) : (
            <>
              {lastFailed ? (
                <FormMessage tone="info">
                  {`${t.lastAttempt(paymentStatus(lastFailed).label)} ${t.lateSuccess}`}
                </FormMessage>
              ) : null}
              <Button
                variant="action"
                size="lg"
                className="w-full"
                onClick={pay}
                disabled={busy || waiting}
                aria-busy={busy || undefined}
                aria-describedby="lien-aide"
              >
                {busy ? t.opening : lastFailed ? t.payAgain : t.pay(amount)}
              </Button>
              <p id="lien-aide" className="text-small text-ink-muted">
                {t.payHint}
              </p>
            </>
          )}
          <FormMessage>{error && error.kind !== 'stale' ? error.message : null}</FormMessage>
          <FormMessage tone="info">{error?.kind === 'stale' ? error.message : null}</FormMessage>
        </LinkSheetSection>
      </LinkSheet>
      <Help reference={link.reference} contact={link.status !== 'under_review'} />
    </>
  );
}
