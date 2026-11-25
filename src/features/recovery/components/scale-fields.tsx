'use client';

import { ChoicePill } from '@/components/ui/form-fields';
import { TextField } from '@/components/ui/field';
import type { ScaleDraft } from '@/features/recovery/draft';
import { preferenceTexts as t } from '@/features/recovery/preference-texts';

/**
 * Barème d'échéancier (`RecoveryPlanScale`) : paiement en plusieurs fois accepté ou non, puis ses limites.
 * Commun à l'assistant (barème du dossier) et aux préférences (barèmes par défaut). `prefix` : chemin des
 * erreurs (`planScale`, `b2bScale`).
 */
export function ScaleFields({
  idPrefix,
  value,
  onChange,
  errors,
  prefix,
  disabled,
}: {
  idPrefix: string;
  value: ScaleDraft;
  onChange: (value: ScaleDraft) => void;
  errors: Record<string, string>;
  prefix: string;
  disabled?: boolean;
}) {
  const set = (patch: Partial<ScaleDraft>) => onChange({ ...value, ...patch });
  const field = (
    name: keyof ScaleDraft,
    error: string,
    label: string,
    hint?: string,
    inputMode: 'numeric' | 'decimal' = 'numeric',
  ) => (
    <TextField
      id={`${idPrefix}-${name}`}
      label={label}
      hint={hint}
      inputMode={inputMode}
      value={String(value[name])}
      onChange={(event) => set({ [name]: event.target.value })}
      error={errors[`${prefix}.${error}`]}
      disabled={disabled}
    />
  );
  return (
    <div className="grid gap-5">
      <ChoicePill
        type="checkbox"
        label={t.acceptsPaymentPlan}
        checked={value.acceptsPaymentPlan}
        onChange={(event) => set({ acceptsPaymentPlan: event.target.checked })}
        disabled={disabled}
        className="justify-self-start"
      />
      {value.acceptsPaymentPlan ? (
        <div className="grid gap-5 sm:grid-cols-2">
          {field('maxDurationMonths', 'maxDurationMonths', t.maxDurationMonths)}
          {field('firstPaymentWithinDays', 'firstPaymentWithinDays', t.firstPaymentWithinDays)}
          {field(
            'minFirstPaymentPercent',
            'minFirstPaymentBps',
            t.minFirstPaymentPercent,
            undefined,
            'decimal',
          )}
          {field('minInstallment', 'minInstallment', t.minInstallment)}
        </div>
      ) : null}
      <div className="sm:max-w-[calc(50%-0.625rem)]">
        {field('maxDiscountPercent', 'maxDiscountBps', t.maxDiscountPercent, t.maxDiscountHint, 'decimal')}
      </div>
    </div>
  );
}
