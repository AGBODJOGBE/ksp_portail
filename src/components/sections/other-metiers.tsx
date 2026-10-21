import Link from 'next/link';
import { IconArrowRight } from '@/components/ui/icons';
import { MetierIcon } from '@/components/sections/metier-icon';
import { Card } from '@/components/ui/card';
import { Section } from '@/components/ui/section';
import { SectionHeader } from '@/components/ui/section-header';
import { metiers, type MetierId } from '@/config/metiers';
import { getDictionary } from '@/i18n';

/** Renvoi vers les cinq autres métiers, dans l'ordre de mise en avant (`metiers.ts`). */
export function OtherMetiers({ current }: { current: MetierId }) {
  const t = getDictionary();
  const others = metiers.filter((metier) => metier.id !== current);
  return (
    <Section id="autres-metiers" labelledBy="autres-metiers-titre" tone="muted" spacing="small">
      <SectionHeader
        id="autres-metiers-titre"
        eyebrow={t.metier.otherMetiersEyebrow}
        title={t.metier.otherMetiersTitle}
      />
      <ul className="reveal-stagger mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 lg:gap-4 xl:grid-cols-5">
        {others.map((metier) => (
          <Card
            as="li"
            key={metier.id}
            interactive
            className="flex items-center gap-4 sm:flex-col sm:items-start"
          >
            <span className="rounded-control bg-accent-soft text-accent-ink grid size-11 shrink-0 place-items-center">
              <MetierIcon id={metier.id} className="size-[1.375rem]" />
            </span>
            {/* Téléphone : rangée compacte (icône, titre, flèche) ; tablette et plus : carte verticale. */}
            <div className="min-w-0 flex-1 sm:flex sm:w-full sm:flex-col">
              <h3 className="font-display text-ink text-lg leading-snug font-semibold">
                <Link href={metier.href} className="stretched-link focus-visible:outline-none">
                  {metier.label}
                </Link>
              </h3>
              <p className="text-small text-ink-muted mt-1 sm:mt-2">{metier.summary}</p>
            </div>
            <span className="shrink-0 sm:mt-auto sm:self-end sm:pt-4">
              <IconArrowRight className="text-accent-ink ease-soft size-5 transition-transform duration-(--motion-base) group-hover/card:translate-x-1" />
            </span>
          </Card>
        ))}
      </ul>
    </Section>
  );
}
