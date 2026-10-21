import { IconChevronDown } from '@/components/ui/icons';
import { Section, type SectionTone } from '@/components/ui/section';
import { SectionHeader } from '@/components/ui/section-header';
import type { FaqItem, SectionIntro } from '@/components/sections/types';
import { getDictionary } from '@/i18n';
import { cn } from '@/lib/cn';
import { FaqJsonLd } from '@/lib/seo/json-ld';
import { frenchSpacing } from '@/lib/typography';

/**
 * Questions fréquentes en `<details>`/`<summary>` natifs : ouverture au clavier (Entrée, Espace),
 * état annoncé par les lecteurs d'écran, recherche dans la page et fonctionnement sans JavaScript.
 */
export function FaqList({ items, className }: { items: ReadonlyArray<FaqItem>; className?: string }) {
  return (
    <div className={cn('divide-line border-line divide-y border-y', className)}>
      {items.map((item) => (
        <details key={item.question} className="group">
          <summary
            className={cn(
              'hover-veil rounded-control -mx-3 flex min-h-16 list-none items-center justify-between gap-6 px-3 py-4',
              'font-display text-ink text-lg leading-snug font-semibold sm:text-xl',
              '[&::-webkit-details-marker]:hidden',
            )}
          >
            {frenchSpacing(item.question)}
            <span
              aria-hidden="true"
              className="border-line-strong text-ink grid size-9 shrink-0 place-items-center rounded-full border"
            >
              <IconChevronDown className="ease-soft size-4 transition-transform duration-(--motion-base) group-open:rotate-180" />
            </span>
          </summary>
          <div className="disclosure-body text-ink-muted max-w-reading pr-12 pb-6">
            <p>{frenchSpacing(item.answer)}</p>
          </div>
        </details>
      ))}
    </div>
  );
}

/** Section FAQ : en-tête à gauche sur ordinateur, questions à droite ; données structurées incluses. */
export function FaqSection({
  id = 'faq',
  items,
  intro,
  tone = 'muted',
}: {
  id?: string;
  items: ReadonlyArray<FaqItem>;
  intro?: Partial<SectionIntro>;
  tone?: SectionTone;
}) {
  const t = getDictionary();
  const titleId = `${id}-titre`;
  return (
    <Section id={id} labelledBy={titleId} tone={tone}>
      <div className="grid gap-10 lg:grid-cols-12 lg:gap-10">
        <div className="lg:col-span-4">
          <SectionHeader
            id={titleId}
            eyebrow={intro?.eyebrow ?? t.metier.faqEyebrow}
            title={intro?.title ?? t.metier.faqTitle}
            lead={intro?.lead}
            className="lg:sticky lg:top-[calc(var(--header-h)+2.5rem)]"
          />
        </div>
        <FaqList items={items} className="reveal lg:col-span-8" />
      </div>
      <FaqJsonLd items={items} />
    </Section>
  );
}
