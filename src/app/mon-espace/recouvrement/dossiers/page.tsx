import { Suspense } from 'react';
import { BandHeader, BandTitle } from '@/components/ui/band-header';
import { ButtonLink } from '@/components/ui/button';
import { CaseList, recoveryPaths, recoveryTexts, spaceTexts as t } from '@/features/recovery';
import { ContextSwitcher, OrganizationContextFromSearch } from '@/features/identity';

const back = { href: recoveryPaths.space, label: t.title };

/**
 * « Mes dossiers » : filtres et recherche dans l'adresse, lus sous Suspense (page statique), comme
 * l'organisation d'un lien (`?organisation=`).
 */
export default function CasesPage() {
  return (
    <div className="grid gap-10">
      <BandHeader>
        <BandTitle
          back={back}
          eyebrow={recoveryTexts.title}
          title={t.listTitle}
          lead={t.listLead}
          aside={<ContextSwitcher />}
        >
          <ButtonLink href={recoveryPaths.newCase} variant="action" className="justify-self-start">
            {t.newCase}
          </ButtonLink>
        </BandTitle>
      </BandHeader>
      <Suspense fallback={<p className="text-ink-muted">{t.loading}</p>}>
        <OrganizationContextFromSearch back={back}>
          <CaseList />
        </OrganizationContextFromSearch>
      </Suspense>
    </div>
  );
}
