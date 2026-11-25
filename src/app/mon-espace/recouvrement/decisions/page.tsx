import { Suspense } from 'react';
import { BandHeader, BandTitle } from '@/components/ui/band-header';
import { DecisionList, decisionTexts as t, recoveryPaths, recoveryTexts } from '@/features/recovery';
import { ContextSwitcher, OrganizationContextFromSearch } from '@/features/identity';

const back = { href: recoveryPaths.space, label: t.back };

/**
 * Décisions du créancier : celles qui attendent une réponse d'abord. L'organisation d'un lien
 * (`?organisation=`) est lue dans l'adresse sous Suspense : la page reste statique.
 */
export default function DecisionsPage() {
  return (
    <div className="grid gap-10">
      <BandHeader>
        <BandTitle
          back={back}
          eyebrow={recoveryTexts.title}
          title={t.listTitle}
          lead={t.listLead}
          aside={<ContextSwitcher />}
        />
      </BandHeader>
      <Suspense fallback={<p className="text-ink-muted">{t.loading}</p>}>
        <OrganizationContextFromSearch back={back}>
          <DecisionList />
        </OrganizationContextFromSearch>
      </Suspense>
    </div>
  );
}
