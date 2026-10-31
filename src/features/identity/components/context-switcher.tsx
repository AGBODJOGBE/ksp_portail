'use client';

import Link from 'next/link';
import { type FormEvent, useCallback, useId, useState } from 'react';
import { Button } from '@/components/ui/button';
import { FormMessage } from '@/components/ui/field';
import { type ActiveContext, useSession } from '@/lib/api';
import { cn } from '@/lib/cn';
import { useResource } from '@/lib/use-resource';
import { listMyOrganizations } from '@/features/identity/api';
import { describeAccountError } from '@/features/identity/account-errors';
import type { Membership } from '@/features/identity/schemas';
import { accountTexts, identityPaths, organizationStatus } from '@/features/identity/texts';
import { useSwitchContext } from './use-switch-context';

const t = accountTexts.context;
const PERSONAL = 'personal';
const LINK = 'text-brand-ink font-semibold underline underline-offset-4 hover:no-underline';

export function contextLabel(context: ActiveContext): string {
  return context.type === 'business' ? t.business(context.organizationName ?? null) : t.personal;
}

function Choices({ current, onSwitched }: { current: string; onSwitched: (label: string) => void }) {
  const baseId = useId();
  const organizations = useResource(useCallback(() => listMyOrganizations(), []));
  const [choice, setChoice] = useState(current);
  const context = useSwitchContext();

  if (organizations.state.status === 'loading') {
    return (
      <p role="status" className="text-ink-muted">
        {accountTexts.common.loading}
      </p>
    );
  }
  if (organizations.state.status === 'error') {
    return (
      <div className="grid justify-items-start gap-3">
        <FormMessage>{describeAccountError(organizations.state.error).message}</FormMessage>
        <Button variant="secondary" onClick={organizations.reload}>
          {accountTexts.common.retry}
        </Button>
      </div>
    );
  }

  const memberships: Membership[] = organizations.state.data;
  if (!memberships.length) {
    return (
      <p className="text-ink-muted">
        {t.none}{' '}
        <Link href={identityPaths.organizations} className={LINK}>
          {t.createLink}
        </Link>
      </p>
    );
  }

  const options = [
    { value: PERSONAL, label: t.personalShort, note: null as string | null, enabled: true },
    ...memberships.map(({ organization }) => ({
      value: organization.id,
      label: organization.legalName,
      note:
        organization.status === 'active'
          ? null
          : t.unavailable(organizationStatus(organization.status).label.toLowerCase()),
      enabled: organization.status === 'active',
    })),
  ];

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (choice === current) return onSwitched('');
    const chosen = options.find((option) => option.value === choice);
    if (!chosen?.enabled) return;
    const done = await context.switchTo(choice === PERSONAL ? null : choice);
    if (done) onSwitched(chosen.value === PERSONAL ? t.personal : t.business(chosen.label));
  }

  return (
    <form noValidate onSubmit={submit} className="grid gap-4">
      <fieldset className="grid gap-2">
        <legend className="text-ink mb-1 font-semibold">{t.legend}</legend>
        {options.map((option) => {
          const optionId = `${baseId}-${option.value}`;
          return (
            <label
              key={option.value}
              htmlFor={optionId}
              className={cn(
                'rounded-control border-line-control flex min-h-12 items-center gap-3 border px-4 py-2',
                option.enabled ? 'cursor-pointer' : 'cursor-not-allowed opacity-70',
                choice === option.value && 'border-brand bg-brand-soft',
              )}
            >
              <input
                id={optionId}
                type="radio"
                name={`${baseId}-contexte`}
                value={option.value}
                checked={choice === option.value}
                disabled={!option.enabled}
                onChange={() => setChoice(option.value)}
                className="accent-brand size-5 shrink-0"
              />
              <span className="min-w-0">
                <span className="text-ink block font-medium break-words">{option.label}</span>
                {option.note ? <span className="text-small text-ink-muted block">{option.note}</span> : null}
              </span>
            </label>
          );
        })}
      </fieldset>
      <FormMessage>{context.error}</FormMessage>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-5">
        <Button type="submit" aria-busy={context.busy || undefined}>
          {context.busy ? t.applying : t.apply}
        </Button>
        <Link href={identityPaths.organizations} className={cn(LINK, 'text-small')}>
          {t.manageLink}
        </Link>
      </div>
    </form>
  );
}

/**
 * Sélecteur de contexte (ADR-027) : compte actif, et passage du compte personnel à un compte
 * entreprise validé (ou l'inverse). Les comptes entreprise ne sont lus qu'à l'ouverture du choix.
 */
export function ContextSwitcher({ className, hint = false }: { className?: string; hint?: boolean }) {
  const current = useSession()?.activeContext;
  const panelId = useId();
  const [open, setOpen] = useState(false);
  const [switched, setSwitched] = useState<string | null>(null);
  if (!current) return null;

  return (
    <section
      aria-label={t.label}
      className={cn('rounded-card border-line bg-surface grid gap-4 border p-4 sm:p-5', className)}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-ink">
            <span className="text-ink-muted">{t.label} : </span>
            <span className="font-semibold break-words">{contextLabel(current)}</span>
          </p>
          {hint ? <p className="text-small text-ink-muted mt-1">{t.hint}</p> : null}
        </div>
        <Button
          variant="secondary"
          className="shrink-0"
          aria-expanded={open}
          aria-controls={open ? panelId : undefined}
          onClick={() => {
            setSwitched(null);
            setOpen((value) => !value);
          }}
        >
          {open ? t.close : t.change}
        </Button>
      </div>
      <FormMessage tone="info">{switched}</FormMessage>
      {open ? (
        <div id={panelId}>
          <Choices
            current={current.organizationId ?? PERSONAL}
            onSwitched={(label) => {
              setOpen(false);
              setSwitched(label ? t.switched(label) : null);
            }}
          />
        </div>
      ) : null}
    </section>
  );
}
