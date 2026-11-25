import { Suspense } from 'react';
import { BandHeader, BandTitle } from '@/components/ui/band-header';
import { ImportStart, importTexts as t, recoveryPaths, recoveryTexts } from '@/features/recovery';
import { ContextSwitcher, OrganizationContextFromSearch } from '@/features/identity';

const back = { href: recoveryPaths.space, label: t.back };

/**
 * Import d'un tableur : modèle, vérification dans le navigateur, envoi. Les brouillons sont créés au nom du
 * compte actif, choisi ici.
 */
export default function ImportPage() {
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
          <ImportStart />
        </OrganizationContextFromSearch>
      </Suspense>
    </div>
  );
}
