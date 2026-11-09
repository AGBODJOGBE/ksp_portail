import type { CSSProperties, ReactNode } from 'react';
import { formatNumber } from '@/lib/format';
import { cn } from '@/lib/cn';

/**
 * Nombre entier qui défile de 0 à sa valeur (compteur CSS `@property`, sans JavaScript). Le nombre
 * réel reste dans le texte pour les lecteurs d'écran et quand l'animation est coupée.
 */
export function CountUp({ value, className }: { value: number; className?: string }) {
  return (
    <>
      <span
        aria-hidden="true"
        className={cn('count-up tabular-nums', className)}
        style={{ '--count-to': value } as CSSProperties}
      />
      <span className="sr-only">{formatNumber(value)}</span>
    </>
  );
}

/**
 * Tuile de chiffre : un libellé, une valeur en grand (police des titres, chiffres tabulaires), son
 * unité, une ligne de contexte et, au besoin, un détail (jauge, légende). N'affiche que des chiffres
 * fournis par la gateway, jamais calculés ni inventés.
 */
export function FigureTile({
  label,
  value,
  unit,
  icon,
  sub,
  children,
  as: Tag = 'div',
  className,
}: {
  label: string;
  /** Valeur déjà formatée (« 120 000 »), ou nombre entier animé par `CountUp`. */
  value: ReactNode;
  unit?: string;
  icon?: ReactNode;
  sub?: ReactNode;
  children?: ReactNode;
  as?: 'div' | 'section' | 'li';
  className?: string;
}) {
  return (
    <Tag className={cn('rounded-card border-line bg-surface shadow-card border p-5 sm:p-6', className)}>
      <p className="text-small text-ink-muted flex items-center justify-between gap-2 font-semibold">
        {label}
        {icon ? (
          <span aria-hidden="true" className="text-ink-subtle">
            {icon}
          </span>
        ) : null}
      </p>
      <p className="font-display text-figure text-ink mt-2 font-semibold tabular-nums">
        {value}
        {unit ? (
          <span className="text-ink-muted ml-1.5 font-sans text-base font-semibold">{unit}</span>
        ) : null}
      </p>
      {sub ? <p className="text-small text-ink-muted mt-1">{sub}</p> : null}
      {children ? <div className="mt-4">{children}</div> : null}
    </Tag>
  );
}
