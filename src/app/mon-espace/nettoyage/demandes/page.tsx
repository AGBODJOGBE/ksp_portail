import { Heading } from '@/components/ui/heading';
import { CleaningSpace, cleaningTexts } from '@/features/cleaning';
import { ContextSwitcher } from '@/features/identity';

const t = cleaningTexts.space;

/** Liste des demandes de devis et des missions de nettoyage du client. */
export default function CleaningRequestsPage() {
  return (
    <div className="grid gap-10">
      <div>
        <Heading as="h1" size="h1">
          {t.title}
        </Heading>
        <p className="text-ink-muted mt-3">{t.lead}</p>
        <ContextSwitcher className="mt-5" />
      </div>
      <CleaningSpace />
    </div>
  );
}
