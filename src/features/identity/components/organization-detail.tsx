'use client';

import { useCallback, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button, ButtonLink } from '@/components/ui/button';
import { FormMessage } from '@/components/ui/field';
import { Heading } from '@/components/ui/heading';
import { IconArrowLeft } from '@/components/ui/icons';
import { useSession } from '@/lib/api';
import { formatShortDate } from '@/lib/format';
import { frenchSpacing } from '@/lib/typography';
import { useResource } from '@/lib/use-resource';
import { changeBillingEmail, confirmBillingEmail, getMyOrganization } from '@/features/identity/api';
import { describeAccountError } from '@/features/identity/account-errors';
import { accountTexts, identityPaths, organizationStatus } from '@/features/identity/texts';
import { EmailVerification } from './email-verification';
import { Fact, Loading, Section } from './space-parts';
import { useSwitchContext } from './use-switch-context';

const t = accountTexts.organization;
/** L'e-mail de facturation se change tant que l'organisation est en attente ou validée (contrat). */
const BILLING_OPEN = new Set(['pending_review', 'active']);

function BackLink() {
  return (
    <ButtonLink href={identityPaths.organizations} variant="ghost" className="-ml-3 justify-self-start">
      <IconArrowLeft />
      {t.back}
    </ButtonLink>
  );
}

/** Fiche d'un compte entreprise : état et suite, informations, e-mail de facturation, passage en contexte. */
export function OrganizationDetail({ id }: { id: string }) {
  const { state, reload, set } = useResource(useCallback(() => getMyOrganization(id), [id]));
  const activeOrganization = useSession()?.activeContext.organizationId ?? null;
  const context = useSwitchContext();
  const [pendingBilling, setPendingBilling] = useState<string | null | undefined>(undefined);

  if (state.status === 'loading') return <Loading label={accountTexts.common.loading} />;
  if (state.status === 'error') {
    const view = describeAccountError(state.error);
    return (
      <div className="grid justify-items-start gap-4">
        <BackLink />
        <FormMessage>{view.message}</FormMessage>
        {view.notFound ? null : (
          <Button variant="secondary" onClick={reload}>
            {accountTexts.common.retry}
          </Button>
        )}
      </div>
    );
  }

  const membership = state.data;
  const { organization } = membership;
  const status = organizationStatus(organization.status);
  const isAdmin = membership.role === 'org_admin';
  const inUse = activeOrganization === organization.id;
  const pending = pendingBilling !== undefined ? pendingBilling : membership.pendingBillingEmail;

  return (
    <div className="grid gap-8">
      <div className="grid gap-3">
        <BackLink />
        <div className="flex flex-wrap items-center gap-3">
          <Heading as="h1" size="h2" className="break-words">
            {organization.legalName}
          </Heading>
          <Badge tone={status.tone}>{status.label}</Badge>
        </div>
        {status.hint ? <p className="text-ink">{frenchSpacing(status.hint)}</p> : null}
        {organization.status === 'active' ? (
          inUse ? (
            <p className="text-ink font-medium">{t.inUse}</p>
          ) : (
            <div className="grid justify-items-start gap-3">
              <Button
                onClick={() => void context.switchTo(organization.id)}
                aria-busy={context.busy || undefined}
              >
                {context.busy ? accountTexts.context.applying : t.useContext}
              </Button>
              <FormMessage>{context.error}</FormMessage>
            </div>
          )
        ) : null}
      </div>

      <Section id="entreprise-infos-titre" title={t.detailsTitle}>
        <dl className="grid gap-4 sm:grid-cols-2">
          <Fact label={t.legalName} value={organization.legalName} />
          <Fact label={t.address} value={organization.address} />
          <Fact label={t.ifu} value={organization.ifu} numeric />
          {organization.rccm ? <Fact label={t.rccm} value={organization.rccm} /> : null}
          <Fact label={t.role} value={accountTexts.organizations.role[membership.role] ?? membership.role} />
          <Fact label={t.createdAt} value={formatShortDate(organization.createdAt)} />
          {organization.reviewedAt ? (
            <Fact label={t.reviewedAt} value={formatShortDate(organization.reviewedAt)} />
          ) : null}
          {organization.status === 'rejected' && organization.rejectionReason ? (
            <Fact label={t.rejectionReason} value={organization.rejectionReason} />
          ) : null}
          {organization.status === 'suspended' && organization.suspensionReason ? (
            <Fact label={t.suspensionReason} value={organization.suspensionReason} />
          ) : null}
        </dl>
      </Section>

      <Section id="entreprise-facturation-titre" title={t.billingTitle} lead={t.billingLead}>
        <EmailVerification
          id="entreprise-email"
          verified={organization.billingEmail}
          pending={pending}
          send={(email) => changeBillingEmail(organization.id, email)}
          onPending={setPendingBilling}
          confirm={async (code) => {
            const next = await confirmBillingEmail(organization.id, code);
            set(next);
            setPendingBilling(next.pendingBillingEmail);
            return next.organization.billingEmail;
          }}
          disabledReason={
            !isAdmin
              ? t.billingAdminOnly
              : !BILLING_OPEN.has(organization.status)
                ? t.billingClosed
                : undefined
          }
        />
      </Section>
    </div>
  );
}
