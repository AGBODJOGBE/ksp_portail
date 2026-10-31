'use client';

import { useState } from 'react';
import { session } from '@/lib/api';
import { switchContext } from '@/features/identity/api';
import { describeAccountError } from '@/features/identity/account-errors';

/**
 * Change le contexte actif (ADR-027) : la gateway renvoie un nouveau jeton d'accès, mis dans la session.
 * Les listes de l'espace, qui suivent la clé du contexte (`contextKey`), se relisent d'elles-mêmes.
 */
export function useSwitchContext() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function switchTo(organizationId: string | null): Promise<boolean> {
    if (busy) return false;
    setBusy(true);
    setError(null);
    try {
      session.switchContext(await switchContext(organizationId));
      return true;
    } catch (caught) {
      setError(describeAccountError(caught).message);
      return false;
    } finally {
      setBusy(false);
    }
  }

  return { busy, error, switchTo };
}
