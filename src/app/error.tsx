'use client';

import { useEffect } from 'react';
import { Button, ButtonLink } from '@/components/ui/button';
import { HeroBand } from '@/components/ui/hero-band';
import { IconAlert } from '@/components/ui/icons';
import { getDictionary } from '@/i18n';

/**
 * Erreur d'affichage (direction « Signature ») : bande bleu nuit, pictogramme d'alerte, message clair,
 * « Réessayer » en action principale et retour à l'accueil.
 */
export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const t = getDictionary();
  useEffect(() => {
    // Remonté vers l'outil de suivi des erreurs (Sentry) quand il sera branché.
    console.error(error);
  }, [error]);
  return (
    <HeroBand containerClassName="pt-12 pb-20 sm:pt-20 sm:pb-28">
      <span
        aria-hidden="true"
        className="rounded-icon bg-accent text-on-accent pop grid size-16 place-items-center"
      >
        <IconAlert className="size-8" />
      </span>
      <h1 className="font-display text-h1 text-ink mt-8 font-semibold">{t.errors.genericTitle}</h1>
      <p className="text-lead text-ink-muted mt-4 max-w-xl">{t.errors.genericText}</p>
      <div className="mt-10 flex flex-col gap-3 sm:flex-row">
        <Button onClick={reset} variant="action" size="lg">
          {t.common.retry}
        </Button>
        <ButtonLink href="/" variant="secondary" size="lg">
          {t.common.backHome}
        </ButtonLink>
      </div>
    </HeroBand>
  );
}
