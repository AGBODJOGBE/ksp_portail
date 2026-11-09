'use client';

import { useSearchParams } from 'next/navigation';
import type { ContactDetails } from '@/config/contact';
import { subjectFromParam, contactTexts as t } from '@/features/contact/content';
import { ContactChannels } from './contact-channels';

/**
 * Sujet lu dans l'adresse (`/contact?sujet=paiement`, liens « support » du site) : annoncé en tête et
 * repris dans le message WhatsApp et l'objet de l'e-mail. Lu sous Suspense : la page reste statique.
 */
export function ContactWithSubject({ contact }: { contact: ContactDetails }) {
  const subject = subjectFromParam(useSearchParams().get('sujet'));
  return (
    <div className="grid gap-6">
      {subject ? (
        <div className="rounded-card border-action-muted bg-action-soft border p-4 sm:p-5" role="status">
          <p className="text-small text-action-ink font-semibold">{t.subjectLabel}</p>
          <p className="text-ink mt-1 font-medium">{subject.label}</p>
          <p className="text-small text-ink-muted mt-1">{t.subjectHint}</p>
        </div>
      ) : null}
      <ContactChannels contact={contact} subject={subject?.label ?? null} />
    </div>
  );
}
