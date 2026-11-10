import Link from 'next/link';
import { MetierGlyph } from '@/components/sections/metier-glyph';
import { Badge, type BadgeTone } from '@/components/ui/badge';
import type { MetierId } from '@/config/metiers';
import { cn } from '@/lib/cn';
import { servicesTexts } from '@/features/services/content';
import { CATEGORY_LABELS, type ServiceEntry } from '@/features/services/search';

/* Pastille de catégorie : un ton par métier ; le libellé suffit, la couleur aide seulement. */
const CATEGORY_TONES: Record<MetierId, BadgeTone> = {
  recouvrement: 'brand',
  nettoyage: 'action',
  immobilier: 'accent',
  impression: 'warning',
  marketplace: 'brand',
  livraison: 'success',
};

/**
 * Carte d'un service (v3, F-020) : icône dans un carré doux, pastille de catégorie en haut à droite,
 * titre, description sur deux lignes, lien souligné « Afficher les détails » qui rend toute la carte
 * cliquable. Légère élévation au survol.
 */
export function ServiceCard({
  entry,
  headingLevel = 'h2',
  className,
}: {
  entry: ServiceEntry;
  headingLevel?: 'h2' | 'h3';
  className?: string;
}) {
  const Title = headingLevel;
  const titleId = `service-${entry.id}`;
  return (
    <article
      aria-labelledby={titleId}
      className={cn(
        'group/card rounded-card border-line bg-surface relative flex h-full flex-col border p-5 shadow-xs sm:p-6',
        'ease-soft hover:shadow-card transition-[translate,box-shadow] duration-(--motion-slow) hover:-translate-y-1',
        'has-[.stretched-link:focus-visible]:outline-focus has-[.stretched-link:focus-visible]:outline-2 has-[.stretched-link:focus-visible]:outline-offset-3',
        className,
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <span className="rounded-icon bg-brand-soft grid size-16 shrink-0 place-items-center">
          <MetierGlyph id={entry.category} className="size-11" />
        </span>
        <Badge
          tone={CATEGORY_TONES[entry.category]}
          className="font-display min-h-8 px-3.5 text-sm font-medium"
        >
          {CATEGORY_LABELS[entry.category]}
        </Badge>
      </div>
      <Title id={titleId} className="font-display text-h3 text-ink mt-5 font-bold">
        {entry.title}
      </Title>
      <p className="text-ink-muted mt-2 line-clamp-2">{entry.description}</p>
      {entry.status ? <p className="text-small text-ink-subtle mt-2 font-medium">{entry.status}</p> : null}
      <Link
        href={entry.href}
        className="stretched-link text-brand-ink font-display mt-auto inline-flex min-h-11 items-end pt-4 font-semibold underline decoration-1 underline-offset-4 group-hover/card:decoration-2 focus-visible:outline-none"
      >
        {servicesTexts.details}
        <span className="sr-only"> : {entry.title}</span>
      </Link>
    </article>
  );
}
