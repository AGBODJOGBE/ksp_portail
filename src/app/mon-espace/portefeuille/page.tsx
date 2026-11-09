import { Heading } from '@/components/ui/heading';
import { ContextSwitcher } from '@/features/identity';
import { WalletSpace, walletTexts } from '@/features/wallet';
import { frenchSpacing } from '@/lib/typography';

/** Portefeuille prépayé du compte actif (ADR-046) : solde, recharge par Mobile Money, relevé. */
export default function WalletPage() {
  return (
    <div className="grid gap-10">
      <div>
        <Heading as="h1" size="h1">
          {walletTexts.title}
        </Heading>
        <p className="text-ink-muted max-w-reading mt-3">{frenchSpacing(walletTexts.lead)}</p>
        <p className="text-small text-ink-muted mt-2">{frenchSpacing(walletTexts.scope)}</p>
        <ContextSwitcher className="mt-5" />
      </div>
      <WalletSpace />
    </div>
  );
}
