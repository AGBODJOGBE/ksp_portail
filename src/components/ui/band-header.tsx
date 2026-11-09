import Link from 'next/link';
import type { ReactNode } from 'react';
import { SignatureBackdrop } from '@/components/ui/brand/signature';
import { cn } from '@/lib/cn';
import { Container } from './container';
import { Eyebrow } from './eyebrow';
import { IconArrowLeft } from './icons';

/*
 * Écrans de Mon espace (direction « Signature ») : un cadre (`BandFrame`) sur la toile des espaces
 * connectés, et un en-tête (`BandHeader`) posé sur une bande bleu nuit qui s'étend sur toute la largeur
 * de la fenêtre, quel que soit le conteneur. Le haut du cadre et celui de la bande sont réglés ensemble
 * (`FRAME_TOP` / `BAND_TOP`) : la bande commence juste sous l'en-tête du site.
 */
const FRAME_TOP = 'pt-6 sm:pt-8';
const BAND_TOP = '-top-6 sm:-top-8';

/** Cadre des écrans de Mon espace : toile, marges, largeur ; la bande pleine largeur y est rognée. */
export function BandFrame({ children, size = 'page' }: { children: ReactNode; size?: 'page' | 'reading' }) {
  return (
    <div className="bg-canvas-space overflow-x-clip">
      <Container size={size} className={cn(FRAME_TOP, 'pb-16 sm:pb-24')}>
        {children}
      </Container>
    </div>
  );
}

/**
 * En-tête d'un écran sur la bande bleu nuit (ton inversé : textes, étiquettes et boutons s'adaptent).
 * `overlap` : bloc blanc (fil de progression, résumé) qui chevauche le bas de la bande. Le contenu qui
 * suit se pose sur la toile.
 */
export function BandHeader({
  children,
  overlap,
  className,
}: {
  children: ReactNode;
  overlap?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('relative isolate', className)}>
      <div
        data-tone="inverse"
        // Fond transparent : la bande pleine largeur, dessous, fait office de fond.
        style={{ backgroundColor: 'transparent' }}
        className={cn('relative', overlap ? 'pb-16 sm:pb-20' : 'pb-10 sm:pb-12')}
      >
        <span
          aria-hidden="true"
          className={cn(
            'hero-band absolute bottom-0 left-1/2 -z-10 w-screen -translate-x-1/2 overflow-hidden',
            BAND_TOP,
          )}
        >
          <SignatureBackdrop className="absolute inset-y-0 right-0 h-full w-full [mask-image:linear-gradient(100deg,transparent_45%,black_100%)] opacity-[0.12]" />
        </span>
        {children}
      </div>
      {overlap ? (
        <div data-tone="light" className="relative -mt-10 sm:-mt-12">
          {overlap}
        </div>
      ) : null}
    </div>
  );
}

/** Lien de retour discret, en tête d'une bande (« Mon espace KSP », « Mes prestations »…). */
export function BandBack({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="text-small text-ink-muted hover:text-ink -ml-1 inline-flex min-h-11 items-center gap-1.5 px-1 font-semibold"
    >
      <IconArrowLeft className="size-4" />
      {label}
    </Link>
  );
}

/**
 * Titre d'un écran dans `BandHeader` : retour, surtitre, titre de niveau 1, chapeau, compléments
 * (`children` : sélecteur de compte, portée) et, à droite sur ordinateur, un emplacement (`aside`).
 */
export function BandTitle({
  back,
  eyebrow,
  title,
  lead,
  children,
  aside,
}: {
  back?: { href: string; label: string };
  eyebrow?: ReactNode;
  title: ReactNode;
  lead?: ReactNode;
  children?: ReactNode;
  aside?: ReactNode;
}) {
  return (
    <div className="grid gap-8 lg:grid-cols-12 lg:items-end lg:gap-10">
      <div className={aside ? 'lg:col-span-7' : 'lg:col-span-10'}>
        {back ? <BandBack {...back} /> : null}
        {eyebrow ? <Eyebrow className={back ? 'mt-3 flex' : 'flex'}>{eyebrow}</Eyebrow> : null}
        <h1 className="font-display text-h1 text-ink mt-3 font-semibold">{title}</h1>
        {lead ? <p className="text-lead text-ink-muted mt-3 max-w-2xl">{lead}</p> : null}
        {children ? <div className="mt-5 grid gap-4">{children}</div> : null}
      </div>
      {aside ? <div className="lg:col-span-5">{aside}</div> : null}
    </div>
  );
}
