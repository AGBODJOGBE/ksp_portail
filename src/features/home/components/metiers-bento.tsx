import Link from 'next/link';
import { SignatureBackdrop } from '@/components/ui/brand/signature';
import { IconArrowRight } from '@/components/ui/icons';
import { MetierIcon } from '@/components/sections/metier-icon';
import { Card, type CardTone } from '@/components/ui/card';
import { Section } from '@/components/ui/section';
import { SectionHeader } from '@/components/ui/section-header';
import type { HomeContent } from '@/features/home/content';
import type { Metier, MetierId } from '@/config/metiers';
import { cn } from '@/lib/cn';

type Layout = { tone: CardTone; className: string; featured?: boolean };

/*
 * Grille « bento » : 1 colonne sur téléphone, 2 sur tablette, 3 sur ordinateur.
 * Mise en avant dans l'ordre : Recouvrement, Nettoyage (opérationnels dès la phase 1), puis Immobilier.
 *   ┌───────────────┬───────┐
 *   │ Recouvrement  │ Netto-│
 *   ├───────────────┤ yage  │
 *   │ Immobilier    │       │
 *   ├───────┬───────┼───────┤
 *   │ Impr. │ Mark. │ Livr. │
 *   └───────┴───────┴───────┘
 * Sur téléphone, le même ordre se lit de haut en bas.
 */
const LAYOUT: Record<MetierId, Layout> = {
  recouvrement: { tone: 'inverse', className: 'sm:col-span-2', featured: true },
  nettoyage: { tone: 'accent', className: 'lg:row-span-2', featured: true },
  immobilier: { tone: 'default', className: 'lg:col-span-2', featured: true },
  impression: { tone: 'default', className: '' },
  marketplace: { tone: 'default', className: '' },
  livraison: { tone: 'default', className: 'sm:col-span-2 lg:col-span-1' },
};

function MetierCard({ metier }: { metier: Metier }) {
  const layout = LAYOUT[metier.id];
  return (
    <Card
      as="li"
      interactive
      tone={layout.tone}
      className={cn(
        'flex flex-col p-6 sm:min-h-64 sm:p-7',
        layout.featured && 'lg:min-h-80',
        layout.className,
      )}
    >
      {layout.featured ? (
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 overflow-hidden rounded-[inherit]"
        >
          <SignatureBackdrop
            className={cn(
              'absolute inset-y-0 right-0 h-full w-2/3 [mask-image:linear-gradient(to_left,black,transparent)]',
              layout.tone === 'inverse' ? 'opacity-15' : 'opacity-10',
            )}
          />
        </span>
      ) : null}
      <span
        className={cn(
          'rounded-control relative grid size-12 place-items-center',
          layout.tone === 'inverse' ? 'bg-accent text-on-accent' : 'bg-accent-soft text-accent-ink',
          layout.tone === 'accent' && 'bg-surface',
        )}
      >
        <MetierIcon id={metier.id} className="size-6" />
      </span>
      <h3
        className={cn(
          'font-display text-ink relative mt-6 font-semibold',
          layout.featured ? 'text-h2 max-w-md' : 'text-h3',
        )}
      >
        <Link href={metier.href} className="stretched-link focus-visible:outline-none">
          {metier.label}
        </Link>
      </h3>
      <p className={cn('text-ink-muted relative mt-3 max-w-md', !layout.featured && 'text-small')}>
        {metier.summary}
      </p>
      <span className="text-accent-ink relative mt-auto inline-flex items-center gap-2 self-start pt-6 font-semibold">
        <span className="border-b border-current/30 pb-0.5">{metier.action}</span>
        <IconArrowRight className="ease-soft size-4 transition-transform duration-(--motion-base) group-hover/card:translate-x-1" />
      </span>
    </Card>
  );
}

/** Les six métiers du groupe, chacun avec son action principale. */
export function MetiersBento({
  content,
  metiers,
}: {
  content: HomeContent['metiers'];
  metiers: ReadonlyArray<Metier>;
}) {
  return (
    <Section id="metiers" labelledBy="metiers-titre">
      <SectionHeader id="metiers-titre" eyebrow={content.eyebrow} title={content.title} lead={content.lead} />
      <ul className="reveal-stagger mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 lg:gap-5">
        {metiers.map((metier) => (
          <MetierCard key={metier.id} metier={metier} />
        ))}
      </ul>
    </Section>
  );
}
