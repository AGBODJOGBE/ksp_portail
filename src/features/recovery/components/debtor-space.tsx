'use client';

import { useCallback, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { FormMessage } from '@/components/ui/field';
import { IconShield } from '@/components/ui/icons';
import {
  LinkSheet,
  LinkSheetEyebrow,
  LinkSheetOutcome,
  LinkSheetSection,
  LinkSheetSkeleton,
} from '@/components/ui/link-sheet';
import { type DebtorErrorView, describeDebtorError, isDebtorLinkToken } from '@/features/recovery/debtor';
import { endDebtorSession, openDebtorAccess } from '@/features/recovery/debtor-api';
import type { DebtorAccess, DebtorSession } from '@/features/recovery/debtor-schemas';
import { debtorTexts as t } from '@/features/recovery/debtor-texts';
import { DebtorCaseScreen } from './debtor-case';
import { DebtorGate } from './debtor-gate';
import { DebtorHelp, type Fail, useFocusOnMount } from './debtor-parts';

type Stage =
  | { name: 'loading' }
  | { name: 'invalid' }
  | { name: 'error'; error: DebtorErrorView }
  /** D1 et D2 : accueil, code ; `notice` quand la session vient de se terminer. */
  | { name: 'gate'; access: DebtorAccess; notice: string | null }
  /** D3 à D8 : session ouverte, gardée **en mémoire seulement** (jamais dans le navigateur). */
  | { name: 'space'; access: DebtorAccess; session: DebtorSession }
  /** D9 : session fermée. */
  | { name: 'ended' };

function Heading({ title, focus = false }: { title: string; focus?: boolean }) {
  const ref = useFocusOnMount<HTMLHeadingElement>(focus);
  return (
    <div className="grid gap-4">
      <LinkSheetEyebrow>{t.eyebrow}</LinkSheetEyebrow>
      <h1
        id="debiteur-titre"
        ref={ref}
        tabIndex={-1}
        className="font-display text-h2 text-ink font-bold focus:outline-none"
      >
        {title}
      </h1>
    </div>
  );
}

/**
 * Page du lien personnel d'un débiteur sans compte (`/recouvrement/<jeton>`, ADR-061) : aucun compte,
 * jamais de redirection vers la connexion, aucun jeton de compte KSP envoyé. Le jeton du lien n'est lu que
 * dans l'adresse ; la session (30 minutes) ne vit que dans cet écran : un rechargement de la page
 * redemande un code. Ni l'un ni l'autre n'est journalisé ni écrit dans le navigateur.
 */
export function DebtorSpace({ token }: { token: string }) {
  const valid = isDebtorLinkToken(token);
  const [stage, setStage] = useState<Stage>(valid ? { name: 'loading' } : { name: 'invalid' });
  const [round, setRound] = useState(0);
  const [ending, setEnding] = useState(false);

  useEffect(() => {
    if (!valid) return;
    let active = true;
    openDebtorAccess(token).then(
      (access) => {
        if (active) setStage({ name: 'gate', access, notice: null });
      },
      (caught: unknown) => {
        if (!active) return;
        const error = describeDebtorError(caught);
        setStage(error.kind === 'linkInvalid' ? { name: 'invalid' } : { name: 'error', error });
      },
    );
    return () => {
      active = false;
    };
  }, [token, valid, round]);

  const reopen = () => {
    setStage({ name: 'loading' });
    setRound((value) => value + 1);
  };

  /** Session refusée (401) : elle est oubliée, l'écran revient au code avec un message. */
  const lose = useCallback(() => {
    setStage((current) =>
      current.name === 'space' ? { name: 'gate', access: current.access, notice: t.sessionExpired } : current,
    );
  }, []);

  const fail: Fail = useCallback(
    (caught: unknown) => {
      const view = describeDebtorError(caught);
      if (view.kind !== 'session') return view;
      lose();
      return null;
    },
    [lose],
  );

  async function end() {
    if (stage.name !== 'space' || ending) return;
    setEnding(true);
    try {
      await endDebtorSession(stage.session.sessionToken);
    } catch {
      // Session déjà fermée, expirée, ou service injoignable : elle est oubliée ici de toute façon.
    } finally {
      setEnding(false);
      setStage({ name: 'ended' });
    }
  }

  let sheet;
  switch (stage.name) {
    case 'loading':
      sheet = <LinkSheetSkeleton label={t.loading} />;
      break;
    case 'invalid':
      sheet = (
        <LinkSheet labelledBy="debiteur-titre" head={<Heading title={t.invalidTitle} />}>
          <LinkSheetSection className="pb-8">
            <p className="text-ink-muted">{t.invalidText}</p>
          </LinkSheetSection>
        </LinkSheet>
      );
      break;
    case 'error':
      sheet = (
        <LinkSheet labelledBy="debiteur-titre" head={<Heading title={t.title} />}>
          <LinkSheetSection className="pb-8">
            <div className="grid justify-items-start gap-4">
              <FormMessage>{stage.error.message}</FormMessage>
              <Button variant="secondary" onClick={reopen}>
                {t.retry}
              </Button>
            </div>
          </LinkSheetSection>
        </LinkSheet>
      );
      break;
    case 'gate':
      sheet = (
        <DebtorGate
          token={token}
          access={stage.access}
          notice={stage.notice}
          onOpened={(session) => setStage({ name: 'space', access: stage.access, session })}
          onInvalid={() => setStage({ name: 'invalid' })}
        />
      );
      break;
    case 'space':
      sheet = <DebtorCaseScreen session={stage.session} fail={fail} onEnd={end} ending={ending} />;
      break;
    case 'ended':
      sheet = (
        <LinkSheet labelledBy="debiteur-titre" head={<Heading title={t.title} focus />}>
          <LinkSheetSection className="pb-8">
            <LinkSheetOutcome tone="neutral" icon={<IconShield className="size-6" />} title={t.endedTitle}>
              <p>{t.endedText}</p>
            </LinkSheetOutcome>
            <Button variant="secondary" size="lg" className="w-full" onClick={reopen}>
              {t.reopen}
            </Button>
          </LinkSheetSection>
        </LinkSheet>
      );
      break;
  }

  return (
    <>
      {sheet}
      <DebtorHelp />
    </>
  );
}
