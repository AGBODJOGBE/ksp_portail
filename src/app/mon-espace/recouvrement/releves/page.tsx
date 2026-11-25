import { Suspense } from 'react';
import { BandHeader, BandTitle } from '@/components/ui/band-header';
import { RecoveryStatements, recoveryPaths, recoveryTexts, statementsTexts as t } from '@/features/recovery';
import { ContextSwitcher, OrganizationContextFromSearch } from '@/features/identity';

const back = { href: recoveryPaths.space, label: t.back };

/**
 * Reversements, relevés mensuels, factures de commission et reçus des frais. L'onglet (`?onglet=`) et
 * l'organisation d'un lien (`?organisation=`) sont lus dans l'adresse sous Suspense : la page reste
 * statique.
 */
export default function StatementsPage() {
  return (
    <div className="grid gap-10">
      <BandHeader>
        <BandTitle
          back={back}
          eyebrow={recoveryTexts.title}
          title={t.title}
          lead={t.lead}
          aside={<ContextSwitcher />}
        />
      </BandHeader>
      <Suspense fallback={<p className="text-ink-muted">{t.loading}</p>}>
        <OrganizationContextFromSearch back={back}>
          <RecoveryStatements />
        </OrganizationContextFromSearch>
      </Suspense>
    </div>
  );
}
