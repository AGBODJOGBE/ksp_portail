import type { CSSProperties } from 'react';
import { cn } from '@/lib/cn';

export type GaugeTone = 'brand' | 'action' | 'accent' | 'warning' | 'danger';

const FILLS: Record<GaugeTone, string> = {
  brand: 'bg-brand',
  action: 'bg-action',
  accent: 'bg-accent',
  warning: 'bg-warning',
  danger: 'bg-danger',
};

export interface GaugeSegment {
  label: string;
  value: number;
  tone?: GaugeTone;
  /** Valeur affichée dans la légende (montant formaté…) ; par défaut, `value`. */
  display?: string;
}

/**
 * Jauge : une barre qui se remplit (part d'un total), ou plusieurs segments empilés avec leur légende.
 * Les valeurs viennent telles quelles de la gateway (montant réglé et total d'une facture…) : la jauge
 * ne calcule rien d'autre que leur proportion. Le sens est dit en texte (légende, `label`), jamais par
 * la couleur seule.
 */
export function Gauge({
  segments,
  max,
  label,
  legend = true,
  className,
}: {
  segments: ReadonlyArray<GaugeSegment>;
  max: number;
  /** Phrase lue par les lecteurs d'écran (« 40 000 F CFA réglés sur 120 000 F CFA »). */
  label: string;
  legend?: boolean;
  className?: string;
}) {
  const share = (value: number) => (max > 0 ? Math.min(100, Math.max(0, (value / max) * 100)) : 0);
  return (
    <div className={className}>
      <div
        role="img"
        aria-label={label}
        className="bg-signature-track flex h-2 gap-0.5 overflow-hidden rounded-full"
      >
        {segments.map((segment, index) =>
          segment.value > 0 ? (
            <span
              key={segment.label}
              className={cn('grow-x block h-full', FILLS[segment.tone ?? 'brand'])}
              style={{ width: `${share(segment.value)}%`, '--i': index } as CSSProperties}
            />
          ) : null,
        )}
      </div>
      {legend ? (
        <ul aria-hidden="true" className="text-ink-muted mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs">
          {segments.map((segment) => (
            <li key={segment.label} className="flex items-center gap-1.5">
              <span className={cn('size-2 rounded-xs', FILLS[segment.tone ?? 'brand'])} />
              {segment.label}
              <span className="text-ink font-semibold tabular-nums">{segment.display ?? segment.value}</span>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
