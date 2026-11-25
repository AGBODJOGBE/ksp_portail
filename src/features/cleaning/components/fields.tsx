import type { ComponentProps, ReactNode } from 'react';
import { FieldError, fieldIds, inputClasses } from '@/components/ui/field';
import { IconCheck } from '@/components/ui/icons';
import { cn } from '@/lib/cn';

/*
 * Briques de formulaire du Nettoyage : groupe de champs avec légende, choix en pastilles (boutons radio
 * ou cases), liste déroulante et zone de texte reliées à leur aide et à leur erreur. Cibles de 44 px,
 * focus visible, erreur sous le champ.
 */

export function Fieldset({
  legend,
  hint,
  error,
  id,
  children,
  className,
  legendClassName,
}: {
  legend: ReactNode;
  hint?: ReactNode;
  error?: string | null;
  /** Préfixe des identifiants de l'aide et de l'erreur. */
  id: string;
  children: ReactNode;
  className?: string;
  legendClassName?: string;
}) {
  const ids = fieldIds(id);
  return (
    <fieldset
      className={cn('min-w-0', className)}
      aria-describedby={cn(hint ? ids.hint : null, error ? ids.error : null) || undefined}
    >
      <legend className={cn('text-ink font-semibold', legendClassName)}>{legend}</legend>
      {hint ? (
        <p id={ids.hint} className="text-small text-ink-muted mt-1">
          {hint}
        </p>
      ) : null}
      <div className="mt-3">{children}</div>
      {error ? <FieldError id={ids.error}>{error}</FieldError> : null}
    </fieldset>
  );
}

/** Choix en pastille (bouton radio ou case à cocher natifs, masqués visuellement mais focalisables). */
export function ChoicePill({
  type = 'radio',
  label,
  hint,
  className,
  ...input
}: Omit<ComponentProps<'input'>, 'type'> & {
  type?: 'radio' | 'checkbox';
  label: ReactNode;
  hint?: ReactNode;
}) {
  return (
    <label
      className={cn(
        'group/choice rounded-control border-line-control bg-surface text-ink relative flex min-h-11 cursor-pointer items-center gap-3 border px-4 py-2.5',
        'has-[:checked]:border-action has-[:checked]:bg-action-soft has-[:focus-visible]:outline-focus has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2',
        'has-[:disabled]:cursor-not-allowed has-[:disabled]:opacity-60',
        'ease-soft transition-colors duration-(--motion-fast)',
        className,
      )}
    >
      <input type={type} className="peer sr-only" {...input} />
      <span
        aria-hidden="true"
        className={cn(
          'border-line-strong grid size-5 shrink-0 place-items-center border-2',
          type === 'radio' ? 'rounded-full' : 'rounded-md',
          'peer-checked:border-action peer-checked:bg-action text-on-action',
        )}
      >
        <IconCheck className="size-3.5 opacity-0 group-has-[:checked]/choice:opacity-100" />
      </span>
      <span className="grid min-w-0 gap-0.5">
        <span className="font-medium">{label}</span>
        {hint ? <span className="text-small text-ink-muted">{hint}</span> : null}
      </span>
    </label>
  );
}

export function SelectField({
  id,
  label,
  hint,
  error,
  children,
  className,
  ...select
}: Omit<ComponentProps<'select'>, 'id'> & {
  id: string;
  label: ReactNode;
  hint?: ReactNode;
  error?: string | null;
}) {
  const ids = fieldIds(id);
  return (
    <div className={className}>
      <label htmlFor={id} className="text-ink block font-semibold">
        {label}
      </label>
      {hint ? (
        <p id={ids.hint} className="text-small text-ink-muted mt-1">
          {hint}
        </p>
      ) : null}
      <select
        id={id}
        {...select}
        aria-invalid={error ? true : undefined}
        aria-describedby={cn(hint ? ids.hint : null, error ? ids.error : null) || undefined}
        className={inputClasses({ invalid: !!error, className: 'mt-2 pr-10' })}
      >
        {children}
      </select>
      {error ? <FieldError id={ids.error}>{error}</FieldError> : null}
    </div>
  );
}

export function TextAreaField({
  id,
  label,
  hint,
  error,
  className,
  counter,
  ...textarea
}: Omit<ComponentProps<'textarea'>, 'id'> & {
  id: string;
  label: ReactNode;
  hint?: ReactNode;
  error?: string | null;
  /** « 120 / 1000 » sous le champ. */
  counter?: string;
}) {
  const ids = fieldIds(id);
  return (
    <div className={className}>
      <label htmlFor={id} className="text-ink block font-semibold">
        {label}
      </label>
      {hint ? (
        <p id={ids.hint} className="text-small text-ink-muted mt-1">
          {hint}
        </p>
      ) : null}
      <textarea
        id={id}
        rows={4}
        {...textarea}
        aria-invalid={error ? true : undefined}
        aria-describedby={cn(hint ? ids.hint : null, error ? ids.error : null) || undefined}
        className={inputClasses({ invalid: !!error, className: 'mt-2 py-3' })}
      />
      {counter ? <p className="text-small text-ink-subtle mt-1 text-right tabular-nums">{counter}</p> : null}
      {error ? <FieldError id={ids.error}>{error}</FieldError> : null}
    </div>
  );
}

/** Ligne « libellé : valeur » d'un récapitulatif (`<dl>`). */
export function SummaryRow({
  label,
  children,
  strong,
}: {
  label: ReactNode;
  children: ReactNode;
  strong?: boolean;
}) {
  return (
    <div className="border-line flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-b py-2.5 last:border-b-0">
      <dt className="text-small text-ink-muted">{label}</dt>
      <dd
        className={cn(
          'text-ink tabular-nums sm:text-right',
          strong ? 'text-lg font-semibold' : 'font-medium',
        )}
      >
        {children}
      </dd>
    </div>
  );
}

/** Carte blanche d'une section d'écran, avec son titre. */
export function Panel({
  id,
  title,
  children,
  className,
  action,
  as: Tag = 'section',
}: {
  id: string;
  title: ReactNode;
  children: ReactNode;
  className?: string;
  action?: ReactNode;
  as?: 'section' | 'div';
}) {
  return (
    <Tag
      aria-labelledby={id}
      className={cn('rounded-panel border-line bg-surface border p-5 shadow-xs sm:p-7', className)}
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id={id} className="font-display text-h3 text-ink font-semibold">
          {title}
        </h2>
        {action}
      </div>
      <div className="mt-5">{children}</div>
    </Tag>
  );
}
