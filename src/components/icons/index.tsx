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
