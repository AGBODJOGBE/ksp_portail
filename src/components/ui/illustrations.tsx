import { cn } from '@/lib/cn';

/*
 * Illustrations d'états (vide, à venir) : quelques formes simples aux couleurs du logo, en SVG rendu
 * par le serveur (moins de 1 Ko chacune). Toujours décoratives : le texte voisin porte le sens.
 * Couleurs : jetons de la signature et de la marque, qui s'inversent sur fond bleu nuit.
 */

export type IllustrationName = 'done' | 'soon' | 'check';

/** Presse-papiers coché : rien à faire, tout est à jour. */
function Done() {
  return (
    <>
      <ellipse cx="80" cy="106" rx="54" ry="6" className="fill-brand" opacity=".07" />
      <rect
        x="44"
        y="18"
        width="72"
        height="86"
        rx="10"
        className="fill-surface stroke-brand"
        strokeWidth="2.5"
      />
      <rect x="62" y="12" width="36" height="14" rx="5" className="fill-brand" />
      <rect x="56" y="44" width="30" height="5" rx="2.5" className="fill-brand-muted" />
      <rect x="56" y="58" width="40" height="5" rx="2.5" className="fill-brand-muted" />
      <rect x="56" y="72" width="24" height="5" rx="2.5" className="fill-brand-muted" />
      <g className="pop origin-[112px_80px]">
        <circle cx="112" cy="80" r="17" className="fill-signature-2" />
        <path
          d="m104 80 5.5 5.5L120 75"
          pathLength={1}
          fill="none"
          stroke="#fff"
          strokeWidth="3.2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="draw [--i:3]"
        />
      </g>
      <rect x="24" y="30" width="14" height="4" rx="2" className="fill-signature-1" />
      <rect x="40" y="30" width="10" height="4" className="fill-signature-2" />
      <path d="M51 28l5 4-5 4Z" className="fill-signature-3" />
      <circle cx="132" cy="30" r="4" className="fill-signature-3" />
    </>
  );
}

/** Bâtiments, dont un en pointillés : d'autres services arrivent. */
function Soon() {
  return (
    <>
      <path d="M10 104h140" className="stroke-brand" strokeWidth="2.5" strokeLinecap="round" />
      <rect
        x="22"
        y="52"
        width="32"
        height="52"
        rx="4"
        className="fill-brand-soft stroke-brand"
        strokeWidth="2.5"
      />
      <rect
        x="62"
        y="30"
        width="40"
        height="74"
        rx="4"
        className="fill-surface stroke-brand"
        strokeWidth="2.5"
      />
      <rect
        x="110"
        y="62"
        width="34"
        height="42"
        rx="4"
        strokeDasharray="5 5"
        className="fill-action-soft stroke-brand"
        strokeWidth="2.5"
      />
      <path
        d="M72 44h7M86 44h7M72 58h7M86 58h7M72 72h7M86 72h7M31 66h5M41 66h5M31 80h5M41 80h5"
        className="stroke-brand"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      <path d="M127 76v14M120 83h14" className="stroke-signature-2" strokeWidth="3" strokeLinecap="round" />
      <g className="pop [--i:1]">
        <rect x="104" y="20" width="20" height="6" rx="3" className="fill-signature-1" />
        <rect x="126" y="20" width="16" height="6" className="fill-signature-2" />
        <path d="M143 17l8 6-8 6Z" className="fill-signature-3" />
      </g>
    </>
  );
}

/** Pastille cochée, sur un disque pâle et une ligne de signature : état vide d'un panneau (compact). */
function Check() {
  return (
    <>
      <circle cx="80" cy="56" r="44" className="fill-brand-soft" />
      <g className="pop">
        <circle cx="80" cy="56" r="26" className="fill-signature-2" />
        <path
          d="m68 56 8 8 16-16"
          pathLength={1}
          fill="none"
          stroke="#fff"
          strokeWidth="5"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="draw [--i:2]"
        />
      </g>
      <rect x="44" y="108" width="26" height="5" rx="2.5" className="fill-signature-1" />
      <rect x="73" y="108" width="34" height="5" className="fill-signature-2" />
      <path d="M108 105l8 5.5-8 5.5Z" className="fill-signature-3" />
    </>
  );
}

const ART = { done: Done, soon: Soon, check: Check } as const;

export function Illustration({ name, className }: { name: IllustrationName; className?: string }) {
  const Art = ART[name];
  return (
    <svg
      viewBox="0 0 160 120"
      aria-hidden="true"
      focusable="false"
      className={cn('h-auto shrink-0 overflow-visible', className)}
    >
      <Art />
    </svg>
  );
}
