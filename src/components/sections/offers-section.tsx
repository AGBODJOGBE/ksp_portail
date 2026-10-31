import type { ReactNode } from 'react';
import { IconCheck } from '@/components/ui/icons';
import { Card } from '@/components/ui/card';
import { Section, type SectionTone } from '@/components/ui/section';
import { SectionHeader } from '@/components/ui/section-header';
import type { Offer, SectionIntro } from '@/components/sections/types';
import { cn } from '@/lib/cn';
import { frenchSpacing } from '@/lib/typography';

const COLUMNS = {
  2: 'sm:grid-cols-2',
  3: 'sm:grid-cols-2 lg:grid-cols-3',
  4: 'sm:grid-cols-2 lg:grid-cols-4',
} as const;

/*
 * Cinq éléments sur trois colonnes laisseraient un trou : on passe sur une grille de six,
 * deux cartes larges en tête puis trois cartes (2 + 3), la dernière centrée sur tablette.
 */
const FIVE_ON_THREE = 'sm:grid-cols-2 lg:grid-cols-6';
const fiveOnThreeItem = (index: number) =>
  cn(index < 2 ? 'lg:col-span-3' : 'lg:col-span-2', index === 4 && 'sm:max-lg:col-span-2');

const indexFormat = new Intl.NumberFormat('fr-BJ', { minimumIntegerDigits: 2 });

/** Grille d'offres ou de prestations : numéro éditorial, titre, texte et points clés cochés. */
export function OfferGrid({
  offers,
  columns = 3,
  className,
}: {
  offers: ReadonlyArray<Offer>;
  columns?: keyof typeof COLUMNS;
  className?: string;
}) {
  const fiveOnThree = columns === 3 && offers.length === 5;
  return (
    <ul
      className={cn(
        'reveal-stagger grid gap-4 lg:gap-5',
        fiveOnThree ? FIVE_ON_THREE : COLUMNS[columns],
        className,
      )}
    >
      {offers.map((offer, index) => (
        <Card
          as="li"
          key={offer.title}
          className={cn('flex flex-col p-6 sm:p-7', fiveOnThree && fiveOnThreeItem(index))}
        >
          <span
            aria-hidden="true"
            className="font-display text-accent-ink text-sm font-semibold tabular-nums"
          >
            {indexFormat.format(index + 1)}
          </span>
          <h3 className="font-display text-h3 text-ink mt-4 font-semibold">{offer.title}</h3>
          <p className="text-ink-muted mt-3">{frenchSpacing(offer.text)}</p>
          {offer.points && offer.points.length > 0 ? (
            <ul className="border-line text-small text-ink mt-6 space-y-2.5 border-t pt-5">
              {offer.points.map((point) => (
                <li key={point} className="flex gap-2.5">
                  <IconCheck className="text-action-ink mt-0.5 size-4" />
                  {point}
                </li>
              ))}
            </ul>
          ) : null}
        </Card>
      ))}
    </ul>
  );
}

/** Section d'offres : en-tête éditorial puis grille. */
export function OffersSection({
  id,
  intro,
  offers,
  columns = 3,
  tone = 'default',
  children,
}: {
  id: string;
  intro: SectionIntro;
  offers: ReadonlyArray<Offer>;
  columns?: keyof typeof COLUMNS;
  tone?: SectionTone;
  /** Contenu ajouté sous la grille. */
  children?: ReactNode;
}) {
  const titleId = `${id}-titre`;
  return (
    <Section id={id} labelledBy={titleId} tone={tone}>
      <SectionHeader id={titleId} eyebrow={intro.eyebrow} title={intro.title} lead={intro.lead} />
      <OfferGrid offers={offers} columns={columns} className="mt-12" />
      {children}
    </Section>
  );
}
