import { Suspense } from 'react';
import { BandHeader, BandTitle } from '@/components/ui/band-header';
import { ProgramList, cleaningPaths, cleaningTexts } from '@/features/cleaning';
import { ContextSwitcher } from '@/features/identity';

const t = cleaningTexts.space;

/** « Mes programmes » : le filtre par état est lu dans l'adresse sous Suspense (page statique). */
export default function ProgramsPage() {
  return (
    <div className="grid gap-10">
      <BandHeader>
        <BandTitle
          back={{ href: cleaningPaths.space, label: t.back }}
          eyebrow={t.eyebrow}
          title={t.programsTitle}
          lead={t.programsLead}
          aside={<ContextSwitcher />}
        />
      </BandHeader>
      <Suspense fallback={<p className="text-ink-muted">{t.loading}</p>}>
        <ProgramList />
      </Suspense>
    </div>
  );
}
