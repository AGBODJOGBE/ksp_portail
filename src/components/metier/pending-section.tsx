import type { ReactNode } from 'react';
import { WeavePattern } from '@/components/brand/weave';
import { IconImage } from '@/components/icons';
import { Placeholder } from '@/components/ui/placeholder';
import { Section, type SectionTone } from '@/components/ui/section';
import { SectionHeader } from '@/components/ui/section-header';
import type { Realisation } from '@/content/home';
import type { PendingContent } from '@/content/metier-page';
import { cn } from '@/lib/cn';
import { RealisationsGallery } from './realisations-gallery';

/** Emplacements « à venir » : contenu non encore fourni (zones, formations, réalisations). */
export function PendingGrid({
  content,
  withMedia = false,
  className,
}: {
  content: Pick<PendingContent, 'pendingTitle' | 'pendingText' | 'count'>;
  /** Réserve une zone d'image (réalisations). */
  withMedia?: boolean;
  className?: string;
}) {
  return (
    <ul
      className={cn(
        'reveal-stagger grid gap-4 lg:gap-5',
        content.count > 1 ? 'sm:grid-cols-2 lg:grid-cols-3' : 'max-w-xl',
        className,
      )}
    >
      {Array.from({ length: content.count }, (_, index) => (
        <Placeholder
          as="li"
          key={index}
          title={content.pendingTitle}
          className={index > 0 ? 'max-sm:hidden' : undefined}
          media={
            withMedia ? (
              <span className="bg-surface-sunken relative grid aspect-[4/3] place-items-center overflow-hidden">
                <WeavePattern className="text-ink-subtle absolute inset-0 size-full opacity-10" />
                <IconImage className="text-ink-subtle relative size-8" />
              </span>
            ) : undefined
          }
        >
          {content.pendingText}
        </Placeholder>
      ))}
    </ul>
  );
}

/** Section dont le contenu n'est pas encore fourni : en-tête, emplacements « à venir », action facultative. */
export function PendingSection({
  id,
  content,
  action,
  tone = 'default',
}: {
  id: string;
  content: PendingContent;
  action?: ReactNode;
  tone?: SectionTone;
}) {
  const titleId = `${id}-titre`;
  return (
    <Section id={id} labelledBy={titleId} tone={tone}>
      <SectionHeader
        id={titleId}
        eyebrow={content.eyebrow}
        title={content.title}
        lead={content.lead}
        action={action}
      />
      <PendingGrid content={content} className="mt-12" />
    </Section>
  );
}

/** Réalisations d'un métier : galerie filtrable si le CMS en fournit, sinon emplacements « à venir ». */
export function RealisationsSection({
  id = 'realisations',
  content,
  items,
  tone = 'default',
}: {
  id?: string;
  content: PendingContent;
  items: ReadonlyArray<Realisation>;
  tone?: SectionTone;
}) {
  const titleId = `${id}-titre`;
  return (
    <Section id={id} labelledBy={titleId} tone={tone}>
      <SectionHeader
        id={titleId}
        eyebrow={content.eyebrow}
        title={content.title}
        lead={items.length > 0 ? undefined : content.lead}
      />
      {items.length > 0 ? (
        <div className="mt-10">
          <RealisationsGallery items={items} />
        </div>
      ) : (
        <PendingGrid content={content} withMedia className="mt-12" />
      )}
    </Section>
  );
}
