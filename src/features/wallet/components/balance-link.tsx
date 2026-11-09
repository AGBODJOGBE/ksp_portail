'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { buttonClasses } from '@/components/ui/button';
import { contextKey, useSession } from '@/lib/api';
import { formatXof } from '@/lib/format';
import { getWallet } from '@/features/wallet/api';
import { walletPaths } from '@/features/wallet/paths';
import type { Money } from '@/features/wallet/schemas';

/** Libellé écrit ici : l'accueil de Mon espace ne télécharge pas les textes du portefeuille. */
const LABEL = 'Portefeuille';

function Balance() {
  const [balance, setBalance] = useState<Money | null>(null);

  useEffect(() => {
    let active = true;
    getWallet().then(
      (wallet) => {
        if (active) setBalance(wallet.prepaid?.balance ?? { amount: 0, currency: 'XOF' });
      },
      () => undefined,
    );
    return () => {
      active = false;
    };
  }, []);

  return (
    <Link
      href={walletPaths.home}
      className={buttonClasses({ variant: 'secondary' })}
      aria-label={balance ? `${LABEL} — solde ${formatXof(balance)}` : LABEL}
    >
      <span>{LABEL}</span>
      {balance ? (
        <span className="text-action-ink font-semibold tabular-nums">{formatXof(balance)}</span>
      ) : null}
    </Link>
  );
}

/**
 * Pastille du solde prépayé sur l'accueil de Mon espace, lue à l'affichage pour le compte actif. Une panne
 * de lecture n'affiche pas de montant : le lien reste utilisable.
 */
export function WalletBalanceLink() {
  const key = contextKey(useSession()) ?? 'none';
  return <Balance key={key} />;
}
