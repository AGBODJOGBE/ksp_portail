'use client';

import { type FormEvent, useState } from 'react';
import { Button } from '@/components/ui/button';
import { FormMessage } from '@/components/ui/field';
import { Panel } from '@/components/ui/form-fields';
import { SkeletonCards } from '@/components/ui/skeleton';
import { contextKey, useSession } from '@/lib/api';
import { useResource } from '@/lib/use-resource';
import { useReadOnly } from '@/features/identity';
import { getPreferences, updatePreferences } from '@/features/recovery/api';
import { type ScaleDraft, scaleFromDraft, scaleToDraft } from '@/features/recovery/draft';
import { describeRecoveryError, errorWithReference } from '@/features/recovery/errors';
import { preferenceTexts as t } from '@/features/recovery/preference-texts';
import type { RecoveryPreferences as Preferences } from '@/features/recovery/schemas';
import { ScaleFields } from './scale-fields';

/**
 * Préférences du créancier (`GET`/`PUT /recovery/preferences`) : barèmes d'échéancier par défaut, pour les
 * débiteurs entreprises et particuliers, recopiés sur chaque nouveau dossier. `notifyUserIds` n'est pas
 * montré (notification ne s'en sert pas) : il est renvoyé tel qu'il a été lu. Membre lecteur : lecture
 * seule. Relu à chaque changement de compte actif.
 */
export function RecoveryPreferences() {
  const key = contextKey(useSession()) ?? 'none';
  return <PreferencesScreen key={key} />;
}

function PreferencesScreen() {
  const { state, reload, set } = useResource(getPreferences);
  if (state.status === 'loading') return <SkeletonCards label={t.loading} rows={2} media={false} />;
  if (state.status === 'error') {
    return (
      <div className="grid justify-items-start gap-3">
        <FormMessage>{errorWithReference(describeRecoveryError(state.error))}</FormMessage>
        <Button variant="secondary" onClick={reload}>
          {t.retry}
        </Button>
      </div>
    );
  }
  return <PreferencesForm preferences={state.data} onSaved={set} />;
}

function PreferencesForm({
  preferences,
  onSaved,
}: {
  preferences: Preferences;
  onSaved: (preferences: Preferences) => void;
}) {
  const readOnly = useReadOnly();
  const [b2b, setB2b] = useState<ScaleDraft>(() => scaleToDraft(preferences.b2bScale));
  const [b2c, setB2c] = useState<ScaleDraft>(() => scaleToDraft(preferences.b2cScale));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [message, setMessage] = useState<{ tone: 'error' | 'success'; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy || readOnly) return;
    const first = scaleFromDraft(b2b, 'b2bScale');
    const second = scaleFromDraft(b2c, 'b2cScale');
    const found = {
      ...('errors' in first ? first.errors : {}),
      ...('errors' in second ? second.errors : {}),
    };
    setErrors(found);
    setMessage(null);
    if (!('scale' in first) || !('scale' in second)) {
      requestAnimationFrame(() => document.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus());
      return;
    }
    setBusy(true);
    try {
      const saved = await updatePreferences({
        b2bScale: first.scale,
        b2cScale: second.scale,
        notifyUserIds: preferences.notifyUserIds,
      });
      onSaved(saved);
      setMessage({ tone: 'success', text: t.saved });
    } catch (caught) {
      const view = describeRecoveryError(caught);
      if (view.kind === 'fields') setErrors(view.fields);
      setMessage({ tone: 'error', text: view.kind === 'forbidden' ? t.readOnly : errorWithReference(view) });
    } finally {
      setBusy(false);
    }
  }

  return (
    <form noValidate onSubmit={submit} className="grid gap-6">
      <FormMessage tone="info">{readOnly ? t.readOnly : t.newCasesOnly}</FormMessage>
      <div className="grid gap-6 lg:grid-cols-2">
        <Panel id="preferences-entreprises" title={t.b2b}>
          <ScaleFields
            idPrefix="preferences-b2b"
            prefix="b2bScale"
            value={b2b}
            onChange={setB2b}
            errors={errors}
            disabled={readOnly}
          />
        </Panel>
        <Panel id="preferences-particuliers" title={t.b2c}>
          <ScaleFields
            idPrefix="preferences-b2c"
            prefix="b2cScale"
            value={b2c}
            onChange={setB2c}
            errors={errors}
            disabled={readOnly}
          />
        </Panel>
      </div>
      <FormMessage tone={message?.tone}>{message?.text}</FormMessage>
      {readOnly ? null : (
        <Button
          type="submit"
          variant="action"
          size="lg"
          className="justify-self-start"
          disabled={busy}
          aria-busy={busy || undefined}
        >
          {busy ? t.saving : t.save}
        </Button>
      )}
    </form>
  );
}
