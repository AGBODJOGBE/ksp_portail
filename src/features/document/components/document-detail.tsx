'use client';

import { useCallback, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { BandBack, BandHeader } from '@/components/ui/band-header';
import { Button } from '@/components/ui/button';
import { FormMessage } from '@/components/ui/field';
import { Heading } from '@/components/ui/heading';
import { IconCheck } from '@/components/ui/icons';
import { LinkSheetFacts, LinkSheetOutcome } from '@/components/ui/link-sheet';
import { Skeleton } from '@/components/ui/skeleton';
import { formatDateTime } from '@/lib/format';
import { useResource } from '@/lib/use-resource';
import { getDocument, getDownloadUrl, sendSignatureCode, signDocument } from '@/features/document/api';
import { describeDocumentError } from '@/features/document/logic';
import type { KspDocument } from '@/features/document/schemas';
import { documentStatus, documentTexts as t } from '@/features/document/texts';
import { ReadDocument } from './read-document';
import { SigningSteps } from './signing-steps';

const CARD = 'rounded-card border-line bg-surface grid gap-5 border p-5 shadow-xs sm:p-6';
const HOME = '/mon-espace';

function Fingerprint({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid gap-1">
      <dt className="text-small text-ink-muted">{label}</dt>
      <dd className="text-ink bg-surface-muted rounded-control px-3 py-2 font-mono text-sm break-all">
        {value}
      </dd>
    </div>
  );
}

/**
 * Document de « Mon espace KSP » (`/mon-espace/documents/[id]`, ADR-044), ouvert par le lien d'une
 * notification (il n'existe pas de liste) : titre, numéro, état, signataire. Le signataire attendu
 * (`canSign`) signe ici par code ; sinon lecture seule, avec les empreintes SHA-256.
 */
export function DocumentDetail({ id }: { id: string }) {
  const { state, reload, refresh, set } = useResource(useCallback(() => getDocument(id), [id]));
  const [signedNow, setSignedNow] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const freshUrl = useCallback(async () => (await getDownloadUrl(id)).url, [id]);

  if (state.status === 'loading') {
    return (
      <div role="status" className="grid gap-8">
        <span className="sr-only">{t.loading}</span>
        <BandHeader overlap={<Skeleton className="rounded-card h-40" />}>
          <div className="grid gap-3" aria-hidden="true">
            <Skeleton className="h-11 w-40" />
            <Skeleton className="h-11 w-2/3 max-w-md" />
          </div>
        </BandHeader>
      </div>
    );
  }
  if (state.status === 'error') {
    const view = describeDocumentError(state.error, t.notFound);
    return (
      <div className="grid gap-8">
        <BandHeader>
          <BandBack href={HOME} label={t.back} />
        </BandHeader>
        <div className={`${CARD} justify-items-start`}>
          <FormMessage>{view.message}</FormMessage>
          {view.kind === 'notFound' || view.kind === 'blocked' ? null : (
            <Button variant="secondary" onClick={reload}>
              {t.retry}
            </Button>
          )}
        </div>
      </div>
    );
  }

  const doc: KspDocument = state.data;
  const status = documentStatus(doc.status);
  const signature = doc.signature;
  const canSign = !!signature?.canSign && signature.status === 'pending';
  const signed = doc.status === 'signed';

  async function sign(code: string) {
    if (!signature) return;
    set(await signDocument(signature.id, code));
    setSignedNow(true);
  }

  return (
    <div className="grid gap-8">
      <BandHeader
        overlap={
          <section aria-label={t.status} className={`${CARD} shadow-float`}>
            <LinkSheetFacts
              rows={[
                [t.status, status.label],
                [t.createdAt, formatDateTime(doc.createdAt)],
                [
                  t.signer,
                  signature ? t.signerOf(signature.signer.displayName, signature.signer.phoneMasked) : null,
                ],
                [t.signBefore, signature?.status === 'pending' ? formatDateTime(signature.expiresAt) : null],
                [t.signedAt, doc.signedAt ? formatDateTime(doc.signedAt) : null],
                [t.cancelledAt, doc.cancelledAt ? formatDateTime(doc.cancelledAt) : null],
              ]}
            />
          </section>
        }
      >
        <BandBack href={HOME} label={t.back} />
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <Badge tone={status.tone} dot>
            {status.label}
          </Badge>
          <span className="text-small text-ink-muted tabular-nums">{t.number(doc.number)}</span>
        </div>
        <Heading as="h1" size="h1" className="mt-3">
          {doc.title}
        </Heading>
      </BandHeader>

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-start">
        {canSign && signature ? (
          <section aria-labelledby="document-signer" className={CARD}>
            <Heading as="h2" size="h3" id="document-signer">
              {t.signTitle}
            </Heading>
            <div className="grid gap-3">
              <p className="text-ink font-semibold">{t.readStep}</p>
              <p className="text-small text-ink-muted">{t.readLead}</p>
              <ReadDocument getUrl={freshUrl} label={t.read} variant="outline" />
            </div>
            <div className="border-line grid gap-3 border-t pt-5">
              <p className="text-ink font-semibold">{t.signStep}</p>
              <FormMessage tone="info">{notice}</FormMessage>
              <SigningSteps
                idPrefix="document-signature"
                phoneMasked={signature.signer.phoneMasked}
                codeExpiresAt={signature.codeExpiresAt}
                requestCode={() => sendSignatureCode(signature.id)}
                sign={sign}
                onClosed={() => {
                  setNotice(t.closedNow);
                  refresh();
                }}
              />
            </div>
          </section>
        ) : (
          <section aria-labelledby="document-lecture" className={CARD}>
            <Heading as="h2" size="h3" id="document-lecture">
              {t.readTitle}
            </Heading>
            {signedNow && signed ? (
              <LinkSheetOutcome tone="success" icon={<IconCheck className="size-6" />} title={t.signedTitle}>
                <p>{t.signedText}</p>
              </LinkSheetOutcome>
            ) : null}
            <FormMessage tone="info">{notice}</FormMessage>
            {signature?.status === 'pending' ? (
              <p className="text-ink-muted">{t.waitingFor(signature.signer.displayName)}</p>
            ) : null}
            <p className="text-small text-ink-muted">{t.readOnlyLead}</p>
            <ReadDocument
              getUrl={freshUrl}
              label={signed ? t.readSigned : t.read}
              variant={signedNow ? 'primary' : 'secondary'}
            />
          </section>
        )}

        <section aria-labelledby="document-empreintes" className={CARD}>
          <Heading as="h2" size="h3" id="document-empreintes">
            {t.fingerprintsTitle}
          </Heading>
          <p className="text-small text-ink-muted">{t.fingerprintsLead}</p>
          <dl className="grid gap-4">
            <Fingerprint label={t.originalFingerprint} value={doc.sha256} />
            {doc.signedSha256 ? <Fingerprint label={t.signedFingerprint} value={doc.signedSha256} /> : null}
          </dl>
        </section>
      </div>
    </div>
  );
}
