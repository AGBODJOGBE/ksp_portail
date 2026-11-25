import type { Metadata } from 'next';
import { LinkSheetFrame } from '@/components/ui/link-sheet';
import { DEBTOR_META_TITLE, DebtorSpace } from '@/features/recovery';

/*
 * Lien personnel d'un débiteur sans compte (ADR-061, `<RECOVERY_DEBTOR_BASE_URL>/<jeton>`), envoyé par
 * WhatsApp, SMS ou e-mail. Page publique : aucune garde de session, jamais de redirection vers la
 * connexion. Rendue à chaque requête (le jeton n'est connu qu'à l'appel), jamais mise en cache ; l'espace
 * est rendu par le navigateur. `no-referrer` : le jeton ne part vers aucun autre site (aussi en en-tête,
 * `next.config.ts`). La vitrine `/recouvrement` reste une page statique distincte.
 */
export const metadata: Metadata = {
  title: DEBTOR_META_TITLE,
  robots: { index: false, follow: false },
  referrer: 'no-referrer',
};

export default async function DebtorLinkPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  return (
    <LinkSheetFrame>
      <DebtorSpace token={token} />
    </LinkSheetFrame>
  );
}
