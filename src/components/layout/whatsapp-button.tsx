import { IconWhatsApp } from '@/components/icons';
import { publicEnv } from '@/config/env';
import { getDictionary } from '@/i18n';

/** Bouton de contact WhatsApp présent sur toutes les pages publiques (masqué tant que le numéro n'est pas fourni). */
export function WhatsAppButton({ message }: { message?: string }) {
  if (!publicEnv.whatsappNumber) return null;
  const t = getDictionary();
  const href = `https://wa.me/${publicEnv.whatsappNumber}${message ? `?text=${encodeURIComponent(message)}` : ''}`;
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
