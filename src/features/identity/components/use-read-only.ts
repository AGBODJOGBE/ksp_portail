'use client';

import { useEffect, useState } from 'react';
import { useSession } from '@/lib/api';
import { getOrganizationRole } from '@/features/identity/api';

/**
 * Membre lecteur (`org_viewer`) de l'organisation active : il voit les dossiers de l'entreprise (demandes et
 * missions du Nettoyage, portefeuille, ADR-046 et ADR-049 §3) mais n'accepte, ne refuse, n'annule, ne
 * recharge ni ne paie. Le front masque ces actions ; la gateway reste seule juge (`AUTH_FORBIDDEN`).
 * Contexte personnel, ou rôle illisible : false. Rôle relu à chaque changement de contexte.
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
