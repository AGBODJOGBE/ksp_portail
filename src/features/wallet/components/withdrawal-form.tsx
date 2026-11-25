'use client';

import { type FormEvent, useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { FieldError, FormMessage, TextField, fieldIds } from '@/components/ui/field';
import { useSession } from '@/lib/api';
import { cn } from '@/lib/cn';
import { formatXof } from '@/lib/format';
import { formatPhone } from '@/lib/phone';
import { type WithdrawalInput, requestWithdrawal } from '@/features/wallet/api';
import type { Money, WithdrawalCreated } from '@/features/wallet/schemas';
import { walletTexts } from '@/features/wallet/texts';
import {
  FIELD_ORDER,
  NAME_MAX,
  OPERATORS,
  type WithdrawalErrorView,
  type WithdrawalErrors,
  type WithdrawalField,
  type WithdrawalValues,
  beneficiaryPhone,
  checkWithdrawal,
  describeWithdrawalError,
  withdrawalKeys,
} from '@/features/wallet/withdrawal';
import { withdrawalTexts as t } from '@/features/wallet/withdrawal-texts';

const IDS: Record<WithdrawalField, string> = {
  amount: 'retrait-montant',
  operator: 'retrait-operateur',
  phone: 'retrait-numero',
  name: 'retrait-nom',
};

const PANEL = 'rounded-control border-line bg-surface-muted grid gap-4 border p-4';

type Step =
  { name: 'form' } | { name: 'recap'; input: WithdrawalInput } | { name: 'done'; created: WithdrawalCreated };

/** Numéro et nom préremplis depuis la session (modifiables). */
function initialValues(
  user: { phone: string | null; firstName: string | null; lastName: string | null } | null,
) {
  return {
    amount: '',
    operator: '',
    phone: user?.phone ? formatPhone(user.phone) : '',
    name: [user?.firstName, user?.lastName].filter(Boolean).join(' '),
  } satisfies WithdrawalValues;
}

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex flex-wrap items-baseline justify-between gap-x-4">
      <dt className="text-small text-ink-muted">{label}</dt>
      <dd className={cn('text-ink tabular-nums', strong ? 'text-lg font-semibold' : 'font-medium')}>
        {value}
      </dd>
    </div>
  );
}

/**
 * « Retirer vers Mobile Money » (R-WL-04) : saisie (montant, opérateur, numéro et nom du bénéficiaire),
 * récapitulatif, puis envoi avec une clé d'idempotence par saisie. Le montant est retenu par wallet dès
 * l'envoi ; le portefeuille renvoyé (solde après la retenue) est remonté à l'écran.
 */
export function WithdrawalForm({
  balance,
  onCreated,
  onInsufficient,
}: {
  /** Solde prépayé disponible, tel que lu sur la gateway. */
  balance: Money;
  onCreated: (created: WithdrawalCreated) => void;
  /** Refus pour solde insuffisant : le portefeuille est relu. */
  onInsufficient: () => void;
}) {
  const user = useSession()?.user ?? null;
  const [values, setValues] = useState<WithdrawalValues>(() => initialValues(user));
  const [errors, setErrors] = useState<WithdrawalErrors>({});
  const [step, setStep] = useState<Step>({ name: 'form' });
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<WithdrawalErrorView | null>(null);
  const keys = useRef(withdrawalKeys());
  const form = useRef<HTMLFormElement>(null);
  const heading = useRef<HTMLParagraphElement>(null);

  // Le titre de l'étape reçoit le focus : le lecteur d'écran annonce le récapitulatif ou le résultat.
  useEffect(() => {
    if (step.name !== 'form') heading.current?.focus();
  }, [step.name]);

  function focusFirst(found: WithdrawalErrors) {
    const first = FIELD_ORDER.find((field) => found[field]);
    if (!first) return;
    // Opérateur : le premier bouton radio du groupe.
    const selector = first === 'operator' ? `input[name="${IDS.operator}"]` : `#${IDS[first]}`;
    form.current?.querySelector<HTMLInputElement>(selector)?.focus();
  }

  function change(field: WithdrawalField, value: string) {
    setValues((previous) => ({ ...previous, [field]: value }));
    setErrors((previous) => ({ ...previous, [field]: undefined }));
    setProblem(null);
  }

  function review(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const check = checkWithdrawal(values, balance.amount);
    if ('errors' in check) {
      setErrors(check.errors);
      focusFirst(check.errors);
      return;
    }
    setErrors({});
    setProblem(null);
    setStep({ name: 'recap', input: check.input });
  }

  async function confirm(input: WithdrawalInput) {
    if (busy) return;
    setBusy(true);
    setProblem(null);
    try {
      const created = await requestWithdrawal(input, keys.current.keyFor(input));
      keys.current.done();
      setStep({ name: 'done', created });
      onCreated(created);
    } catch (caught) {
      const view = describeWithdrawalError(caught);
      if (view.kind === 'newKey') keys.current.done();
      if (view.kind === 'field' && view.field) {
        // Champ refusé par la gateway : retour à la saisie, erreur sous le champ.
        const found = { [view.field]: view.message };
        setStep({ name: 'form' });
        setErrors(found);
        requestAnimationFrame(() => focusFirst(found));
      } else {
        setProblem(view);
        if (view.kind === 'insufficient') onInsufficient();
      }
    } finally {
      setBusy(false);
    }
  }

  if (step.name === 'done') {
    const { withdrawal, wallet, created } = step.created;
    const amount = formatXof(withdrawal.amount);
    return (
      <div className="grid justify-items-start gap-4">
        <div role="status" className="grid gap-1">
          <p ref={heading} tabIndex={-1} className="text-action-ink font-semibold focus:outline-none">
            {created ? t.done(amount) : t.alreadyDone(amount)}
          </p>
          <p className="text-ink">{t.newBalance(formatXof(wallet.balance))}</p>
          <p className="text-small text-ink-muted">{t.follow}</p>
        </div>
        <Button
          variant="secondary"
          onClick={() => {
            setValues((previous) => ({ ...previous, amount: '' }));
            setStep({ name: 'form' });
          }}
        >
          {t.another}
        </Button>
      </div>
    );
  }

  if (step.name === 'recap') {
    const { input } = step;
    const operator = walletTexts.operators[input.beneficiary.operator] ?? input.beneficiary.operator;
    return (
      <div className={PANEL}>
        <p ref={heading} tabIndex={-1} className="text-ink font-semibold focus:outline-none">
          {t.recapTitle}
        </p>
        <dl className="grid gap-1">
          <Row label={t.recapAmount} value={formatXof(input.amount)} strong />
          <Row label={t.recapTo} value={`${operator} ${formatPhone(input.beneficiary.phone)}`} />
          <Row label={t.recapName} value={input.beneficiary.name} />
        </dl>
        <p className="text-small text-ink-muted">{t.recapHint}</p>
        <div className="flex flex-wrap gap-3">
          <Button
            variant="action"
            onClick={() => void confirm(input)}
            disabled={busy}
            aria-busy={busy || undefined}
            aria-label={busy ? undefined : t.confirm(formatXof(input.amount))}
          >
            {busy ? (
              t.sending
            ) : (
              // Sur téléphone, le montant (déjà au-dessus) n'est pas répété à l'écran : le bouton tient sur
              // une ligne. Le nom complet reste celui du bouton (`aria-label`).
              <>
                {t.confirmShort}{' '}
                <span className="max-sm:hidden">{t.confirmAmount(formatXof(input.amount))}</span>
              </>
            )}
          </Button>
          <Button
            variant="ghost"
            disabled={busy}
            onClick={() => {
              setProblem(null);
              setStep({ name: 'form' });
            }}
          >
            {t.edit}
          </Button>
        </div>
        <FormMessage>{problem?.message}</FormMessage>
      </div>
    );
  }

  // Rien à retirer (solde vide, ou vidé par la demande qui vient d'être faite).
  if (balance.amount <= 0) return <FormMessage tone="info">{t.empty}</FormMessage>;

  const operatorIds = fieldIds(IDS.operator);
  // Forme envoyée, montée sous le champ quand elle diffère de la saisie (indicatif ajouté, ancien numéro
  // à 8 chiffres complété par 01, ADR-063) ; la saisie n'est pas réécrite.
  const sent = beneficiaryPhone(values.phone);
  const shown = sent ? formatPhone(sent) : null;
  return (
    <form ref={form} onSubmit={review} noValidate className="grid gap-5">
      <div className="grid gap-2">
        <TextField
          id={IDS.amount}
          label={t.amount}
          hint={t.amountHint(formatXof(balance))}
          error={errors.amount}
          inputMode="numeric"
          autoComplete="off"
          value={values.amount}
          onChange={(event) => change('amount', event.target.value)}
          className="max-w-xs"
          inputClassName="tabular-nums"
        />
        <button
          type="button"
          onClick={() => change('amount', String(balance.amount))}
          className="text-action-ink min-h-11 justify-self-start text-sm font-semibold underline-offset-4 hover:underline"
        >
          {t.all(formatXof(balance))}
        </button>
      </div>

      <fieldset className="grid gap-3" aria-describedby={errors.operator ? operatorIds.error : undefined}>
        <legend className="text-ink font-semibold">{t.operator}</legend>
        <div className="grid grid-cols-3 gap-2">
          {OPERATORS.map((operator) => (
            <label
              key={operator}
              className={cn(
                'rounded-control border-line-control bg-surface text-ink flex min-h-12 cursor-pointer items-center justify-center border px-3 font-semibold',
                'has-[:checked]:border-action has-[:checked]:bg-action-soft has-[:checked]:text-action-ink',
                'has-[:focus-visible]:outline-focus has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2',
              )}
            >
              <input
                type="radio"
                name={IDS.operator}
                value={operator}
                className="sr-only"
                checked={values.operator === operator}
                onChange={() => change('operator', operator)}
              />
              {walletTexts.operators[operator]}
            </label>
          ))}
        </div>
        {errors.operator ? <FieldError id={operatorIds.error}>{errors.operator}</FieldError> : null}
      </fieldset>

      <div className="grid gap-1">
        <TextField
          id={IDS.phone}
          label={t.phone}
          hint={t.phoneHint}
          error={errors.phone}
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          value={values.phone}
          onChange={(event) => change('phone', event.target.value)}
          className="max-w-sm"
          inputClassName="tabular-nums"
        />
        <p aria-live="polite" className="text-small text-ink-muted empty:hidden">
          {shown && shown !== values.phone.trim() ? t.phoneUsed(shown) : null}
        </p>
      </div>

      <TextField
        id={IDS.name}
        label={t.name}
        hint={t.nameHint}
        error={errors.name}
        autoComplete="name"
        maxLength={NAME_MAX + 20}
        value={values.name}
        onChange={(event) => change('name', event.target.value)}
        className="max-w-sm"
      />

      <div className="grid justify-items-start gap-3">
        <Button type="submit" variant="action">
          {t.continue}
        </Button>
        <FormMessage>{problem?.message}</FormMessage>
      </div>
    </form>
  );
}
