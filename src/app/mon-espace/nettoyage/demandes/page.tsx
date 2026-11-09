import { navigation } from '@/config/navigation';
import { BandHeader, BandTitle } from '@/components/ui/band-header';
import { CleaningSpace, cleaningTexts } from '@/features/cleaning';
import { ContextSwitcher } from '@/features/identity';

const t = cleaningTexts.space;

/** Liste des demandes de devis et des missions de nettoyage du client. */
export default function CleaningRequestsPage() {
  return (
    <div className="grid gap-10">
      <BandHeader>
        <BandTitle
          back={{ href: navigation.account.href, label: navigation.account.label }}
          title={t.title}
          lead={t.lead}
        >
          <ContextSwitcher />
        </BandTitle>
      </BandHeader>
      <CleaningSpace />
    </div>
  );
}
