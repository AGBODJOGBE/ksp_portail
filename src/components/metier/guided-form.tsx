'use client';

import { type FormEvent, type ReactNode, useEffect, useId, useRef, useState } from 'react';
import {
  IconAlert,
  IconArrowLeft,
  IconArrowRight,
  IconCheck,
  IconClock,
  IconWhatsApp,
} from '@/components/icons';
import { Button, ButtonArrow, buttonClasses } from '@/components/ui/button';
import type { ChoiceStep, GuidedFormContent, QuantityStep } from '@/content/guided-form';
import { getDictionary } from '@/i18n';
import { cn } from '@/lib/cn';
import { frenchSpacing } from '@/lib/typography';
import {
  type Answer,
  type Answers,
  UNKNOWN,
  answerLabel,
  summaryMessage,
  validateStep,
} from './guided-form-logic';

/*
 * Formulaire guidé par étapes : une question par écran, retour possible, récapitulatif modifiable.
 * Rien n'est envoyé (aucun appel réseau) et aucun prix n'est calculé : l'écran final renvoie vers
 * le devis et WhatsApp, en attendant que la gateway fournisse l'estimation.
 */

const OPTION = cn(
  'relative flex min-h-14 cursor-pointer items-start gap-3 rounded-control border border-line-strong bg-surface p-4',
  'has-[:checked]:border-accent has-[:checked]:bg-accent-soft',
  'has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-focus',
);
const RADIO = 'accent-accent mt-0.5 size-5 shrink-0 focus-visible:outline-none';

function ChoiceOptions({
  step,
  name,
  answer,
  onChange,
  describedBy,
  labelledBy,
}: {
  step: ChoiceStep;
  name: string;
  answer: Answer | undefined;
  onChange: (answer: Answer) => void;
  describedBy: string | undefined;
  labelledBy: string;
}) {
  const selected = answer?.kind === 'choice' ? answer.value : '';
  return (
    <fieldset aria-labelledby={labelledBy} aria-describedby={describedBy} className="mt-6">
      <div className="grid gap-3 sm:grid-cols-2">
        {step.options.map((option) => (
          <label key={option.value} className={OPTION}>
            <input
              type="radio"
              name={name}
              value={option.value}
              checked={selected === option.value}
              onChange={() => onChange({ kind: 'choice', value: option.value })}
              className={RADIO}
            />
            <span>
              <span className="text-ink block font-semibold">{option.label}</span>
              {option.hint ? (
                <span className="text-small text-ink-muted mt-0.5 block">{option.hint}</span>
              ) : null}
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}

function QuantityInput({
  step,
  name,
  answer,
  onChange,
  describedBy,
  labelledBy,
  invalid,
}: {
  step: QuantityStep;
  name: string;
  answer: Answer | undefined;
  onChange: (answer: Answer) => void;
  describedBy: string | undefined;
  labelledBy: string;
  invalid: boolean;
}) {
  const inputId = useId();
  const current = answer?.kind === 'quantity' ? answer : { kind: 'quantity' as const, mode: '', amount: '' };
  const mode = step.modes.find((item) => item.value === current.mode);
  const choices = [
    ...step.modes.map((item) => ({ value: item.value, label: item.label })),
    { value: UNKNOWN, label: step.unknownLabel },
  ];
  return (
    <>
      <fieldset aria-labelledby={labelledBy} aria-describedby={describedBy} className="mt-6">
        <div className="grid gap-3 sm:grid-cols-2">
          {choices.map((choice) => (
            <label key={choice.value} className={OPTION}>
              <input
                type="radio"
                name={name}
                value={choice.value}
                checked={current.mode === choice.value}
                onChange={() => onChange({ ...current, mode: choice.value })}
                className={RADIO}
              />
              <span className="text-ink font-semibold">{choice.label}</span>
            </label>
          ))}
        </div>
      </fieldset>
      {mode ? (
        <div className="swap-in mt-6 max-w-sm">
          <label htmlFor={inputId} className="text-ink block font-semibold">
            {mode.inputLabel}
          </label>
          <div
            className={cn(
              'rounded-control bg-surface mt-2 flex items-center border',
              'has-[:focus-visible]:outline-focus has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2',
              invalid ? 'border-danger' : 'border-line-control',
            )}
          >
            <input
              id={inputId}
              type="text"
              inputMode="numeric"
              autoComplete="off"
              value={current.amount}
              onChange={(event) => onChange({ ...current, amount: event.target.value })}
              aria-invalid={invalid || undefined}
              aria-describedby={describedBy}
              className="text-ink min-h-12 w-full min-w-0 bg-transparent px-4 text-base tabular-nums focus-visible:outline-none"
            />
            <span className="text-ink-muted shrink-0 pr-4 font-medium">
              {mode.format === 'xof' ? 'F\u00a0CFA' : mode.unit}
            </span>
          </div>
        </div>
      ) : null}
    </>
  );
}

export function GuidedForm({
  content,
  resultActions,
  whatsappNumber,
}: {
  content: GuidedFormContent;
  /** Boutons de l'écran final (rendus par le serveur : devis, contact). */
  resultActions: ReactNode;
  /** Numéro WhatsApp configuré ; sans numéro, pas de bouton WhatsApp. */
  whatsappNumber?: string;
}) {
  const t = getDictionary().guidedForm;
  const baseId = useId();
  const headingRef = useRef<HTMLHeadingElement>(null);
  const [navigated, setNavigated] = useState(false);
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<Answers>({});
  const [error, setError] = useState<string | null>(null);

  const { steps } = content;
  const total = steps.length + 1;
  const isSummary = index === steps.length;
  const step = steps[index];
  const titleId = `${baseId}-titre`;
  const hintId = `${baseId}-aide`;
  const errorId = `${baseId}-erreur`;

  // Après un changement d'étape (pas au premier affichage), le focus va au titre de la nouvelle étape.
  useEffect(() => {
    if (navigated) headingRef.current?.focus();
  }, [index, navigated]);

  function goTo(next: number) {
    setNavigated(true);
    setError(null);
    setIndex(Math.max(0, Math.min(next, steps.length)));
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!step) return;
    const message = validateStep(step, answers[step.id]);
    if (message) {
      setError(message);
      return;
    }
    goTo(index + 1);
  }

  function setAnswer(answer: Answer) {
    if (!step) return;
    setAnswers((previous) => ({ ...previous, [step.id]: answer }));
    setError(null);
  }

  function restart() {
    setAnswers({});
    goTo(0);
  }

  const whatsappHref = whatsappNumber
    ? `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(
        summaryMessage(content.result.whatsappIntro, steps, answers),
      )}`
    : null;
  const describedBy = cn(step?.hint && hintId, error && errorId) || undefined;
  const names = [...steps.map((item) => item.name), content.summaryName];

  return (
    <form
      noValidate
      aria-label={content.label}
      onSubmit={handleSubmit}
      className="rounded-panel border-line bg-surface shadow-card overflow-hidden border lg:grid lg:grid-cols-[16rem_minmax(0,1fr)]"
    >
      {/* Progression : barre segmentée sur téléphone, liste des étapes sur ordinateur. */}
      <div className="border-line bg-surface-muted border-b p-5 sm:px-8 lg:border-r lg:border-b-0 lg:p-8">
        <p className="text-small text-ink-muted font-semibold">
          {t.progress(index + 1, total)}
          <span className="text-ink lg:hidden"> · {names[index]}</span>
        </p>
        <div aria-hidden="true" className="mt-3 flex gap-1.5 lg:hidden">
          {names.map((name, position) => (
            <span
              key={name}
              className={cn('h-1.5 flex-1 rounded-full', position <= index ? 'bg-accent' : 'bg-line-strong')}
            />
          ))}
        </div>
        <ol aria-label={t.stepsLabel} className="mt-6 hidden space-y-1 lg:block">
          {names.map((name, position) => {
            const done = position < index;
            const current = position === index;
            const marker = (
              <span
                aria-hidden="true"
                className={cn(
                  'grid size-7 shrink-0 place-items-center rounded-full border text-xs font-semibold tabular-nums',
                  done && 'border-accent bg-accent text-on-accent',
                  current && 'border-accent text-accent-ink bg-surface',
                  !done && !current && 'border-line-strong text-ink-subtle',
                )}
              >
                {done ? <IconCheck className="size-3.5" /> : position + 1}
              </span>
            );
            return (
              <li key={name} aria-current={current ? 'step' : undefined}>
                {done ? (
                  <button
                    type="button"
                    onClick={() => goTo(position)}
                    className="hover-veil rounded-control text-ink -mx-2 flex min-h-11 w-[calc(100%+1rem)] items-center gap-3 px-2 text-left text-sm font-medium"
                  >
                    {marker}
                    <span>
                      {name}
                      <span className="sr-only"> ({t.edit})</span>
                    </span>
                  </button>
                ) : (
                  <span
                    className={cn(
                      'flex min-h-11 items-center gap-3 text-sm',
                      current ? 'text-ink font-semibold' : 'text-ink-subtle',
                    )}
                  >
                    {marker}
                    {name}
                  </span>
                )}
              </li>
            );
          })}
        </ol>
      </div>

      <div className="flex flex-col p-5 sm:p-8 lg:p-10">
        {/* Annonce discrète de l'étape pour les lecteurs d'écran (le focus va aussi au titre). */}
        <p className="sr-only" aria-live="polite">
          {navigated ? t.progress(index + 1, total) : ''}
        </p>
        <div key={index} className="swap-in">
          <h3
            id={titleId}
            ref={headingRef}
            tabIndex={-1}
            className="font-display text-h3 text-ink font-semibold outline-none"
          >
            {frenchSpacing((isSummary ? content.summaryTitle : step?.title) ?? '')}
          </h3>
          {(isSummary ? content.summaryHint : step?.hint) ? (
            <p id={hintId} className="text-ink-muted mt-2">
              {frenchSpacing((isSummary ? content.summaryHint : step?.hint) ?? '')}
            </p>
          ) : null}

          {step?.kind === 'choice' ? (
            <ChoiceOptions
              step={step}
              name={`${baseId}-${step.id}`}
              answer={answers[step.id]}
              onChange={setAnswer}
              describedBy={describedBy}
              labelledBy={titleId}
            />
          ) : null}
          {step?.kind === 'quantity' ? (
            <QuantityInput
              step={step}
              name={`${baseId}-${step.id}`}
              answer={answers[step.id]}
              onChange={setAnswer}
              describedBy={describedBy}
              labelledBy={titleId}
              invalid={!!error}
            />
          ) : null}

          {error ? (
            <p id={errorId} role="alert" className="text-danger mt-4 flex items-center gap-2 font-medium">
              <IconAlert className="size-5" />
              {error}
            </p>
          ) : null}

          {isSummary ? (
            <>
              <dl className="divide-line border-line mt-6 divide-y border-y">
                {steps.map((item, position) => (
                  <div
                    key={item.id}
                    className="flex flex-wrap items-center justify-between gap-x-6 gap-y-1 py-3"
                  >
                    <dt className="text-small text-ink-muted w-full sm:w-40 sm:shrink-0">{item.name}</dt>
                    <dd className="text-ink min-w-0 flex-1 font-semibold">
                      {answerLabel(item, answers[item.id])}
                    </dd>
                    <dd>
                      <button
                        type="button"
                        onClick={() => goTo(position)}
                        aria-label={t.editStep(item.name)}
                        className="text-accent-ink inline-flex min-h-11 items-center text-sm font-semibold underline-offset-4 hover:underline"
                      >
                        {t.edit}
                      </button>
                    </dd>
                  </div>
                ))}
              </dl>
              <div
                data-placeholder=""
                className="rounded-card border-accent-muted bg-accent-soft mt-8 border border-dashed p-5 sm:p-6"
              >
                <p className="text-accent-ink inline-flex items-center gap-2 text-xs font-semibold tracking-wide uppercase">
                  <IconClock className="size-4" />À venir
                </p>
                <p className="font-display text-ink mt-3 text-xl font-semibold">
                  {frenchSpacing(content.result.title)}
                </p>
                <p className="text-ink-muted mt-2">{frenchSpacing(content.result.text)}</p>
                <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                  {resultActions}
                  {whatsappHref ? (
                    <a
                      href={whatsappHref}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={buttonClasses({ variant: 'secondary', size: 'lg' })}
                    >
                      <IconWhatsApp className="text-whatsapp size-5" />
                      {getDictionary().common.contactWhatsapp}
                    </a>
                  ) : null}
                </div>
              </div>
            </>
          ) : null}
        </div>

        <div className="border-line mt-8 flex flex-wrap items-center justify-between gap-3 border-t pt-6">
          {index > 0 ? (
            <Button variant="secondary" onClick={() => goTo(index - 1)}>
              <IconArrowLeft />
              {t.previous}
            </Button>
          ) : (
            <span />
          )}
          {isSummary ? (
            <Button variant="ghost" onClick={restart}>
              {t.restart}
            </Button>
          ) : (
            <Button type="submit" variant="primary">
              {index === steps.length - 1 ? t.toSummary : t.next}
              <ButtonArrow>
                <IconArrowRight />
              </ButtonArrow>
            </Button>
          )}
        </div>
      </div>
    </form>
  );
}
