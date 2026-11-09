import type { ReactNode } from 'react';
import { Badge } from '@/components/ui/badge';
import { buttonClasses } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Heading } from '@/components/ui/heading';
import { IconMail, IconPhone, IconPin, IconWhatsApp } from '@/components/ui/icons';
import type { ContactDetails, ContactValue } from '@/config/contact';
import { frenchSpacing } from '@/lib/typography';
import { contactTexts as t } from '@/features/contact/content';

const TILE =
  'rounded-control bg-accent-soft text-accent-ink ring-accent-muted grid size-11 place-items-center ring-1 ring-inset';

/** « +22901970000 » → « +229 01 97 00 00 » : lisible, sans changer le lien. */
function displayPhone(value: string): string {
  const match = /^\+229(\d+)$/.exec(value);
  if (!match) return value;
  return `+229 ${match[1]!.replace(/(\d{2})(?=\d)/g, '$1 ')}`;
}

function ExampleBadge({ value }: { value: ContactValue }) {
  if (!value.example) return null;
  return (
    <Badge tone="warning" className="mt-2">
      {t.example}
    </Badge>
  );
}

function Channel({
  id,
  icon,
  title,
  text,
  detail,
  children,
}: {
  id: string;
  icon: ReactNode;
  title: string;
  text: string;
  detail: ReactNode;
  children?: ReactNode;
}) {
  return (
    <Card as="li" className="grid content-start gap-3">
      <span aria-hidden="true" className={TILE}>
        {icon}
      </span>
      <Heading as="h3" size="h3" id={id}>
        {title}
      </Heading>
      <p className="text-small text-ink-muted">{frenchSpacing(text)}</p>
      <div className="text-ink font-medium break-words">{detail}</div>
      {children}
    </Card>
  );
}

/**
 * Moyens de contact de KSP (aucun formulaire : aucun service ne reçoit encore de message libre,
 * ADR-039). Le sujet, s'il est connu, préremplit le message WhatsApp et l'objet de l'e-mail.
 * Composant sans état : rendu par le serveur (sans sujet) et par le navigateur (avec le sujet de l'adresse).
 * Les coordonnées arrivent en propriété (lues par le serveur) : ni configuration ni zod dans le navigateur.
 */
export function ContactChannels({ contact, subject }: { contact: ContactDetails; subject: string | null }) {
  const { phone, email, address, whatsappNumber } = contact;
  const whatsapp = `https://wa.me/${whatsappNumber.value}?text=${encodeURIComponent(t.message(subject))}`;
  const mail = `mailto:${email.value}?subject=${encodeURIComponent(t.mailSubject(subject))}`;
  const anyExample = [phone, email, address, whatsappNumber].some((value) => value.example);

  return (
    <div className="grid gap-4">
      <ul className="grid gap-4 sm:grid-cols-2">
        <Channel
          id="contact-whatsapp"
          icon={<IconWhatsApp className="size-6" />}
          title={t.whatsapp.title}
          text={t.whatsapp.text}
          detail={
            <>
              <span className="tabular-nums">{displayPhone(`+${whatsappNumber.value}`)}</span>
              <ExampleBadge value={whatsappNumber} />
            </>
          }
        >
          <a
            href={whatsapp}
            target="_blank"
            rel="noopener noreferrer"
            className={buttonClasses({ variant: 'primary', className: 'justify-self-start' })}
          >
            <IconWhatsApp className="size-5" />
            {t.whatsapp.action}
            <span className="sr-only"> {t.newWindow}</span>
          </a>
        </Channel>
        <Channel
          id="contact-telephone"
          icon={<IconPhone className="size-6" />}
          title={t.phone.title}
          text={t.phone.text}
          detail={
            <>
              <span className="tabular-nums">{displayPhone(phone.value)}</span>
              <ExampleBadge value={phone} />
            </>
          }
        >
          <a
            href={`tel:${phone.value}`}
            className={buttonClasses({ variant: 'secondary', className: 'justify-self-start' })}
          >
            <IconPhone className="size-5" />
            {t.phone.action}
          </a>
        </Channel>
        <Channel
          id="contact-email"
          icon={<IconMail className="size-6" />}
          title={t.email.title}
          text={t.email.text}
          detail={
            <>
              <span>{email.value}</span>
              <ExampleBadge value={email} />
            </>
          }
        >
          <a href={mail} className={buttonClasses({ variant: 'secondary', className: 'justify-self-start' })}>
            <IconMail className="size-5" />
            {t.email.action}
          </a>
        </Channel>
        <Channel
          id="contact-adresse"
          icon={<IconPin className="size-6" />}
          title={t.address.title}
          text={t.address.text}
          detail={
            <>
              <address className="not-italic">{address.value}</address>
              <ExampleBadge value={address} />
            </>
          }
        />
      </ul>
      {anyExample ? <p className="text-small text-ink-muted">{t.exampleNote}</p> : null}
    </div>
  );
}
