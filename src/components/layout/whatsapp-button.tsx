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
      className="bg-whatsapp fixed right-4 bottom-4 z-50 inline-flex min-h-12 items-center gap-2 rounded-full px-5 text-sm font-semibold text-white shadow-lg"
    >
      <svg aria-hidden="true" viewBox="0 0 24 24" className="size-5 fill-current">
        <path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2Zm0 18.2a8.2 8.2 0 0 1-4.2-1.1l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2Zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8-.2-.1-.4-.1-.6.1l-.8 1c-.1.2-.3.2-.5.1a6.7 6.7 0 0 1-3.3-2.9c-.2-.4.2-.4.7-1.3.1-.2 0-.3 0-.4l-.8-1.8c-.2-.5-.4-.4-.6-.4h-.5a1 1 0 0 0-.7.3 3 3 0 0 0-.9 2.2 5.1 5.1 0 0 0 1.1 2.7 11.6 11.6 0 0 0 4.4 3.9c1.6.7 2.3.8 3.1.6a2.7 2.7 0 0 0 1.8-1.2 2.2 2.2 0 0 0 .1-1.3c0-.1-.2-.2-.4-.3Z" />
      </svg>
      <span className="hidden sm:inline">{t.common.contactWhatsapp}</span>
    </a>
  );
}
