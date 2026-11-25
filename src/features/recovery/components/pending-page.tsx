import { BackendPending } from '@/components/ui/backend-pending';
import { BandHeader, BandTitle } from '@/components/ui/band-header';
import { ButtonLink } from '@/components/ui/button';
import { recoveryPaths } from '@/features/recovery/paths';
import { type PendingPage, pendingTexts as t } from '@/features/recovery/pending-texts';

/**
 * Page du Recouvrement qui attend le backend (décisions, relevés, import) : rendue par le serveur, sans
 * JavaScript. Ce qui arrive, quoi faire en attendant, et hors production les routes attendues.
 */
export function RecoveryPendingPage({ id, page }: { id: string; page: PendingPage }) {
  return (
    <div className="grid gap-10">
      <BandHeader>
        <BandTitle
          back={{ href: recoveryPaths.space, label: t.back }}
          eyebrow={page.eyebrow}
          title={page.title}
          lead={page.lead}
        />
      </BandHeader>
      <BackendPending id={id} title={page.pendingTitle} needs={page.needs}>
        {page.pendingText}
      </BackendPending>
      <div className="flex flex-wrap gap-3">
        <ButtonLink href={recoveryPaths.newCase} variant="action">
          {t.newCase}
        </ButtonLink>
        <ButtonLink href={recoveryPaths.support} variant="secondary">
          {t.contact}
        </ButtonLink>
      </div>
    </div>
  );
}
