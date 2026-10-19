import type { ReactNode } from 'react';
import { Badge, type BadgeTone } from '@/components/ui/badge';
import { Section, type SectionTone } from '@/components/ui/section';
import { SectionHeader } from '@/components/ui/section-header';
import type { SectionIntro, Step, StepActor } from '@/content/metier-page';
import { getDictionary } from '@/i18n';
import { cn } from '@/lib/cn';
import { frenchSpacing } from '@/lib/typography';

const ACTOR_TONES: Record<StepActor, BadgeTone> = { client: 'accent', ksp: 'brand', tiers: 'neutral' };

function actorLabel(step: Step): string {
  const t = getDictionary();
  if (step.actor === 'tiers') return step.actorLabel ?? '';
  return t.metier.actors[step.actor];
}

/**
 * Parcours en étapes numérotées, reliées par un fil vertical ; chaque étape dit qui agit
 * (« Vous », « KSP » ou un tiers), en texte : la couleur n'est qu'un repère.
 */
export function StepList({ steps, className }: { steps: ReadonlyArray<Step>; className?: string }) {
  return (
    <ol className={cn('reveal-stagger', className)}>
      {steps.map((step, index) => (
        <li
          key={step.title}
          className={cn(
            'relative grid grid-cols-[2.75rem_minmax(0,1fr)] gap-x-5 pb-10 last:pb-0 sm:gap-x-6',
            // Fil qui relie les étapes, sous le losange numéroté.
            'before:bg-line-strong before:absolute before:top-12 before:bottom-2 before:left-[1.3125rem] before:w-px last:before:hidden',
          )}
        >
          <span aria-hidden="true" className="relative grid size-11 place-items-center">
            <span className="bg-accent-soft border-accent-muted absolute inset-1.5 rotate-45 rounded-[0.375rem] border" />
            <span className="font-display text-accent-ink relative text-base font-semibold tabular-nums">
              {index + 1}
            </span>
          </span>
          <div className="pt-1.5">
            <Badge tone={ACTOR_TONES[step.actor]}>{actorLabel(step)}</Badge>
            <h3 className="font-display text-h3 text-ink mt-3 font-semibold">
              <span className="sr-only">Étape {index + 1} : </span>
              {frenchSpacing(step.title)}
            </h3>
            <p className="text-ink-muted mt-2 max-w-xl">{frenchSpacing(step.text)}</p>
          </div>
        </li>
      ))}
    </ol>
  );
}

/** Section « étapes » : en-tête fixe à gauche sur ordinateur, parcours à droite. */
export function StepsSection({
  id,
  intro,
  steps,
  aside,
  tone = 'default',
}: {
  id: string;
  intro: SectionIntro;
  steps: ReadonlyArray<Step>;
  /** Contenu ajouté sous l'en-tête (note, encadré). */
  aside?: ReactNode;
  tone?: SectionTone;
}) {
  const titleId = `${id}-titre`;
  return (
    <Section id={id} labelledBy={titleId} tone={tone}>
      <div className="grid gap-12 lg:grid-cols-12 lg:gap-10">
        <div className="lg:col-span-5">
          <div className="lg:sticky lg:top-[calc(var(--header-h)+2.5rem)]">
            <SectionHeader id={titleId} eyebrow={intro.eyebrow} title={intro.title} lead={intro.lead} />
            {aside ? <div className="reveal mt-8">{aside}</div> : null}
          </div>
        </div>
        <StepList steps={steps} className="lg:col-span-7 lg:pt-2" />
      </div>
    </Section>
  );
}
