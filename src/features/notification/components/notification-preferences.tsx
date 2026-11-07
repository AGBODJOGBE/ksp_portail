'use client';

import { type FormEvent, useCallback, useState } from 'react';
import { Button } from '@/components/ui/button';
import { FormMessage } from '@/components/ui/field';
import { Heading } from '@/components/ui/heading';
import { ApiError } from '@/lib/api';
import { frenchSpacing } from '@/lib/typography';
import { useResource } from '@/lib/use-resource';
import { getPreferences, updatePreferences } from '@/features/notification/api';
import type { NotificationPreferences as Preferences } from '@/features/notification/schemas';
import { notificationTexts } from '@/features/notification/texts';

const t = notificationTexts.preferences;
const describe = (error: unknown) =>
  error instanceof ApiError ? error.message : notificationTexts.genericError;

const CHECK =
  'rounded-control border-line bg-surface hover:border-line-strong has-[:focus-visible]:outline-focus flex min-h-11 cursor-pointer items-start gap-3 border p-4 has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2';

function PreferencesForm({ initial }: { initial: Preferences }) {
  const [whatsapp, setWhatsapp] = useState(initial.whatsapp);
  const [email, setEmail] = useState(initial.email);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<{ tone: 'error' | 'success'; text: string } | null>(null);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setPending(true);
    setMessage(null);
    try {
      const saved = await updatePreferences({ whatsapp, email });
      setWhatsapp(saved.whatsapp);
      setEmail(saved.email);
      setMessage({ tone: 'success', text: t.saved });
    } catch (error) {
      setMessage({ tone: 'error', text: describe(error) });
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={submit} className="grid gap-4">
      <fieldset className="grid gap-3">
        <legend className="sr-only">{t.title}</legend>
        <label className={CHECK}>
          <input
            type="checkbox"
            name="whatsapp"
            checked={whatsapp}
            onChange={(event) => setWhatsapp(event.target.checked)}
            className="accent-action mt-0.5 size-5 shrink-0"
          />
          <span className="text-ink font-medium">{t.whatsapp}</span>
        </label>
        <label className={CHECK}>
          <input
            type="checkbox"
            name="email"
            checked={email}
            onChange={(event) => setEmail(event.target.checked)}
            className="accent-action mt-0.5 size-5 shrink-0"
            aria-describedby="preference-email-aide"
          />
          <span className="grid gap-0.5">
            <span className="text-ink font-medium">{t.email}</span>
            <span id="preference-email-aide" className="text-small text-ink-muted">
              {t.emailHint}
            </span>
          </span>
        </label>
      </fieldset>
      {!whatsapp && !email ? <FormMessage tone="info">{t.noneWarning}</FormMessage> : null}
      <p className="text-small text-ink-muted">{frenchSpacing(t.always)}</p>
      <div className="grid justify-items-start gap-3">
        <Button type="submit" aria-busy={pending || undefined} disabled={pending}>
          {pending ? t.saving : t.save}
        </Button>
        <FormMessage tone={message?.tone ?? 'error'}>{message?.text}</FormMessage>
      </div>
    </form>
  );
}

/** Canaux souhaités pour les messages facultatifs (ADR-038). */
export function NotificationPreferences() {
  const preferences = useResource(useCallback(() => getPreferences(), []));
  const { state } = preferences;
  return (
    <section
      aria-labelledby="preferences-titre"
      className="rounded-card border-line bg-surface border p-5 shadow-xs sm:p-6"
    >
      <Heading as="h2" size="h3" id="preferences-titre">
        {t.title}
      </Heading>
      <p className="text-ink-muted mt-2">{t.lead}</p>
      <div className="mt-5">
        {state.status === 'loading' ? (
          <p role="status" className="text-ink-muted">
            {notificationTexts.loading}
          </p>
        ) : state.status === 'error' ? (
          <div className="grid justify-items-start gap-3">
            <FormMessage>{describe(state.error)}</FormMessage>
            <Button variant="secondary" onClick={preferences.reload}>
              {notificationTexts.retry}
            </Button>
          </div>
        ) : (
          <PreferencesForm initial={state.data} />
        )}
      </div>
    </section>
  );
}
