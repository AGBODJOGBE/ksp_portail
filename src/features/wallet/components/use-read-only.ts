'use client';

import { useEffect, useState } from 'react';
import { useSession } from '@/lib/api';
import { getOrganizationRole } from '@/features/wallet/api';

/**
 * Membre lecteur (`org_viewer`) de l'organisation active : il voit le portefeuille de l'entreprise mais ne
 * le recharge pas et ne paie pas avec (ADR-046). Contexte personnel, ou rôle illisible : false, et la
 * gateway reste juge (`AUTH_FORBIDDEN`).
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
