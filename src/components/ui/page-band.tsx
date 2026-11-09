import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';
import { Container } from './container';
import { Eyebrow } from './eyebrow';
import { HeroBand } from './hero-band';
import { BandBack } from './band-header';

/**
 * En-tête court d'un écran (direction « Signature ») : bande bleu nuit avec lien de retour, surtitre,
 * titre de niveau 1, chapeau et, à droite, un emplacement (`aside` : compte actif, résumé). Le bas de
 * la bande est réservé à une feuille (`PageSheet`) qui la chevauche. Utilisé par les écrans de Mon
 * espace et les parcours (demande de devis, connexion).
 */
export function PageBand({
  eyebrow,
  title,
  titleId,
  lead,
  back,
  aside,
  children,
  className,
}: {
  eyebrow: ReactNode;
  title: ReactNode;
  /** Identifiant du titre ; la bande est alors une région nommée par lui. */
  titleId?: string;
  lead?: ReactNode;
  back?: { href: string; label: string };
  aside?: ReactNode;
  /** Contenu ajouté sous le chapeau (sélecteur de compte, étiquettes). */
  children?: ReactNode;
  className?: string;
}) {
  return (
    <HeroBand
      as={titleId ? 'section' : 'div'}
      labelledBy={titleId}
      overlap
      className={className}
      containerClassName="pt-5 sm:pt-8"
    >
      {back ? <BandBack {...back} /> : null}
      <div
        className={cn(
          'grid gap-8 lg:grid-cols-12 lg:items-end lg:gap-10',
          back ? 'mt-3 sm:mt-4' : 'mt-2 sm:mt-4',
        )}
      >
        <div className={aside ? 'lg:col-span-7' : 'lg:col-span-9'}>
          <Eyebrow>{eyebrow}</Eyebrow>
          <h1 id={titleId} className="font-display text-h1 text-ink mt-4 font-semibold">
            {title}
          </h1>
          {lead ? <p className="text-lead text-ink-muted mt-4 max-w-2xl">{lead}</p> : null}
          {children ? <div className="mt-6">{children}</div> : null}
        </div>
        {aside ? <div className="lg:col-span-5">{aside}</div> : null}
      </div>
    </HeroBand>
  );
}

/**
 * Feuille blanche qui chevauche une bande héros (`PageBand`, `HeroBand overlap`) : le contenu principal
 * de l'écran. `bare` : sans panneau (le contenu pose ses propres cartes sur la toile).
 */
export function PageSheet({
  children,
  bare = false,
  size = 'page',
  className,
}: {
  children: ReactNode;
  bare?: boolean;
  size?: 'page' | 'reading';
  className?: string;
}) {
  return (
    <Container size={size} className={cn('relative -mt-16 pb-16 sm:-mt-20 sm:pb-24', className)}>
      {bare ? (
        children
      ) : (
        <div className="rounded-panel border-line bg-surface shadow-float border p-5 sm:p-8 lg:p-10">
          {children}
        </div>
      )}
    </Container>
  );
}
