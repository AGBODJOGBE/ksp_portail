import { WeavePattern } from '@/components/ui/brand/weave';
import { Eyebrow } from '@/components/ui/eyebrow';
import { Heading } from '@/components/ui/heading';
import { Section, type SectionTone } from '@/components/ui/section';
import type { PageAction } from '@/components/sections/types';
import { cn } from '@/lib/cn';
import { PageActions } from './page-actions';
import { frenchSpacing } from '@/lib/typography';

export type InfoPanel = {
  id: string;
  eyebrow: string;
  title: string;
  text: string;
  /** Points énumérés sous le texte. */
  points?: ReadonlyArray<string>;
  action?: PageAction;
  tone?: PanelTone;
};

type PanelTone = 'default' | 'accent' | 'inverse';

const PANEL_TONES: Record<PanelTone, string> = {
  default: 'bg-surface border-line',
  accent: 'bg-accent-soft border-accent-muted',
  // Le ton inverse redéfinit les jetons (fond bleu nuit) : voir [data-tone='inverse'] dans globals.css.
  inverse: 'border-transparent',
};

/**
 * Deux à trois encadrés côte à côte, chacun avec son propre titre de niveau 2
 * (ex. « Rémunération » et « Conseil »). Le ton « inverse » donne un encadré bleu nuit tissé.
 */
export function InfoPanels({
  panels,
  tone = 'default',
}: {
  panels: ReadonlyArray<InfoPanel>;
  tone?: SectionTone;
}) {
  return (
    <Section tone={tone} spacing="small">
      <div
        className={cn(
          'reveal-stagger grid gap-4 lg:gap-5',
          panels.length > 2 ? 'lg:grid-cols-3' : 'md:grid-cols-2',
        )}
      >
        {panels.map((panel) => {
          const titleId = `${panel.id}-titre`;
          return (
            <section
              key={panel.id}
              id={panel.id}
              aria-labelledby={titleId}
              data-tone={panel.tone === 'inverse' ? 'inverse' : undefined}
              className={cn(
                'rounded-panel relative isolate flex flex-col overflow-hidden border p-7 shadow-xs sm:p-9',
                PANEL_TONES[panel.tone ?? 'default'],
              )}
            >
              {panel.tone === 'inverse' ? (
                <WeavePattern className="text-accent-bright pointer-events-none absolute inset-0 -z-10 size-full [mask-image:linear-gradient(to_left,black,transparent_75%)] opacity-15" />
              ) : null}
              <div className="flex flex-1 flex-col">
                <Eyebrow>{panel.eyebrow}</Eyebrow>
                <Heading id={titleId} size="h3" className="mt-4">
                  {frenchSpacing(panel.title)}
                </Heading>
                <p className="text-ink-muted mt-4 max-w-xl">{frenchSpacing(panel.text)}</p>
                {panel.points ? (
                  <ul className="text-ink mt-5 list-none space-y-2">
                    {panel.points.map((point) => (
                      <li key={point} className="flex gap-2.5">
                        <span aria-hidden="true" className="bg-accent mt-2 size-1.5 shrink-0 rotate-45" />
                        {point}
                      </li>
                    ))}
                  </ul>
                ) : null}
                {panel.action ? (
                  <PageActions actions={[panel.action]} size="md" className="mt-auto pt-8" />
                ) : null}
              </div>
            </section>
          );
        })}
      </div>
    </Section>
  );
}
