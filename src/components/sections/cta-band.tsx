import { WeavePattern } from '@/components/ui/brand/weave';
import { WhatsAppLink } from '@/components/layout/whatsapp-button';
import { Section } from '@/components/ui/section';
import { SectionHeader } from '@/components/ui/section-header';
import type { CtaContent } from '@/components/sections/types';
import { PageActions } from './page-actions';

/** Bandeau d'appel à l'action, bleu nuit tissé : actions de la page et, si configuré, WhatsApp. */
export function CtaBand({ id = 'passer-a-l-action', content }: { id?: string; content: CtaContent }) {
  const titleId = `${id}-titre`;
  return (
    <Section id={id} labelledBy={titleId} tone="inverse" spacing="small" className="overflow-hidden">
      <WeavePattern className="text-accent-bright pointer-events-none absolute inset-y-0 right-0 h-full w-full [mask-image:linear-gradient(to_left,black,transparent_70%)] opacity-15" />
      <div className="relative flex flex-col gap-10 lg:flex-row lg:items-end lg:justify-between">
        <SectionHeader id={titleId} eyebrow={content.eyebrow} title={content.title} lead={content.lead} />
        <PageActions
          actions={content.actions}
          className="reveal shrink-0 lg:justify-end"
          extra={
            content.whatsappMessage ? <WhatsAppLink message={content.whatsappMessage} size="lg" /> : null
          }
        />
      </div>
    </Section>
  );
}
