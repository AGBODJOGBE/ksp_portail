import { navigation } from '@/config/navigation';
import { BandHeader, BandTitle } from '@/components/ui/band-header';
import { IconInvoice, IconRecouvrement } from '@/components/ui/icons';
import { LinkCard } from '@/components/ui/link-card';
import { Suspense } from 'react';
import { InvoiceList, billingTexts, commissionPaths, commissionTexts } from '@/features/billing';
import { ContextSwitcher, OrganizationContextFromSearch } from '@/features/identity';
import { frenchSpacing } from '@/lib/typography';

/**
 * Liste des factures du client (adresse attendue par les notifications de facturation). Le filtre par
 * état et l'organisation du lien (`?organisation=`) sont lus dans l'adresse sous Suspense : la page reste
 * statique. Les factures de commission et les reçus des frais du Recouvrement (ADR-064) sont listés avec
 * l'argent du créancier, dans « Reversements et relevés » : deux raccourcis y mènent, rendus par le serveur.
 */
export default function InvoicesPage() {
  return (
    <div className="grid gap-10">
      <BandHeader>
        <BandTitle
          back={{ href: navigation.account.href, label: navigation.account.label }}
          title={billingTexts.title}
          lead={billingTexts.lead}
        >
          <p className="text-small text-ink-muted">{frenchSpacing(billingTexts.scope)}</p>
          <ContextSwitcher />
        </BandTitle>
      </BandHeader>
      <Suspense
        fallback={
          <p role="status" className="text-ink-muted">
            {billingTexts.loading}
          </p>
        }
      >
        <OrganizationContextFromSearch
          back={{ href: navigation.account.href, label: navigation.account.label }}
        >
          <InvoiceList />
        </OrganizationContextFromSearch>
      </Suspense>
      <section aria-labelledby="factures-recouvrement" className="grid gap-5">
        <h2 id="factures-recouvrement" className="font-display text-h3 text-ink font-semibold">
          {commissionTexts.sectionTitle}
        </h2>
        <ul className="grid gap-4 sm:grid-cols-2">
          <LinkCard
            index={0}
            href={commissionPaths.list}
            title={commissionTexts.listTitle}
            text={frenchSpacing(commissionTexts.listLinkText)}
            icon={<IconInvoice className="size-5" />}
          />
          <LinkCard
            index={1}
            href={commissionPaths.receipts}
            title={commissionTexts.receiptsTitle}
            text={frenchSpacing(commissionTexts.receiptsLinkText)}
            icon={<IconRecouvrement className="size-5" />}
          />
        </ul>
      </section>
    </div>
  );
}
