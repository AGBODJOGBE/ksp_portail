import type { JSX } from 'react';
import type { MetierId } from '@/config/metiers';
import { cn } from '@/lib/cn';

/*
 * Icônes illustrées des métiers (v3, F-020) : pleines, bicolores, aux couleurs du logo (bleu nuit, or,
 * vert), sur une grille de 48. Dessinées pour KSP, décoratives : le titre de la carte porte le sens.
 * L'or n'y est qu'un aplat à côté du bleu nuit, jamais une forme seule qui porterait l'information.
 */

const NAVY = 'fill-brand-900';
const MID = 'fill-brand-600';
const GOLD = 'fill-gold-500';
const GREEN = 'fill-green-600';
const WHITE = 'fill-white';

function Recouvrement() {
  return (
    <>
      <path className={NAVY} d="M12 5h16.5L38 14.5V39a3 3 0 0 1-3 3H12a3 3 0 0 1-3-3V8a3 3 0 0 1 3-3Z" />
      <path className={MID} d="M28.5 5v7a2.5 2.5 0 0 0 2.5 2.5h7Z" />
      <rect className={WHITE} x="14" y="19" width="15" height="3" rx="1.5" />
      <rect className={WHITE} x="14" y="26" width="10" height="3" rx="1.5" />
      <circle className={GOLD} cx="35" cy="35" r="9.5" stroke="white" strokeWidth="2.5" />
      <path
        d="m30.5 35.2 3 3 5.5-6.2"
        fill="none"
        className="stroke-brand-900"
        strokeWidth="2.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </>
  );
}

function Nettoyage() {
  return (
    <>
      <path className={NAVY} d="M15 7h13a2 2 0 0 1 2 2v4H13V9a2 2 0 0 1 2-2Z" />
      <rect className={MID} x="30" y="8" width="6" height="4" rx="1.5" />
      <rect className={NAVY} x="17" y="12" width="9" height="7" rx="1.5" />
      <path className={NAVY} d="M12 23a5 5 0 0 1 5-5h9a5 5 0 0 1 5 5v16a4 4 0 0 1-4 4H16a4 4 0 0 1-4-4Z" />
      <rect className={GREEN} x="16" y="26" width="11" height="9" rx="2" />
      <path className={GOLD} d="m39 15 1.7 4.6 4.6 1.7-4.6 1.7L39 27.6l-1.7-4.6-4.6-1.7 4.6-1.7Z" />
      <path className={GOLD} d="m40 31 1 2.7 2.7 1-2.7 1-1 2.8-1-2.8-2.7-1 2.7-1Z" />
    </>
  );
}

function Immobilier() {
  return (
    <>
      <path className={NAVY} d="M10 21 24 9.5 38 21v18a3 3 0 0 1-3 3H13a3 3 0 0 1-3-3Z" />
      <path
        d="M5.5 23 24 7.5 42.5 23"
        fill="none"
        className="stroke-gold-500"
        strokeWidth="4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <rect className={WHITE} x="20" y="29" width="8" height="13" rx="1.5" />
      <rect className={GOLD} x="29.5" y="24" width="5" height="5" rx="1" />
      <rect className={MID} x="13.5" y="24" width="5" height="5" rx="1" />
    </>
  );
}

function Impression() {
  return (
    <>
      <rect
        x="14"
        y="5.5"
        width="20"
        height="13"
        rx="2"
        fill="white"
        className="stroke-brand-900"
        strokeWidth="2.5"
      />
      <rect className={NAVY} x="5" y="16" width="38" height="19" rx="4.5" />
      <circle className={GOLD} cx="36.5" cy="22.5" r="2.2" />
      <path className={GOLD} d="M13 28h22v13a2.5 2.5 0 0 1-2.5 2.5h-17A2.5 2.5 0 0 1 13 41Z" />
      <rect className={NAVY} x="17" y="33" width="14" height="2.4" rx="1.2" />
      <rect className={NAVY} x="17" y="37.5" width="9" height="2.4" rx="1.2" />
    </>
  );
}

function Marketplace() {
  return (
    <>
      <path
        d="M17 18v-4.5a7 7 0 0 1 14 0V18"
        fill="none"
        className="stroke-brand-600"
        strokeWidth="3.5"
        strokeLinecap="round"
      />
      <path
        className={NAVY}
        d="M10.2 16h27.6a2 2 0 0 1 2 2.2l-2.1 21.6a3 3 0 0 1-3 2.7H13.3a3 3 0 0 1-3-2.7L8.2 18.2a2 2 0 0 1 2-2.2Z"
      />
      <circle className={GOLD} cx="24" cy="29.5" r="7" />
      <path
        d="m20.8 29.7 2.3 2.3 4.2-4.6"
        fill="none"
        className="stroke-brand-900"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </>
  );
}

function Livraison() {
  return (
    <>
      <path className={MID} d="M24 6.5 41 15 24 23.5 7 15Z" />
      <path className={NAVY} d="M7 15v18.5L24 42V23.5Z" />
      <path className="fill-brand-800" d="M41 15v18.5L24 42V23.5Z" />
      <path className={GOLD} d="m15 10.7 17 8.5v7.3l-4.5 2.2v-7.3L10.5 13Z" />
      <rect className={WHITE} x="11" y="30" width="7" height="2.6" rx="1.3" transform="rotate(26 11 30)" />
    </>
  );
}

const GLYPHS: Record<MetierId, () => JSX.Element> = {
  recouvrement: Recouvrement,
  nettoyage: Nettoyage,
  immobilier: Immobilier,
  impression: Impression,
  marketplace: Marketplace,
  livraison: Livraison,
};

/** Icône illustrée d'un métier (décorative). */
export function MetierGlyph({ id, className }: { id: MetierId; className?: string }) {
  const Glyph = GLYPHS[id];
  return (
    <svg
      viewBox="0 0 48 48"
      aria-hidden="true"
      focusable="false"
      className={cn('size-12 shrink-0', className)}
    >
      <Glyph />
    </svg>
  );
}
