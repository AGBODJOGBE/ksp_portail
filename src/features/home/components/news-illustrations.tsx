import { MetierGlyph } from '@/components/sections/metier-glyph';
import type { NewsSlide } from '@/features/home/content';

/* Illustrations du carrousel « Nouveautés », aux couleurs du logo. Décoratives. */

function MobileMoney() {
  return (
    <svg viewBox="0 0 48 48" aria-hidden="true" focusable="false" className="size-40 sm:size-44">
      <rect className="fill-brand-900" x="12" y="4" width="22" height="40" rx="4" />
      <rect className="fill-white" x="14.5" y="9" width="17" height="27" rx="1.5" />
      <rect className="fill-brand-600" x="20" y="39.5" width="6" height="2" rx="1" />
      <rect className="fill-brand-100" x="17" y="13" width="12" height="3" rx="1.5" />
      <rect className="fill-green-600" x="17" y="27" width="12" height="5" rx="2.5" />
      <circle className="fill-gold-500 stroke-white" cx="34" cy="20" r="8" strokeWidth="2.5" />
      <path
        className="stroke-brand-900"
        d="m30.4 20.2 2.5 2.5 4.6-5"
        fill="none"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function Wallet() {
  return (
    <svg viewBox="0 0 48 48" aria-hidden="true" focusable="false" className="size-40 sm:size-44">
      <rect
        className="fill-gold-500"
        x="11"
        y="8"
        width="24"
        height="15"
        rx="3"
        transform="rotate(-12 11 8)"
      />
      <rect className="fill-brand-600" x="7" y="14" width="34" height="26" rx="5" />
      <path className="fill-brand-900" d="M7 21h34v14a5 5 0 0 1-5 5H12a5 5 0 0 1-5-5Z" />
      <rect className="fill-brand-800" x="29" y="24" width="14" height="9" rx="4.5" />
      <circle className="fill-gold-500" cx="34" cy="28.5" r="2.2" />
    </svg>
  );
}

/** Illustration d'une nouveauté (rendue par le serveur, passée au carrousel). */
export function NewsIllustration({ name }: { name: NewsSlide['illustration'] }) {
  if (name === 'mobile-money') return <MobileMoney />;
  if (name === 'wallet') return <Wallet />;
  return <MetierGlyph id="nettoyage" className="size-40 sm:size-44" />;
}
