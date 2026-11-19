'use client';

import { useEffect, useState } from 'react';
import { useSession } from '@/lib/api';
import { getOrganizationRole } from '@/features/cleaning/api';

/**
 * Membre lecteur (`org_viewer`) de l'organisation active (ADR-049 §3) : il voit les demandes et missions
 * de l'entreprise mais n'accepte, ne refuse, n'annule ni ne paie. Même mécanisme que le portefeuille.
 * Contexte personnel, ou rôle illisible : false, et la gateway reste juge (`AUTH_FORBIDDEN`).
 */
export function useReadOnly(): boolean {
  const organizationId = useSession()?.activeContext.organizationId ?? null;
  const [role, setRole] = useState<{ organizationId: string; role: string } | null>(null);

  useEffect(() => {
    if (!organizationId) return;
    let active = true;
    getOrganizationRole(organizationId).then(
      (value) => {
        if (active) setRole({ organizationId, role: value });
      },
      () => undefined,
    );
    return () => {
      active = false;
    };
  }, [organizationId]);

  return !!organizationId && role?.organizationId === organizationId && role.role === 'org_viewer';
}
