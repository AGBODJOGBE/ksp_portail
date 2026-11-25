'use client';

import { type ReactNode, useEffect, useRef, useState } from 'react';
import { BackendPending } from '@/components/ui/backend-pending';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { FormMessage } from '@/components/ui/field';
import { Heading } from '@/components/ui/heading';
import { Skeleton } from '@/components/ui/skeleton';
import { ApiError, contextKey, isBackendPending, useSession } from '@/lib/api';
import { formatDateTime } from '@/lib/format';
import { useResource } from '@/lib/use-resource';
import { useOrganizationRole } from '@/features/identity';
import { getBillingPreferences, updateBillingPreferences } from '@/features/billing/api';
import { billingTexts as t } from '@/features/billing/texts';

const ID = 'entreprise-prelevement';
const SECTION = 'rounded-card border-line bg-surface grid gap-4 border p-5 sm:p-6';

function Shell({ children, lead = true }: { children: ReactNode; lead?: boolean }) {
  return (
    <section aria-labelledby={`${ID}-titre`} className={SECTION}>
      <div>
        <Heading as="h2" size="h3" id={`${ID}-titre`}>
          {t.preferencesTitle}
        </Heading>
        {lead ? <p className="text-ink-muted mt-2">{t.preferencesLead}</p> : null}
      </div>
      {children}
    </section>
  );
}

const message = (error: unknown) => (error instanceof ApiError ? error.message : t.genericError);

/** Préférences de l'organisation active : lecture pour tout membre, bascule pour l'administrateur. */
function Preferences() {
  const { state, reload, set } = useResource(getBillingPreferences);
  const role = useOrganizationRole();
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const heading = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    if (confirming) heading.current?.focus();
  }, [confirming]);

  if (state.status === 'loading') {
    return (
      <Shell>
        <div role="status" className="grid gap-2">
          <span className="sr-only">{t.loading}</span>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-11 w-64" />
        </div>
      </Shell>
    );
  }
  if (state.status === 'error') {
    if (isBackendPending(state.error)) {
      return (
        <BackendPending
          id={ID}
          title={t.preferencesTitle}
          needs={[
            {
              method: 'GET',
              path: '/api/v1/billing/preferences',
              purpose: 'Lire le prélèvement automatique de l’entreprise active (tout membre).',
            },
            {
              method: 'PATCH',
              path: '/api/v1/billing/preferences',
              purpose: 'Activer ou couper le prélèvement automatique (administrateur de l’entreprise).',
            },
          ]}
        >
          {t.preferencesPendingText}
        </BackendPending>
      );
    }
    return (
      <Shell>
        <div className="grid justify-items-start gap-3">
          <FormMessage>{message(state.error)}</FormMessage>
          <Button variant="secondary" onClick={reload}>
            {t.retry}
          </Button>
        </div>
      </Shell>
    );
  }

  const preferences = state.data;
  const isAdmin = role === 'org_admin';

  async function save(autoDebit: boolean) {
    if (busy) return;
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const next = await updateBillingPreferences(autoDebit);
      set(next);
      setConfirming(false);
      setNotice(next.autoDebit ? t.enabled : t.disabled);
    } catch (caught) {
      setError(
        caught instanceof ApiError && caught.code === 'BILLING_NOT_ORGANIZATION_ADMIN'
          ? t.preferencesAdminOnly
          : message(caught),
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <Shell>
      <div className="flex flex-wrap items-center gap-3">
        <span className="text-ink font-semibold">{t.autoDebitLabel}</span>
        <Badge tone={preferences.autoDebit ? 'success' : 'neutral'} dot>
          {preferences.autoDebit ? t.autoDebitOn : t.autoDebitOff}
        </Badge>
      </div>
      {preferences.updatedAt ? (
        <p className="text-small text-ink-muted">
          {t.preferencesUpdated(formatDateTime(preferences.updatedAt))}
        </p>
      ) : null}
      <FormMessage tone="success">{notice}</FormMessage>
      {!isAdmin ? (
        // Rôle pas encore lu : rien ; membre ou lecteur : le réglage est réservé à l'administrateur.
        role === 'unknown' ? null : (
          <p className="text-small text-ink-muted">{t.preferencesAdminOnly}</p>
        )
      ) : confirming ? (
        <div className="rounded-control border-line bg-surface-muted grid gap-3 border p-4">
          <p ref={heading} tabIndex={-1} className="text-ink font-semibold focus:outline-none">
            {t.confirmEnableTitle}
          </p>
          <p className="text-small text-ink-muted">{t.confirmEnableText}</p>
          <div className="flex flex-wrap gap-3">
            <Button
              variant="action"
              onClick={() => void save(true)}
              disabled={busy}
              aria-busy={busy || undefined}
            >
              {busy ? t.saving : t.confirmEnable}
            </Button>
            <Button variant="ghost" onClick={() => setConfirming(false)} disabled={busy}>
              {t.cancel}
            </Button>
          </div>
        </div>
      ) : (
        <Button
          variant={preferences.autoDebit ? 'secondary' : 'action'}
          className="justify-self-start"
          disabled={busy}
          aria-busy={busy || undefined}
          // Activer demande une confirmation (l'argent part sans autre validation) ; couper, non.
          onClick={() => (preferences.autoDebit ? void save(false) : setConfirming(true))}
        >
          {busy ? t.saving : preferences.autoDebit ? t.disable : t.enable}
        </Button>
      )}
      <FormMessage>{error}</FormMessage>
    </Shell>
  );
}

/**
 * « Prélèvement automatique » dans la fiche d'un compte entreprise (R-PE-04). La gateway lit les
 * préférences de l'organisation **active** : sur la fiche d'une autre entreprise, on invite à l'utiliser.
 * Route pas encore servie : « Bientôt disponible ».
 */
export function BillingPreferences({ organizationId }: { organizationId: string }) {
  const session = useSession();
  if (session?.activeContext.organizationId !== organizationId) {
    return (
      <Shell>
        <p className="text-small text-ink-muted">{t.preferencesNotInUse}</p>
      </Shell>
    );
  }
  return <Preferences key={contextKey(session) ?? 'none'} />;
}
