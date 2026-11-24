'use client';

import { useEffect, useState } from 'react';
import { useSession } from '@/lib/api';
import { getOrganizationRole } from '@/features/identity/api';

/**
 * Rôle dans le contexte actif : `personal` (compte personnel), le rôle de l'organisation active
 * (`org_viewer`, `org_member`, `org_admin`), ou `unknown` tant qu'il n'est pas lu (ou s'il est illisible).
 * Le front s'en sert pour masquer ou expliquer une action ; la gateway reste seule juge (`AUTH_FORBIDDEN`).
 * Rôle relu à chaque changement de contexte.
 */
export type OrganizationRole =
  'personal' | 'unknown' | 'org_viewer' | 'org_member' | 'org_admin' | (string & {});

export function useOrganizationRole(): OrganizationRole {
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

  if (!organizationId) return 'personal';
  return role?.organizationId === organizationId ? role.role : 'unknown';
}

/**
 * Membre lecteur (`org_viewer`) de l'organisation active : il voit les dossiers de l'entreprise (demandes et
 * programmes du Nettoyage, portefeuille, ADR-046 et ADR-049 §3) mais n'accepte, ne refuse, n'annule, ne
 * recharge ni ne paie. Le front masque ces actions ; la gateway reste seule juge (`AUTH_FORBIDDEN`).
 * Contexte personnel, ou rôle illisible : false. Rôle relu à chaque changement de contexte.
 */
export function useReadOnly(): boolean {
  return useOrganizationRole() === 'org_viewer';
}
