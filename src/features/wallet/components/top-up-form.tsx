'use client';

import { type FormEvent, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { FormMessage, TextField } from '@/components/ui/field';
import { cn } from '@/lib/cn';
import { formatXof } from '@/lib/format';
import { walletTexts as t } from '@/features/wallet/texts';
import { type TopUpLimits, checkTopUpAmount, topUpPresets } from '@/features/wallet/top-up';
import { useTopUp } from './use-top-up';

const AMOUNT_ID = 'recharge-montant';

/**
 * Recharge du portefeuille : raccourcis compris dans les limites de la gateway, ou montant libre ; puis
 * page de paiement Mobile Money du prestataire. Le solde est crédité à la confirmation du prestataire.
 */
export function TopUpForm({ limits }: { limits: TopUpLimits }) {
  const presets = topUpPresets(limits);
  const [value, setValue] = useState(String(presets[Math.min(1, presets.length - 1)]));
  const [fieldError, setFieldError] = useState<string | null>(null);
  const input = useRef<HTMLInputElement>(null);
  const topUp = useTopUp();
  const min = formatXof(limits.min);
  const max = formatXof(limits.max);
  const check = checkTopUpAmount(value, limits);

  function submit(event: FormEvent) {
    event.preventDefault();
    if ('error' in check) {
      const errors = t.amountErrors;
      setFieldError(
        check.error === 'tooLow'
          ? errors.tooLow(min)
          : check.error === 'tooHigh'
            ? errors.tooHigh(max)
            : errors[check.error],
      );
      input.current?.focus();
      return;
    }
    setFieldError(null);
    void topUp.start(check.amount, null);
  }

  return (
    <form onSubmit={submit} noValidate className="grid gap-5">
      <fieldset className="grid gap-3">
        <legend className="text-ink font-semibold">{t.presetsLabel}</legend>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {presets.map((amount) => {
            const selected = 'amount' in check && check.amount === amount;
            return (
              <button
                key={amount}
                type="button"
                aria-pressed={selected}
                onClick={() => {
                  setValue(String(amount));
                  setFieldError(null);
                }}
                className={cn(
                  'rounded-control min-h-12 border px-3 font-semibold tabular-nums transition-colors',
                  'focus-visible:outline-focus focus-visible:outline-2 focus-visible:outline-offset-2',
                  selected
                    ? 'border-action bg-action-soft text-action-ink'
                    : 'border-line-control bg-surface text-ink hover:bg-surface-sunken',
                )}
              >
                {formatXof(amount)}
              </button>
            );
          })}
        </div>
      </fieldset>
      <TextField
        id={AMOUNT_ID}
        label={t.amountLabel}
        hint={t.amountHint(min, max)}
        error={fieldError}
        inputRef={input}
        inputMode="numeric"
        autoComplete="off"
        value={value}
        onChange={(event) => {
          setValue(event.target.value);
          setFieldError(null);
        }}
        className="max-w-xs"
      />
      <div className="grid justify-items-start gap-3">
        <Button type="submit" variant="action" disabled={topUp.busy} aria-busy={topUp.busy || undefined}>
          {topUp.busy ? t.topUpOpening : 'amount' in check ? t.topUp(formatXof(check.amount)) : t.topUpSubmit}
        </Button>
        <p className="text-small text-ink-muted max-w-reading">{t.topUpCredited}</p>
        <FormMessage>{topUp.error?.message}</FormMessage>
      </div>
    </form>
  );
}
