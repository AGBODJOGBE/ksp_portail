'use client';

import Link from 'next/link';
import { type FormEvent, useCallback, useRef, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { FormMessage, TextField } from '@/components/ui/field';
import { Heading } from '@/components/ui/heading';
import { formatShortDate } from '@/lib/format';
import { useResource } from '@/lib/use-resource';
import { createOrganization, listMyOrganizations, type OrganizationInput } from '@/features/identity/api';
import { type AccountField, describeAccountError } from '@/features/identity/account-errors';
import type { Membership } from '@/features/identity/schemas';
import { accountTexts, identityPaths, organizationStatus } from '@/features/identity/texts';
import { Loading, Section } from './space-parts';

const t = accountTexts.organizations;

const ROW =
  'rounded-card border-line bg-surface hover:border-line-strong has-[.stretched-link:focus-visible]:outline-focus relative grid gap-2 border p-4 has-[.stretched-link:focus-visible]:outline-2 has-[.stretched-link:focus-visible]:outline-offset-2 sm:grid-cols-[1fr_auto] sm:items-center sm:p-5';

type FormField = Exclude<AccountField, 'email' | 'code'>;
type Values = Record<FormField, string>;

const EMPTY: Values = { legalName: '', address: '', ifu: '', rccm: '' };

const FIELD_IDS: Record<FormField, string> = {
  legalName: 'entreprise-raison-sociale',
  address: 'entreprise-adresse',
  ifu: 'entreprise-ifu',
  rccm: 'entreprise-rccm',
};

/** Contrôle de forme avant envoi ; identity reste seul juge (IFU, doublon, nombre de demandes). */
function validate(values: Values): { errors: Partial<Values>; input: OrganizationInput | null } {
  const errors: Partial<Values> = {};
  const legalName = values.legalName.trim();
  const address = values.address.trim();
  const ifu = values.ifu.replace(/\s+/g, '');
  const rccm = values.rccm.trim();
  if (!legalName) errors.legalName = t.legalNameRequired;
  if (!address) errors.address = t.addressRequired;
  if (!/^\d{13}$/.test(ifu)) errors.ifu = t.ifuInvalid;
  if (Object.keys(errors).length) return { errors, input: null };
  return { errors, input: { legalName, address, ifu, ...(rccm ? { rccm } : {}) } };
}

function OrganizationRow({ membership }: { membership: Membership }) {
  const { organization } = membership;
  const status = organizationStatus(organization.status);
  return (
    <li className={ROW}>
      <div>
        <Link
          href={identityPaths.organization(organization.id)}
          className="stretched-link text-ink font-semibold underline-offset-4 hover:underline focus-visible:outline-none"
        >
          {organization.legalName}
        </Link>
        <p className="text-small text-ink-muted mt-1">
          {t.createdOn(formatShortDate(organization.createdAt))} ·{' '}
          {t.role[membership.role] ?? membership.role}
        </p>
      </div>
      <div>
        <Badge tone={status.tone}>{status.label}</Badge>
      </div>
    </li>
  );
}

function OrganizationForm({ onCreated }: { onCreated: (membership: Membership) => void }) {
  const [values, setValues] = useState<Values>(EMPTY);
  const [errors, setErrors] = useState<Partial<Values>>({});
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  function show(found: Partial<Values>) {
    setErrors(found);
    const first = (['legalName', 'address', 'ifu', 'rccm'] as const).find((field) => found[field]);
    if (first) formRef.current?.querySelector<HTMLInputElement>(`#${FIELD_IDS[first]}`)?.focus();
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    setError(null);
    const { errors: found, input } = validate(values);
    show(found);
    if (!input) return;
    setBusy(true);
    try {
      onCreated(await createOrganization(input));
      setValues(EMPTY);
    } catch (caught) {
      const view = describeAccountError(caught);
      if (view.field && view.field !== 'email' && view.field !== 'code') show({ [view.field]: view.message });
      else setError(view.message);
    } finally {
      setBusy(false);
    }
  }

  const field = (name: FormField) => ({
    id: FIELD_IDS[name],
    value: values[name],
    error: errors[name] ?? null,
    onChange: (event: { target: { value: string } }) =>
      setValues((previous) => ({ ...previous, [name]: event.target.value })),
  });

  return (
    <form ref={formRef} noValidate onSubmit={submit} className="grid gap-5">
      <TextField
        label={t.legalName}
        autoComplete="organization"
        maxLength={200}
        required
        {...field('legalName')}
      />
      <TextField
        label={t.address}
        hint={t.addressHint}
        autoComplete="street-address"
        maxLength={300}
        required
        {...field('address')}
      />
      <TextField
        label={t.ifu}
        hint={t.ifuHint}
        inputMode="numeric"
        maxLength={30}
        required
        inputClassName="tabular-nums"
        {...field('ifu')}
      />
      <TextField label={t.rccm} hint={t.rccmHint} maxLength={50} {...field('rccm')} />
      <FormMessage>{error}</FormMessage>
      <Button type="submit" className="justify-self-start" aria-busy={busy || undefined}>
        {busy ? t.sending : t.submit}
      </Button>
    </form>
  );
}

/** « Mon entreprise » : mes comptes entreprise avec leur état, et la demande d'un nouveau compte (ADR-027). */
export function OrganizationSpace() {
  const { state, reload, set } = useResource(useCallback(() => listMyOrganizations(), []));
  const [sent, setSent] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);

  if (state.status === 'loading') return <Loading label={accountTexts.common.loading} />;
  if (state.status === 'error') {
    return (
      <div className="grid justify-items-start gap-3">
        <FormMessage>{describeAccountError(state.error).message}</FormMessage>
        <Button variant="secondary" onClick={reload}>
          {accountTexts.common.retry}
        </Button>
      </div>
    );
  }

  const memberships = state.data;
  const showForm = formOpen || memberships.length === 0;
  return (
    <div className="grid gap-8">
      <section aria-labelledby="entreprises-titre" className="grid gap-4">
        <Heading as="h2" size="h3" id="entreprises-titre">
          {t.listTitle}
        </Heading>
        <FormMessage tone="info">{sent}</FormMessage>
        {memberships.length ? (
          <ul className="grid gap-3">
            {memberships.map((membership) => (
              <OrganizationRow key={membership.organization.id} membership={membership} />
            ))}
          </ul>
        ) : (
          <p className="text-ink-muted">{t.none}</p>
        )}
      </section>

      {showForm ? (
        <Section id="demande-entreprise-titre" title={t.requestTitle} lead={t.requestLead}>
          <OrganizationForm
            onCreated={(membership) => {
              set([membership, ...memberships]);
              setSent(t.sent(membership.organization.legalName));
              setFormOpen(false);
            }}
          />
        </Section>
      ) : (
        <Button variant="secondary" className="justify-self-start" onClick={() => setFormOpen(true)}>
          {t.openRequest}
        </Button>
      )}
    </div>
  );
}
