import { Suspense } from 'react';
import { BandHeader, BandTitle } from '@/components/ui/band-header';
import { ClaimList, cleaningPaths, cleaningTexts } from '@/features/cleaning';
import { ContextSwitcher } from '@/features/identity';

const t = cleaningTexts.space;

/** « Mes réclamations » : le filtre par état est lu dans l'adresse sous Suspense (page statique). */
export default function ClaimsPage() {
  return (
    <div className="grid gap-10">
      <BandHeader>
        <BandTitle
          back={{ href: cleaningPaths.space, label: t.back }}
          eyebrow={t.eyebrow}
          title={t.claimsTitle}
          lead={t.claimsLead}
          aside={<ContextSwitcher />}
        />
      </BandHeader>
      <Suspense fallback={<p className="text-ink-muted">{t.loading}</p>}>
        <ClaimList />
      </Suspense>
    </div>
  );
}
