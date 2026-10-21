import { IconWhatsApp } from '@/components/ui/icons';
import { buttonClasses } from '@/components/ui/button';
import { publicEnv } from '@/config/env';
import { getDictionary } from '@/i18n';
import { cn } from '@/lib/cn';

/** Lien de conversation WhatsApp, ou `null` tant que le numéro n'est pas configuré. */
export function whatsappHref(message?: string, number: string | undefined = publicEnv.whatsappNumber) {
  if (!number) return null;
  return `https://wa.me/${number}${message ? `?text=${encodeURIComponent(message)}` : ''}`;
}

/** Bouton de contact WhatsApp présent sur toutes les pages publiques (masqué tant que le numéro n'est pas fourni). */
export function WhatsAppButton({ message }: { message?: string }) {
  const href = whatsappHref(message);
  if (!href) return null;
  const t = getDictionary();
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={t.common.contactWhatsapp}
      className="group/wa bg-whatsapp shadow-raised ease-soft fixed right-[max(1rem,env(safe-area-inset-right))] bottom-[max(1rem,env(safe-area-inset-bottom))] z-(--z-float) inline-flex min-h-13 min-w-13 items-center justify-center gap-2 rounded-full px-4 text-sm font-semibold text-white transition-transform duration-(--motion-base) hover:-translate-y-0.5 active:scale-95 sm:px-5"
    >
      <IconWhatsApp className="size-6" />
      <span className="hidden sm:inline">{t.common.contactWhatsapp}</span>
    </a>
  );
}

/**
 * Bouton WhatsApp placé dans le contenu (bandeaux d'appel à l'action), avec un message prérempli.
 * Même règle que le bouton flottant : rien n'est affiché tant que le numéro n'est pas configuré.
 */
export function WhatsAppLink({
  message,
  label,
  size = 'md',
  className,
}: {
  message?: string;
  label?: string;
  size?: 'md' | 'lg';
  className?: string;
}) {
  const href = whatsappHref(message);
  if (!href) return null;
  const t = getDictionary();
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={buttonClasses({ variant: 'secondary', size, className: cn('group/wa', className) })}
    >
      <IconWhatsApp className="text-whatsapp size-5" />
      {label ?? t.common.contactWhatsapp}
    </a>
  );
}
