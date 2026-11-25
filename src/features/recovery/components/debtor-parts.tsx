'use client';

import Link from 'next/link';
import { type ReactNode, type RefObject, useEffect, useRef, useState } from 'react';
import { Button, type ButtonVariant, buttonClasses } from '@/components/ui/button';
import { FormMessage } from '@/components/ui/field';
import { IconArrowLeft, IconArrowUpRight, IconHeadset, IconShield } from '@/components/ui/icons';
import { LinkSheetTrust } from '@/components/ui/link-sheet';
import { contactHref } from '@/config/navigation';
import { ApiError } from '@/lib/api';
import { cn } from '@/lib/cn';
import { formatTime } from '@/lib/format';
import { type DebtorErrorView, safeUrl } from '@/features/recovery/debtor';
import { debtorTexts as t } from '@/features/recovery/debtor-texts';

/** Ouverture d'un onglet. Remplaçable dans les tests. */
export const debtorWindow = { open: () => window.open('', '_blank') };

/**
 * Ouvre une page (paiement, document) dans un **nouvel onglet** : l'onglet est ouvert dans le geste du
 * clic, puis dirigé vers l'adresse reçue (sinon le navigateur le bloquerait après l'attente). `opener`
 * coupé ; `no-referrer` sur la page : le jeton du lien ne part pas. Onglet bloqué : l'adresse est rendue
 * pour un lien à toucher, oubliée dès qu'il a servi.
 */
export async function openInNewTab(getUrl: () => Promise<string>): Promise<string | null> {
  const tab = debtorWindow.open();
  try {
    const url = safeUrl(await getUrl());
    if (!url) throw ApiError.invalidResponse();
    if (!tab) return url;
    tab.opener = null;
    tab.location.href = url;
    return null;
  } catch (caught) {
    tab?.close();
    throw caught;
  }
}

/** Refus lu par l'écran : `null` quand la session est perdue (l'écran parent revient au code). */
export type Fail = (caught: unknown) => DebtorErrorView | null;

/** Lien de secours quand le navigateur a bloqué l'onglet. */
export function BlockedTabLink({
  url,
  text,
  label,
  onUsed,
}: {
  url: string | null;
  text: string;
  label: string;
  onUsed: () => void;
}) {
  if (!url) return null;
  return (
    <p className="text-small text-ink-muted">
      {text}{' '}
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        onClick={onUsed}
        className="text-action-ink font-semibold underline underline-offset-4"
      >
        {label}
      </a>
    </p>
  );
}

/**
 * Bouton qui ouvre un document dans un nouvel onglet, à une adresse de courte durée **redemandée à chaque
 * clic** (`getUrl`) et jamais gardée.
 */
export function OpenDocumentButton({
  label,
  accessibleLabel,
  getUrl,
  fail,
  variant = 'secondary',
  className,
}: {
  label: string;
  /** Nom accessible complet (« Ouvrir Reçu du 5 novembre »). */
  accessibleLabel?: string;
  getUrl: () => Promise<string>;
  fail: Fail;
  variant?: ButtonVariant;
  className?: string;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fallback, setFallback] = useState<string | null>(null);

  async function open() {
    if (busy) return;
    setBusy(true);
    setError(null);
    setFallback(null);
    try {
      setFallback(await openInNewTab(getUrl));
    } catch (caught) {
      const view = fail(caught);
      if (view) setError(view.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={cn('grid justify-items-start gap-2', className)}>
      <Button
        variant={variant}
        onClick={open}
        aria-label={accessibleLabel}
        aria-busy={busy || undefined}
        className="shrink-0"
      >
        {busy ? t.opening : label}
        <IconArrowUpRight className="size-4" />
      </Button>
      <BlockedTabLink
        url={fallback}
        text={t.popupBlocked}
        label={t.openHere}
        onUsed={() => setFallback(null)}
      />
      <FormMessage>{error}</FormMessage>
    </div>
  );
}

/** Lien vers une page déjà connue (paiement en cours) : nouvel onglet, sans `opener` ni `referer`. */
export function NewTabLink({
  href,
  children,
  variant = 'secondary',
  className,
}: {
  href: string;
  children: ReactNode;
  variant?: ButtonVariant;
  className?: string;
}) {
  const url = safeUrl(href);
  if (!url) return null;
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className={buttonClasses({ variant, size: 'lg', className: cn('w-full py-2 text-center', className) })}
    >
      {/* Le libellé peut passer à la ligne dans une colonne étroite (le bouton ne coupe pas son texte). */}
      <span className="min-w-0 whitespace-normal">{children}</span>
      <IconArrowUpRight className="size-5" />
    </a>
  );
}

/** Session ouverte : heure de fin et « Terminer ». */
export function SessionBar({
  expiresAt,
  onEnd,
  ending,
}: {
  expiresAt: string;
  onEnd: () => void;
  ending: boolean;
}) {
  return (
    <div className="rounded-control bg-surface-muted text-small flex items-center justify-between gap-2 py-1 pr-1 pl-3">
      <p className="text-ink flex min-w-0 items-center gap-2 font-medium">
        <IconShield className="text-action-ink size-4 shrink-0" />
        <span>{t.sessionUntil(formatTime(expiresAt))}</span>
      </p>
      <Button
        variant="ghost"
        onClick={onEnd}
        aria-busy={ending || undefined}
        disabled={ending}
        className="shrink-0"
      >
        {ending ? t.ending : t.end}
      </Button>
    </div>
  );
}

/** Retour à la situation, en tête d'un écran d'action. */
export function BackToSituation({ onBack }: { onBack: () => void }) {
  return (
    <button
      type="button"
      onClick={onBack}
      className="text-ink hover:bg-surface-sunken focus-visible:outline-focus -ml-3 inline-flex min-h-11 items-center gap-2 justify-self-start rounded-full px-3 font-semibold focus-visible:outline-2"
    >
      <IconArrowLeft className="size-4" />
      {t.backToSituation}
    </button>
  );
}

/** Titre d'un écran atteint par une action : il reçoit le focus (lecteurs d'écran, clavier). */
export function useFocusOnMount<T extends HTMLElement>(enabled = true): RefObject<T | null> {
  const ref = useRef<T>(null);
  useEffect(() => {
    if (enabled) ref.current?.focus();
  }, [enabled]);
  return ref;
}

/** Ce qui rassure, sous la feuille, et le contact du support. */
export function DebtorHelp() {
  return (
    <div className="grid gap-5">
      <LinkSheetTrust title={t.trustTitle} items={t.trust} />
      <p className="text-small px-1">
        <Link
          href={contactHref('recouvrement-dossier')}
          className="text-ink inline-flex min-h-11 items-center gap-1.5 font-semibold underline-offset-4 hover:underline"
        >
          <IconHeadset className="size-4" />
          {t.contactSupport}
        </Link>
      </p>
    </div>
  );
}
