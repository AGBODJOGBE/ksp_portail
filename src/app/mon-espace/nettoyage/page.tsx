import { BandHeader, BandTitle } from '@/components/ui/band-header';
import { ButtonLink } from '@/components/ui/button';
import { navigation } from '@/config/navigation';
import { CleaningHome, cleaningPaths, cleaningTexts } from '@/features/cleaning';
import { ContextSwitcher } from '@/features/identity';

const t = cleaningTexts.space;

/** Tableau du Nettoyage : ce qui attend le client, dernières demandes, lieux. */
export default function CleaningSpacePage() {
  return (
    <div className="grid gap-10">
      <BandHeader>
        <BandTitle
          back={{ href: navigation.account.href, label: navigation.account.label }}
          eyebrow={t.eyebrow}
          title={t.title}
          lead={t.lead}
          aside={<ContextSwitcher />}
        >
          <ButtonLink href={cleaningPaths.request} variant="action" size="lg" className="justify-self-start">
            {t.newRequest}
          </ButtonLink>
        </BandTitle>
      </BandHeader>
      <CleaningHome />
    </div>
  );
}
