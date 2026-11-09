import type { CSSProperties, JSX } from 'react';
import { SignatureArrow, SignatureBackdrop } from '@/components/ui/brand/signature';
import { ButtonArrow, ButtonLink } from '@/components/ui/button';
import {
  IconArrowRight,
  IconCard,
  IconClock,
  IconFileCheck,
  IconPin,
  IconUser,
  type IconProps,
} from '@/components/ui/icons';
import { Section } from '@/components/ui/section';
import { SectionHeader } from '@/components/ui/section-header';
import type { HomeContent } from '@/features/home/content';
import { cn } from '@/lib/cn';
import { frenchSpacing } from '@/lib/typography';

/**
 * « Comment ça marche » : quatre étapes communes à tous les métiers, reliées par le fil de la signature
 * (bleu nuit, vert, flèche or) qui se trace au défilement. Horizontal sur ordinateur, vertical sur
 * téléphone.
 */
export function HomeJourney({ content }: { content: HomeContent['journey'] }) {
  const last = content.steps.length - 1;
  return (
    <Section id="comment-ca-marche" labelledBy="comment-titre">
      <SectionHeader id="comment-titre" eyebrow={content.eyebrow} title={content.title} lead={content.lead} />
      <ol className="reveal-stagger relative mt-14 grid gap-10 lg:grid-cols-4 lg:gap-8">
        {/* Fil de la signature : vertical sur téléphone, horizontal sur ordinateur. */}
        <span
          aria-hidden="true"
          className="reveal-grow-y from-signature-1 via-signature-2 to-signature-3 absolute top-6 bottom-6 left-[1.4375rem] w-0.5 rounded-full bg-linear-to-b lg:hidden"
        />
        <span
          aria-hidden="true"
          className="reveal-grow-x absolute top-[1.4375rem] right-[12%] left-6 hidden h-0.5 items-center lg:flex"
        >
          <span className="bg-signature-1 h-full basis-[38%] rounded-l-full" />
          <span className="bg-signature-2 h-full flex-1" />
          <SignatureArrow className="-ml-0.5 h-3.5 w-3" />
        </span>
        {content.steps.map((step, index) => (
          <li key={step.title} className="relative grid grid-cols-[3rem_minmax(0,1fr)] gap-x-5 lg:block">
            <span
              aria-hidden="true"
              className={cn(
                'font-display relative grid size-12 place-items-center rounded-full text-lg font-semibold tabular-nums ring-8',
                'ring-canvas shadow-sm',
                index === last ? 'bg-action text-on-action' : 'bg-brand text-on-brand',
              )}
            >
              {index + 1}
            </span>
            <div className="pt-2 lg:pt-7">
              <h3 className="font-display text-h3 text-ink font-semibold">
                <span className="sr-only">Étape {index + 1} : </span>
                {frenchSpacing(step.title)}
              </h3>
              <p className="text-ink-muted mt-2 max-w-xs">{frenchSpacing(step.text)}</p>
            </div>
          </li>
        ))}
      </ol>
    </Section>
  );
}

const TRUST_ICONS: Record<string, (props: IconProps) => JSX.Element> = {
  user: IconUser,
  file: IconFileCheck,
  clock: IconClock,
  card: IconCard,
};

/** Raisons de confiance : des engagements vérifiables, sans chiffre ni promesse invérifiable. */
export function TrustSection({ content }: { content: HomeContent['trust'] }) {
  return (
    <Section id="pourquoi-ksp" labelledBy="confiance-titre" tone="muted">
      <div className="grid gap-12 lg:grid-cols-12 lg:gap-10">
        <div className="lg:col-span-4">
          <SectionHeader
            id="confiance-titre"
            eyebrow={content.eyebrow}
            title={content.title}
            lead={content.lead}
          />
        </div>
        <ul className="reveal-stagger grid gap-4 sm:grid-cols-2 lg:col-span-8 lg:gap-5">
          {content.items.map((item) => {
            const Icon = TRUST_ICONS[item.icon] ?? IconFileCheck;
            return (
              <li
                key={item.title}
                className="rounded-card border-line bg-surface shadow-card relative overflow-hidden border p-6 sm:p-7"
              >
                <span
                  aria-hidden="true"
                  className="rounded-icon bg-brand text-on-brand grid size-12 place-items-center"
                >
                  <Icon className="size-6" />
                </span>
                <h3 className="font-display text-ink mt-5 text-xl leading-snug font-semibold">
                  {item.title}
                </h3>
                <p className="text-ink-muted mt-2">{frenchSpacing(item.text)}</p>
              </li>
            );
          })}
        </ul>
      </div>
    </Section>
  );
}

/** Anneaux concentriques et repères : illustration décorative (aucune position géographique réelle). */
function ZonesRadar({ count }: { count: number }) {
  const dots = Array.from({ length: Math.min(count, 6) }, (_, index) => {
    const angle = (index / Math.max(count, 1)) * Math.PI * 2 - Math.PI / 3;
    const radius = index % 2 === 0 ? 62 : 96;
    return { x: 140 + Math.cos(angle) * radius, y: 140 + Math.sin(angle) * radius };
  });
  return (
    <svg viewBox="0 0 280 280" aria-hidden="true" focusable="false" className="w-full max-w-72">
      {[40, 80, 120].map((r) => (
        <circle
          key={r}
          cx="140"
          cy="140"
          r={r}
          className="stroke-line-strong fill-none"
          strokeDasharray="3 6"
        />
      ))}
      <circle cx="140" cy="140" r="22" className="fill-brand" />
      <path d="M133 132L151 140L133 148Z" className="fill-signature-3" />
      {dots.map((dot, index) => (
        <g
          key={index}
          className="pop origin-center [transform-box:fill-box]"
          style={{ '--i': index } as CSSProperties}
        >
          <circle cx={dot.x} cy={dot.y} r="13" className="fill-action-soft" />
          <circle cx={dot.x} cy={dot.y} r="6" className="fill-action" />
        </g>
      ))}
    </svg>
  );
}

/**
 * Zones desservies du Nettoyage, lues auprès de la gateway (`GET /api/v1/cleaning/zones`) au build puis
 * revalidées : rien n'est affiché si la liste n'a pas pu être lue.
 */
export function ZonesSection({
  content,
  communes,
}: {
  content: HomeContent['zones'];
  communes: ReadonlyArray<string>;
}) {
  return (
    <Section id="zones" labelledBy="zones-titre" spacing="small">
      <div className="rounded-panel border-line bg-surface shadow-card grid items-center gap-10 overflow-hidden border p-6 sm:p-10 lg:grid-cols-12">
        <div className="lg:col-span-7">
          <SectionHeader
            id="zones-titre"
            eyebrow={content.eyebrow}
            title={content.title}
            lead={content.lead}
          />
          <ul className="reveal-stagger mt-8 flex flex-wrap gap-2.5">
            {communes.map((commune) => (
              <li
                key={commune}
                className="border-line bg-surface-muted text-ink inline-flex min-h-11 items-center gap-2 rounded-full border py-2 pr-4 pl-3 font-semibold"
              >
                <IconPin className="text-action-ink size-4" />
                {commune}
              </li>
            ))}
          </ul>
          <ButtonLink href={content.action.href} variant="action" className="mt-8">
            {content.action.label}
            <ButtonArrow>
              <IconArrowRight />
            </ButtonArrow>
          </ButtonLink>
        </div>
        <div className="relative hidden justify-items-center lg:col-span-5 lg:grid">
          <SignatureBackdrop className="absolute inset-0 -z-0 size-full [mask-image:radial-gradient(circle,black,transparent_70%)] opacity-[0.06]" />
          <ZonesRadar count={communes.length} />
        </div>
      </div>
    </Section>
  );
}
