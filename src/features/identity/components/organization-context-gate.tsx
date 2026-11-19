'use client';

import Link from 'next/link';
import { type ReactNode, useEffect, useState } from 'react';
import { BandBack, BandHeader } from '@/components/ui/band-header';
import { Button } from '@/components/ui/button';
import { FormMessage } from '@/components/ui/field';
import { Heading } from '@/components/ui/heading';
import { Skeleton } from '@/components/ui/skeleton';
import { ApiError, session, useSession } from '@/lib/api';
import { switchContext } from '@/features/identity/api';
import { describeAccountError } from '@/features/identity/account-errors';
import { accountTexts, identityPaths } from '@/features/identity/texts';

const t = accountTexts.contextLink;

type Phase =
  | { kind: 'switching' }
  | { kind: 'switched'; label: string }
  | { kind: 'refused'; title: string; message: string; retry: boolean };

/** Refus du changement de contexte (`POST /identity/context`) : la gateway juge l'appartenance. */
function refusal(error: unknown): Extract<Phase, { kind: 'refused' }> {
  if (error instanceof ApiError && error.code === 'IDENTITY_ORGANIZATION_NOT_FOUND') {
    return { kind: 'refused', title: t.notMemberTitle, message: t.notMember, retry: false };
  }
  if (error instanceof ApiError && error.code === 'IDENTITY_ORGANIZATION_NOT_ACTIVE') {
    return { kind: 'refused', title: t.unavailableTitle, message: error.message, retry: false };
  }
  return { kind: 'refused', title: t.errorTitle, message: describeAccountError(error).message, retry: true };
}

export interface OrganizationContextGateProps {
  /** Organisation du dossier, lue dans le lien (`?organisation=`). */
  organizationId: string;
  /** Écran de repli quand le dossier ne peut pas être ouvert (liste des factures, des prestations). */
  back: { href: string; label: string };
  children: ReactNode;
}

/**
 * Dossier d'une organisation ouvert par un lien (`?organisation=<id>`, ADR-050 §8, ADR-049 §3) : la
 * gateway ne le montre que dans le contexte actif de cette organisation (404 sinon). Si le contexte actif
 * est différent, il est changé une fois (`POST /identity/context`) avant d'afficher le dossier ; la gateway
 * refuse un non-membre ou une organisation inactive, et la page le dit sans se casser. Un changement de
 * compte fait ensuite par le client n'est pas annulé.
 */
export function OrganizationContextGate({ organizationId, back, children }: OrganizationContextGateProps) {
  const active = useSession()?.activeContext.organizationId ?? null;
  // Décidé à l'ouverture seulement : le client peut ensuite changer de compte librement.
  const [needed] = useState(() => active !== organizationId);
  const [phase, setPhase] = useState<Phase>({ kind: 'switching' });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!needed) return;
    let current = true;
    switchContext(organizationId).then(
      (response) => {
        if (!current) return;
        session.switchContext(response);
        setPhase({
          kind: 'switched',
          label: accountTexts.context.business(response.activeContext.organizationName ?? null),
        });
      },
      (error: unknown) => {
        if (current) setPhase(refusal(error));
      },
    );
    return () => {
      current = false;
    };
  }, [needed, organizationId, attempt]);

  if (!needed) return children;

  if (phase.kind === 'switching') {
    return (
      <div role="status" className="grid gap-8">
        <span className="sr-only">{t.switching}</span>
        <BandHeader overlap={<Skeleton className="rounded-card h-28" />}>
          <div className="grid gap-3" aria-hidden="true">
            <Skeleton className="h-11 w-48" />
            <Skeleton className="h-11 w-2/3 max-w-md" />
          </div>
        </BandHeader>
        <Skeleton className="rounded-card h-56" />
      </div>
    );
  }

  if (phase.kind === 'refused') {
    return (
      <div className="grid gap-8">
        <BandHeader>
          <BandBack {...back} />
          <Heading as="h1" size="h1" className="mt-3">
            {phase.title}
          </Heading>
        </BandHeader>
        <div className="rounded-card border-line bg-surface grid justify-items-start gap-4 border p-5 shadow-xs sm:p-6">
          {/* Refus de la gateway (non-membre, entreprise inactive) : information ; panne : erreur. */}
          <FormMessage tone={phase.retry ? 'error' : 'info'}>{phase.message}</FormMessage>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-5">
            {phase.retry ? (
              <Button
                variant="secondary"
                onClick={() => {
                  setPhase({ kind: 'switching' });
                  setAttempt((value) => value + 1);
                }}
              >
                {accountTexts.common.retry}
              </Button>
            ) : null}
            <Link
              href={identityPaths.organizations}
              className="text-brand-ink inline-flex min-h-11 items-center font-semibold underline underline-offset-4 hover:no-underline"
            >
              {t.manageLink}
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Marge plus grande que le débord de la bande de l'écran (`BandHeader`), qui remonte au-dessus de lui. */}
      <FormMessage tone="info" className="mb-10 sm:mb-12">
        {accountTexts.context.switched(phase.label)}
      </FormMessage>
      {children}
    </>
  );
}
