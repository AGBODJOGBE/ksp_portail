import type { GuidedFormContent } from '@/components/sections/guided-form-types';
import type { SectionIntro } from '@/components/sections/types';
import { Section } from '@/components/ui/section';
import { SectionHeader } from '@/components/ui/section-header';
import { publicEnv } from '@/config/env';
import { CleaningSimulator } from './lazy';

/** Section du simulateur de la page Nettoyage : en-tête rendu par le serveur, simulateur dans le navigateur. */
export function CleaningSimulatorSection({
  id,
  intro,
  form,
}: {
  id: string;
  intro: SectionIntro;
  form: GuidedFormContent;
}) {
  const titleId = `${id}-titre`;
  return (
    <Section id={id} labelledBy={titleId} tone="muted">
      <SectionHeader id={titleId} eyebrow={intro.eyebrow} title={intro.title} lead={intro.lead} />
      <div className="reveal mt-10 lg:mt-12">
        <CleaningSimulator content={form} whatsappNumber={publicEnv.whatsappNumber} />
      </div>
    </Section>
  );
}
