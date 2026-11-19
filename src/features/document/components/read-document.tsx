'use client';

import { useState } from 'react';
import { Button, type ButtonVariant } from '@/components/ui/button';
import { FormMessage } from '@/components/ui/field';
import { IconArrowUpRight } from '@/components/ui/icons';
import { describeDocumentError, safeDocumentUrl } from '@/features/document/logic';
import { documentTexts as t } from '@/features/document/texts';

/** Ouverture d'un onglet. Remplaçable dans les tests. */
export const documentWindow = { open: () => window.open('', '_blank') };

/**
 * « Lire le document » : le PDF s'ouvre dans un nouvel onglet, à une adresse de courte durée **redemandée à
 * chaque clic** (`getUrl`) et jamais gardée. L'onglet est ouvert dans le geste du clic, puis dirigé vers
 * l'adresse reçue : sinon le navigateur bloquerait une fenêtre ouverte après l'attente. Onglet bloqué
 * malgré tout : un lien à toucher, oublié dès qu'il a servi. Pas d'aperçu intégré (la CSP refuse les
 * cadres et objets venus d'un autre site).
 */
export function ReadDocument({
  getUrl,
  label,
  variant = 'secondary',
}: {
  /** Adresse fraîche du PDF, ou null s'il n'est plus lisible. */
  getUrl: () => Promise<string | null>;
  label: string;
  variant?: ButtonVariant;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fallback, setFallback] = useState<string | null>(null);

  async function open() {
    if (busy) return;
    setBusy(true);
    setError(null);
    setFallback(null);
    const tab = documentWindow.open();
    try {
      const fresh = await getUrl();
      const url = fresh ? safeDocumentUrl(fresh) : null;
      if (!url) {
        tab?.close();
        setError(t.noDownload);
      } else if (tab) {
        tab.opener = null;
        tab.location.href = url;
      } else {
        setFallback(url);
      }
    } catch (caught) {
      tab?.close();
      setError(describeDocumentError(caught).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid gap-3">
      <Button
        variant={variant}
        size="lg"
        className="w-full sm:w-auto sm:justify-self-start"
        onClick={open}
        aria-busy={busy || undefined}
      >
        {busy ? t.opening : label}
        <IconArrowUpRight className="size-5" />
      </Button>
      {fallback ? (
        <p className="text-small text-ink-muted">
          {t.popupBlocked}{' '}
          <a
            href={fallback}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => setFallback(null)}
            className="text-action-ink font-semibold underline underline-offset-4"
          >
            {t.openHere}
          </a>
        </p>
      ) : null}
      <FormMessage>{error}</FormMessage>
    </div>
  );
}
