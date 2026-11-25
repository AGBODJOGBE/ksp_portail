'use client';

import { useCallback, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { FormMessage } from '@/components/ui/field';
import { IconCheck } from '@/components/ui/icons';
import { LinkSheetOutcome } from '@/components/ui/link-sheet';
import { SkeletonCards } from '@/components/ui/skeleton';
import { useResource } from '@/lib/use-resource';
import { getDocument, getDownloadUrl, sendSignatureCode, signDocument } from '@/features/document/api';
import { describeDocumentError } from '@/features/document/logic';
import { documentTexts as t } from '@/features/document/texts';
import { ReadDocument } from './read-document';
import { SigningSteps } from './signing-steps';

/**
 * Signature d'un document dans l'écran d'un autre service (mandat du Recouvrement) : le document est lu
 * (`GET /document/documents/{id}`), puis, pour le signataire attendu (`signature.canSign`), lecture du PDF
 * et signature par code (`SigningSteps`, code déjà envoyé à la préparation : saisie directe). Un autre
 * membre voit « En attente de la signature de … » ; s'il ne peut pas lire le document (403, 404), le texte
 * `waiting` de l'appelant le remplace. Document signé (ici ou ailleurs) : `onSigned`, une fois.
 */
export function DocumentSigning({
  documentId,
  idPrefix,
  waiting,
  onSigned,
}: {
  documentId: string;
  idPrefix: string;
  /** Texte montré quand le document n'est pas lisible par ce compte (signataire différent). */
  waiting: string;
  onSigned: () => void;
}) {
  const { state, reload, refresh, set } = useResource(
    useCallback(() => getDocument(documentId), [documentId]),
  );
  const freshUrl = useCallback(async () => (await getDownloadUrl(documentId)).url, [documentId]);
  const signedOnce = useRef(false);
  const signed = state.status === 'ready' && state.data.status === 'signed';

  useEffect(() => {
    if (signed && !signedOnce.current) {
      signedOnce.current = true;
      onSigned();
    }
  }, [signed, onSigned]);

  if (state.status === 'loading') return <SkeletonCards label={t.loading} rows={1} />;
  if (state.status === 'error') {
    const view = describeDocumentError(state.error);
    if (view.kind === 'notFound' || view.kind === 'blocked') {
      return <p className="text-ink-muted">{waiting}</p>;
    }
    return (
      <div className="grid justify-items-start gap-3">
        <FormMessage>{view.message}</FormMessage>
        <Button variant="secondary" onClick={reload}>
          {t.retry}
        </Button>
      </div>
    );
  }

  const doc = state.data;
  const signature = doc.signature;
  if (doc.status === 'signed') {
    return (
      <div className="grid gap-4">
        <LinkSheetOutcome tone="success" icon={<IconCheck className="size-6" />} title={t.signedTitle}>
          <p>{t.signedText}</p>
        </LinkSheetOutcome>
        <ReadDocument getUrl={freshUrl} label={t.readSigned} variant="secondary" />
      </div>
    );
  }
  if (doc.status === 'expired' || doc.status === 'cancelled' || !signature) {
    const expired = doc.status !== 'cancelled';
    return (
      <div className="grid gap-2">
        <p className="text-ink font-semibold">{expired ? t.expiredTitle : t.cancelledTitle}</p>
        <p className="text-small text-ink-muted">{expired ? t.expiredText : t.cancelledText}</p>
      </div>
    );
  }
  if (!signature.canSign || signature.status !== 'pending') {
    return (
      <div className="grid gap-3">
        <p className="text-ink-muted">{t.waitingFor(signature.signer.displayName)}</p>
        <ReadDocument getUrl={freshUrl} label={t.read} variant="secondary" />
      </div>
    );
  }

  async function sign(code: string) {
    if (!signature) return;
    set(await signDocument(signature.id, code));
  }

  return (
    <div className="grid gap-5">
      <div className="grid gap-3">
        <p className="text-ink font-semibold">{t.readStep}</p>
        <p className="text-small text-ink-muted">{t.readLead}</p>
        <ReadDocument getUrl={freshUrl} label={t.read} variant="outline" />
      </div>
      <div className="border-line grid gap-3 border-t pt-5">
        <p className="text-ink font-semibold">{t.signStep}</p>
        <SigningSteps
          idPrefix={idPrefix}
          phoneMasked={signature.signer.phoneMasked}
          codeExpiresAt={signature.codeExpiresAt}
          requestCode={() => sendSignatureCode(signature.id)}
          sign={sign}
          onClosed={refresh}
        />
      </div>
    </div>
  );
}
