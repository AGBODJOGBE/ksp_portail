import { Section, type SectionTone } from '@/components/ui/section';
import { SectionHeader } from '@/components/ui/section-header';
import { publicEnv } from '@/config/env';
import type { GuidedFormContent } from '@/components/sections/guided-form-types';
import type { SectionIntro } from '@/components/sections/types';
import { GuidedForm } from './guided-form';
import { PageActions } from './page-actions';

/**
 * Section qui accueille un formulaire guidé (simulateur, demande de devis). Les boutons de l'écran final
 * sont rendus ici, côté serveur ; seul le numéro WhatsApp est transmis au composant client.
 */
export function GuidedFormSection({
  id,
  intro,
  form,
  tone = 'muted',
}: {
  id: string;
  intro: SectionIntro;
  form: GuidedFormContent;
  tone?: SectionTone;
}) {
  const titleId = `${id}-titre`;
  return (
    <Section id={id} labelledBy={titleId} tone={tone}>
      <SectionHeader id={titleId} eyebrow={intro.eyebrow} title={intro.title} lead={intro.lead} />
      <div className="reveal mt-10 lg:mt-12">
        <GuidedForm
          content={form}
          resultActions={<PageActions actions={form.result.actions} />}
          whatsappNumber={publicEnv.whatsappNumber}
        />
      </div>
    </Section>
  );
}
