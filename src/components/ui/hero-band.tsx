import type { ReactNode } from 'react';
import { SignatureBackdrop } from '@/components/ui/brand/signature';
import { cn } from '@/lib/cn';
import { Container } from './container';

/**
 * Bande héros bleu nuit (direction « Signature ») : dégradé discret tiré du logo, lignes de signature en
 * filigrane à droite. Elle redéfinit les jetons (`data-tone="inverse"`) : titres, textes, boutons et
 * cartes placés dedans s'inversent d'eux-mêmes. `overlap` : réserve le bas de la bande pour une feuille
 * blanche qui la chevauche (`-mt-*` sur le contenu suivant).
 */
export function HeroBand({
  children,
  labelledBy,
  overlap = false,
  as: Tag = 'section',
  className,
  containerClassName,
}: {
  children: ReactNode;
  /** Identifiant du titre de la bande (`aria-labelledby`), quand elle est une section. */
  labelledBy?: string;
  overlap?: boolean;
  as?: 'section' | 'div';
  className?: string;
  containerClassName?: string;
}) {
  return (
    <Tag
      aria-labelledby={labelledBy}
      data-tone="inverse"
      className={cn('hero-band relative isolate overflow-hidden', className)}
    >
      <SignatureBackdrop className="absolute inset-y-0 right-0 -z-10 h-full w-full [mask-image:linear-gradient(100deg,transparent_45%,black_100%)] opacity-[0.12]" />
      <Container
        className={cn(
          'relative pt-8 sm:pt-12',
          overlap ? 'pb-24 sm:pb-28' : 'pb-12 sm:pb-16',
          containerClassName,
        )}
      >
        {children}
      </Container>
    </Tag>
  );
}
