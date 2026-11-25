import { Suspense } from 'react';
import { BandHeader, BandTitle } from '@/components/ui/band-header';
import { ButtonLink } from '@/components/ui/button';
import { navigation } from '@/config/navigation';
import { RecoveryHome, recoveryPaths, recoveryTexts, spaceTexts as t } from '@/features/recovery';
import { ContextSwitcher, OrganizationContextFromSearch } from '@/features/identity';

const back = { href: navigation.account.href, label: navigation.account.label };

/**
 * Tableau de bord du Recouvrement : ce qui attend le créancier, ses chiffres, ses dossiers. L'organisation
 * d'un lien (`?organisation=`) est lue dans l'adresse sous Suspense : la page reste statique.
 */
export default function RecoverySpacePage() {
  return (
    <div className="grid gap-10">
      <BandHeader>
        <BandTitle
          back={back}
          eyebrow={recoveryTexts.title}
          title={t.title}
          lead={t.lead}
          aside={<ContextSwitcher />}
        >
          <ButtonLink href={recoveryPaths.newCase} variant="action" size="lg" className="justify-self-start">
            {t.newCase}
          </ButtonLink>
        </BandTitle>
      </BandHeader>
      <Suspense fallback={<p className="text-ink-muted">{t.loading}</p>}>
        <OrganizationContextFromSearch back={back}>
          <RecoveryHome />
        </OrganizationContextFromSearch>
      </Suspense>
    </div>
  );
}
