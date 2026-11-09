import { cn } from '@/lib/cn';
import { Icon, type IconProps } from './icon';

export type { IconProps };

/* Icônes d'interface — dessinées pour le projet, aucune bibliothèque ajoutée. */

export function IconMenu(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M4 7h16M4 12h16M4 17h10" />
    </Icon>
  );
}

export function IconClose(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M6 6l12 12M18 6 6 18" />
    </Icon>
  );
}

export function IconArrowRight(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M5 12h14M13 6l6 6-6 6" />
    </Icon>
  );
}

export function IconArrowLeft(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M19 12H5M11 6l-6 6 6 6" />
    </Icon>
  );
}

export function IconAlert(props: IconProps) {
  return (
    <Icon {...props}>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7.75v5M12 16.25h.01" />
    </Icon>
  );
}

export function IconArrowUpRight(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M7 17 17 7M8.5 7H17v8.5" />
    </Icon>
  );
}

export function IconChevronDown(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="m6 9 6 6 6-6" />
    </Icon>
  );
}

export function IconUser(props: IconProps) {
  return (
    <Icon {...props}>
      <circle cx="12" cy="8" r="3.75" />
      <path d="M4.5 20c1.4-3.4 4.2-5 7.5-5s6.1 1.6 7.5 5" />
    </Icon>
  );
}

export function IconCheck(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="m5 12.5 4.5 4.5L19 7.5" />
    </Icon>
  );
}

/** Mallette : compte entreprise. */
export function IconBriefcase(props: IconProps) {
  return (
    <Icon {...props}>
      <rect x="3.5" y="7.5" width="17" height="12" rx="2" />
      <path d="M9 7.5V6a1.5 1.5 0 0 1 1.5-1.5h3A1.5 1.5 0 0 1 15 6v1.5" />
      <path d="M3.5 12.5h17" />
    </Icon>
  );
}

/** Combiné de téléphone. */
export function IconPhone(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M5 4h3.5l1.5 4-2.2 1.4a11 11 0 0 0 6.8 6.8L16 14l4 1.5V19a1.5 1.5 0 0 1-1.6 1.5A16 16 0 0 1 3.5 5.6 1.5 1.5 0 0 1 5 4z" />
    </Icon>
  );
}

/** Enveloppe : e-mail. */
export function IconMail(props: IconProps) {
  return (
    <Icon {...props}>
      <rect x="3.5" y="5.5" width="17" height="13" rx="2" />
      <path d="m4 7 8 6 8-6" />
    </Icon>
  );
}

/** Cloche : notifications. */
export function IconBell(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M6 8a6 6 0 1 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
      <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
    </Icon>
  );
}

export function IconWallet(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M4 7.5A2.5 2.5 0 0 1 6.5 5H18v3" />
      <path d="M4 7.5v10A2.5 2.5 0 0 0 6.5 20H20v-12H6.5A2.5 2.5 0 0 1 4 7.5" />
      <path d="M16 14h.01" />
    </Icon>
  );
}

export function IconClock(props: IconProps) {
  return (
    <Icon {...props}>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7.5V12l3 2" />
    </Icon>
  );
}

export function IconImage(props: IconProps) {
  return (
    <Icon {...props}>
      <rect x="3.5" y="4.5" width="17" height="15" rx="2" />
      <circle cx="9" cy="10" r="1.75" />
      <path d="m20.5 16-4.5-4.5L7 19.5" />
    </Icon>
  );
}

/* Icônes des six métiers. */

export function IconRecouvrement(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M14 3H7a1 1 0 0 0-1 1v16a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1V7l-4-4Z" />
      <path d="M14 3v4h4M9.5 14.5l2 2 3.5-4" />
    </Icon>
  );
}

export function IconImmobilier(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="m3 11 9-7 9 7" />
      <path d="M5.5 9.5V20h13V9.5M10 20v-5.5h4V20" />
    </Icon>
  );
}

export function IconNettoyage(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M11 4c3 3.8 5 6.4 5 9.3a5 5 0 0 1-10 0C6 10.4 8 7.8 11 4Z" />
      <path d="M19 3v4M17 5h4M19.5 15.5v3M18 17h3" />
    </Icon>
  );
}

export function IconImpression(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M7 9V3.5h10V9" />
      <path d="M7 17.5H4.5a1 1 0 0 1-1-1V11a2 2 0 0 1 2-2h13a2 2 0 0 1 2 2v5.5a1 1 0 0 1-1 1H17" />
      <path d="M7 14h10v6.5H7z" />
    </Icon>
  );
}

export function IconMarketplace(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M5 8h14l-1.1 11.1a1 1 0 0 1-1 .9H7.1a1 1 0 0 1-1-.9L5 8Z" />
      <path d="M9 10.5V7a3 3 0 0 1 6 0v3.5" />
    </Icon>
  );
}

export function IconLivraison(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M3 6.5h10v9H3zM13 9.5h4.2l3.3 3.4v2.6H13" />
      <circle cx="7" cy="17.5" r="1.9" />
      <circle cx="17" cy="17.5" r="1.9" />
    </Icon>
  );
}

/** Logo WhatsApp (plein) : seul pictogramme de marque, conservé sous sa forme officielle. */
export function IconWhatsApp({ title, className, ...props }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={cn('size-5 shrink-0 fill-current', className)}
      {...(title ? { role: 'img', 'aria-label': title } : { 'aria-hidden': true })}
      focusable="false"
      {...props}
    >
      <path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2Zm0 18.2a8.2 8.2 0 0 1-4.2-1.1l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2Zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8-.2-.1-.4-.1-.6.1l-.8 1c-.1.2-.3.2-.5.1a6.7 6.7 0 0 1-3.3-2.9c-.2-.4.2-.4.7-1.3.1-.2 0-.3 0-.4l-.8-1.8c-.2-.5-.4-.4-.6-.4h-.5a1 1 0 0 0-.7.3 3 3 0 0 0-.9 2.2 5.1 5.1 0 0 0 1.1 2.7 11.6 11.6 0 0 0 4.4 3.9c1.6.7 2.3.8 3.1.6a2.7 2.7 0 0 0 1.8-1.2 2.2 2.2 0 0 0 .1-1.3c0-.1-.2-.2-.4-.3Z" />
    </svg>
  );
}

/* Types de lieu du Nettoyage (nom d'icône libre envoyé par la gateway, interprété par le front). */

export function IconHouse(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="m3 11.5 9-7.5 9 7.5" />
      <path d="M5.5 9.5V20h13V9.5" />
      <path d="M10 20v-5h4v5" />
    </Icon>
  );
}

export function IconVilla(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="m2 12 7-6 7 6" />
      <path d="M4 10.5V20h10v-9.5M14 20h7v-7l-3.5-3L15 12" />
      <path d="M7.5 20v-4h3v4" />
    </Icon>
  );
}

export function IconApartment(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M5 21V4h10v17M15 9h4v12M3 21h18" />
      <path d="M8 8h1M11 8h1M8 12h1M11 12h1M8 16h1M11 16h1" />
    </Icon>
  );
}

export function IconOffice(props: IconProps) {
  return (
    <Icon {...props}>
      <rect x="3" y="7" width="18" height="13" rx="2" />
      <path d="M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2M3 13h18M11 13v2h2v-2" />
    </Icon>
  );
}

export function IconConstruction(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M4 17a8 8 0 0 1 16 0" />
      <path d="M10 9.3V6h4v3.3M2.5 17h19v3h-19z" />
    </Icon>
  );
}

/** Localisation (« Me localiser »). */
export function IconLocate(props: IconProps) {
  return (
    <Icon {...props}>
      <circle cx="12" cy="12" r="6.5" />
      <circle cx="12" cy="12" r="2" />
      <path d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3" />
    </Icon>
  );
}

/** Repère sur une carte (adresse). */
export function IconPin(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M12 21s-6.5-5.6-6.5-11a6.5 6.5 0 0 1 13 0c0 5.4-6.5 11-6.5 11Z" />
      <circle cx="12" cy="10" r="2.25" />
    </Icon>
  );
}

export function IconCalendar(props: IconProps) {
  return (
    <Icon {...props}>
      <rect x="3.5" y="5" width="17" height="15.5" rx="2" />
      <path d="M3.5 10h17M8 3v4M16 3v4" />
    </Icon>
  );
}

export function IconFileCheck(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M14 3H7a1 1 0 0 0-1 1v16a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1V7l-4-4Z" />
      <path d="M14 3v4h4M9.5 14.5l2 2 3.5-4" />
    </Icon>
  );
}

export function IconInvoice(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M14 3H7a1 1 0 0 0-1 1v16a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1V7l-4-4Z" />
      <path d="M14 3v4h4M9 12h6M9 16h4" />
    </Icon>
  );
}

export function IconCard(props: IconProps) {
  return (
    <Icon {...props}>
      <rect x="3" y="5.5" width="18" height="13" rx="2" />
      <path d="M3 10h18M7 15h3" />
    </Icon>
  );
}

export function IconSwap(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M7 7h12l-3-3M17 17H5l3 3" />
    </Icon>
  );
}
