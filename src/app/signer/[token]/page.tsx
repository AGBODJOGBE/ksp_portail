import type { Metadata } from 'next';
import { LinkSheetFrame } from '@/components/ui/link-sheet';
import { PublicSigning, documentTexts } from '@/features/document';

/*
 * Lien personnel de signature envoyé par WhatsApp ou e-mail à un signataire sans compte (ADR-044,
 * `<PORTAL_BASE_URL>/signer/<jeton>`). Page publique : aucune garde de session, jamais de redirection vers
 * la connexion. Rendue à chaque requête, jamais mise en cache ; le document est lu par le navigateur.
 * `no-referrer` : le jeton ne part pas vers le stockage du PDF ni ailleurs (aussi en en-tête).
 */
export const metadata: Metadata = {
  title: documentTexts.metaTitle,
  robots: { index: false, follow: false },
  referrer: 'no-referrer',
};

export default async function SigningPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  return (
    <LinkSheetFrame>
      <PublicSigning token={token} />
    </LinkSheetFrame>
  );
}
