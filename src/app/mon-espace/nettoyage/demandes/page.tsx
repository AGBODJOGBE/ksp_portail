import { Suspense } from 'react';
import { BandHeader, BandTitle } from '@/components/ui/band-header';
import { ButtonLink } from '@/components/ui/button';
import { RequestList, cleaningPaths, cleaningTexts, listTexts as t } from '@/features/cleaning';
import { ContextSwitcher } from '@/features/identity';

/** « Mes demandes de devis » : le filtre par état est lu dans l'adresse sous Suspense (page statique). */
export default function RequestsPage() {
  return (
    <div className="grid gap-10">
      <BandHeader>
        <BandTitle
          back={{ href: cleaningPaths.space, label: cleaningTexts.space.back }}
          eyebrow={cleaningTexts.space.eyebrow}
          title={t.title}
          lead={t.lead}
          aside={<ContextSwitcher />}
        >
          <ButtonLink href={cleaningPaths.request} variant="action" className="justify-self-start">
            {t.newRequest}
          </ButtonLink>
        </BandTitle>
      </BandHeader>
      <Suspense fallback={<p className="text-ink-muted">{t.loading}</p>}>
        <RequestList />
      </Suspense>
    </div>
  );
}
