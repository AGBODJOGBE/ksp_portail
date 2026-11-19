'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { FormMessage } from '@/components/ui/field';
import { IconAlert, IconCheck, IconHeadset, IconPen } from '@/components/ui/icons';
import {
  LinkSheet,
  LinkSheetEyebrow,
  LinkSheetFacts,
  LinkSheetOutcome,
  LinkSheetSection,
  LinkSheetSkeleton,
  LinkSheetTrust,
} from '@/components/ui/link-sheet';
import { contactHref } from '@/config/navigation';
import { formatDateTime } from '@/lib/format';
import { getSigningSession, sendSigningCode, signWithLink } from '@/features/document/api';
import { type DocumentErrorView, describeDocumentError, isSigningToken } from '@/features/document/logic';
import type { SigningSession } from '@/features/document/schemas';
import { documentTexts as t, signatureStatus } from '@/features/document/texts';
import { ReadDocument } from './read-document';
import { SigningSteps } from './signing-steps';

/** Ce que l'écran garde du lien : tout, sauf l'adresse de lecture du PDF (redemandée à chaque clic). */
type Signing = Omit<SigningSession, 'download'> & { readable: boolean };

function keep(session: SigningSession): Signing {
  const { download, ...rest } = session;
  return { ...rest, readable: download !== null };
}

type View =
  | { status: 'loading' }
  | { status: 'error'; error: DocumentErrorView }
  | { status: 'ready'; signing: Signing; notice: string | null };

const NOT_FOUND: DocumentErrorView = { message: t.notFoundText, kind: 'notFound' };

function Help() {
  return (
    <div className="grid gap-5">
      <LinkSheetTrust title={t.trustTitle} items={t.trust} />
      <p className="text-small px-1">
        <Link
          href={contactHref('signature')}
          className="text-ink inline-flex min-h-11 items-center gap-1.5 font-semibold underline-offset-4 hover:underline"
        >
          <IconHeadset className="size-4" />
          {t.contactSupport}
        </Link>
      </p>
    </div>
  );
}

function StepTitle({ number, children }: { number: number; children: string }) {
  return (
    <h2 className="font-display text-ink flex items-center gap-3 text-lg font-semibold">
      <span
        aria-hidden="true"
        className="bg-brand text-on-brand grid size-7 shrink-0 place-items-center rounded-full text-sm"
      >
        {number}
      </span>
      <span>
        <span className="sr-only">{`Étape ${number} : `}</span>
        {children}
      </span>
    </h2>
  );
}

/**
 * Page publique d'un lien de signature (`/signer/[token]`, ADR-044), pour un signataire **sans compte** :
 * titre, numéro, signataire (téléphone masqué), échéance, lecture du PDF, code reçu, accord et signature,
 * confirmation. Aucune session ; ni le jeton, ni le code, ni l'adresse du PDF ne sont gardés.
 */
export function PublicSigning({ token }: { token: string }) {
  const valid = isSigningToken(token);
  const [view, setView] = useState<View>(
    valid ? { status: 'loading' } : { status: 'error', error: NOT_FOUND },
  );
  const [round, setRound] = useState(0);

  useEffect(() => {
    if (!valid) return;
    let active = true;
    getSigningSession(token).then(
      (session) => {
        if (active)
          setView((previous) => ({
            status: 'ready',
            signing: keep(session),
            notice: previous.status === 'ready' ? previous.notice : null,
          }));
      },
      (caught: unknown) => {
        if (active) setView({ status: 'error', error: describeDocumentError(caught) });
      },
    );
    return () => {
      active = false;
    };
  }, [token, valid, round]);

  const reload = () => {
    setView({ status: 'loading' });
    setRound((value) => value + 1);
  };
  const closed = () => {
    setView((previous) => (previous.status === 'ready' ? { ...previous, notice: t.closedNow } : previous));
    setRound((value) => value + 1);
  };

  // Adresse de lecture fraîche à chaque clic (5 minutes de validité) : le lien est relu.
  const freshUrl = useCallback(async () => (await getSigningSession(token)).download?.url ?? null, [token]);

  if (view.status === 'loading') return <LinkSheetSkeleton label={t.loading} />;
  if (view.status === 'error') {
    const notFound = view.error.kind === 'notFound';
    return (
      <>
        <LinkSheet
          labelledBy="signature-titre"
          head={
            <div className="grid gap-4">
              <LinkSheetEyebrow icon={<IconPen className="size-4" />}>{t.eyebrow}</LinkSheetEyebrow>
              <h1 id="signature-titre" className="font-display text-h2 text-ink font-bold">
                {notFound ? t.notFoundTitle : t.metaTitle}
              </h1>
              {notFound ? (
                <p className="text-ink-muted">{t.notFoundText}</p>
              ) : (
                <div className="grid justify-items-start gap-4">
                  <FormMessage>{view.error.message}</FormMessage>
                  <Button variant="secondary" onClick={reload}>
                    {t.retry}
                  </Button>
                </div>
              )}
            </div>
          }
        />
        <Help />
      </>
    );
  }

  const { signing, notice } = view;
  const status = signatureStatus(signing.status);
  const pending = signing.status === 'pending';

  async function sign(code: string) {
    const signed = await signWithLink(token, code);
    setView({ status: 'ready', signing: keep(signed), notice: null });
  }

  return (
    <>
      <LinkSheet
        labelledBy="signature-titre"
        head={
          <div className="grid gap-5">
            <LinkSheetEyebrow icon={<IconPen className="size-4" />}>{t.eyebrow}</LinkSheetEyebrow>
            <div className="grid gap-1">
              <p className="text-small text-ink-muted">{t.issuer}</p>
              <h1 id="signature-titre" className="font-display text-h2 text-ink font-bold">
                {signing.documentTitle}
              </h1>
              <p className="text-ink-muted tabular-nums">{t.number(signing.documentNumber)}</p>
            </div>
            <div>
              <Badge tone={status.tone} dot>
                {status.label}
              </Badge>
            </div>
          </div>
        }
      >
        <LinkSheetSection>
          <LinkSheetFacts
            rows={[
              [t.signer, signing.signer.displayName],
              [t.phone, signing.signer.phoneMasked],
              [t.signBefore, pending ? formatDateTime(signing.expiresAt) : null],
              [t.signedAt, signing.signedAt ? formatDateTime(signing.signedAt) : null],
            ]}
          />
        </LinkSheetSection>

        {pending ? (
          <>
            <LinkSheetSection>
              <StepTitle number={1}>{t.readStep}</StepTitle>
              <p className="text-small text-ink-muted">{t.readLead}</p>
              {signing.readable ? (
                <ReadDocument getUrl={freshUrl} label={t.read} variant="outline" />
              ) : (
                <FormMessage tone="info">{t.noDownload}</FormMessage>
              )}
            </LinkSheetSection>
            <LinkSheetSection className="pb-8">
              <StepTitle number={2}>{t.signStep}</StepTitle>
              <FormMessage tone="info">{notice}</FormMessage>
              <SigningSteps
                idPrefix="signature"
                phoneMasked={signing.signer.phoneMasked}
                codeExpiresAt={signing.codeExpiresAt}
                requestCode={() => sendSigningCode(token)}
                sign={sign}
                onClosed={closed}
              />
            </LinkSheetSection>
          </>
        ) : (
          <LinkSheetSection className="pb-8">
            <FormMessage tone="info">{notice}</FormMessage>
            {signing.status === 'signed' ? (
              <LinkSheetOutcome tone="success" icon={<IconCheck className="size-6" />} title={t.signedTitle}>
                <p>{t.signedText}</p>
              </LinkSheetOutcome>
            ) : (
              <LinkSheetOutcome
                tone="neutral"
                icon={<IconAlert className="size-6" />}
                title={signing.status === 'cancelled' ? t.cancelledTitle : t.expiredTitle}
              >
                <p>{signing.status === 'cancelled' ? t.cancelledText : t.expiredText}</p>
              </LinkSheetOutcome>
            )}
            {signing.readable ? (
              <ReadDocument
                getUrl={freshUrl}
                label={signing.status === 'signed' ? t.readSigned : t.read}
                variant="primary"
              />
            ) : null}
          </LinkSheetSection>
        )}
      </LinkSheet>
      <Help />
    </>
  );
}
