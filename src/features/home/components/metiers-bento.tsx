import Link from 'next/link';
import type { ReactNode } from 'react';
import { SignatureBackdrop, SignatureProgress } from '@/components/ui/brand/signature';
import { Badge } from '@/components/ui/badge';
import { Container } from '@/components/ui/container';
import { IconArrowRight, IconCheck, IconClock, IconImage } from '@/components/ui/icons';
import { MetierIcon } from '@/components/sections/metier-icon';
import { SectionHeader } from '@/components/ui/section-header';
import type { HomeContent } from '@/features/home/content';
import type { Metier, MetierId } from '@/config/metiers';
import { cn } from '@/lib/cn';

/** État d'ouverture d'un métier, lu dans le contenu de sa page (« Ouverture prochaine »…). */
export type MetierStatus = { label: string; live?: boolean };

type Look = 'night' | 'fresh' | 'plain';

/*
 * Grille « bento » : 1 colonne sur téléphone, 2 sur tablette, 3 sur ordinateur.
 *   ┌───────────────┬───────┐
 *   │ Recouvrement  │ Netto-│
 *   ├───────────────┤ yage  │
 *   │ Immobilier    │       │
 *   ├───────┬───────┼───────┤
 *   │ Impr. │ Mark. │ Livr. │
 *   └───────┴───────┴───────┘
 * Sur téléphone, le même ordre se lit de haut en bas.
 */
const LAYOUT: Record<MetierId, { look: Look; className: string; featured?: boolean }> = {
  recouvrement: { look: 'night', className: 'sm:col-span-2', featured: true },
  nettoyage: { look: 'fresh', className: 'lg:row-span-2', featured: true },
  immobilier: { look: 'plain', className: 'sm:col-span-2', featured: true },
  impression: { look: 'plain', className: '' },
  marketplace: { look: 'plain', className: '' },
  livraison: { look: 'plain', className: 'sm:col-span-2 lg:col-span-1' },
};

/*
 * Petites illustrations propres à chaque métier mis en avant : uniquement des libellés réels du parcours,
 * jamais de chiffre. Décoratives (masquées aux lecteurs d'écran).
 */
const RECOVERY_STEPS = [{ label: 'Dossier déposé' }, { label: 'Relance' }, { label: 'Encaissement' }];
const CLEANING_STEPS = [
  'Estimation immédiate',
  'Visite des lieux',
  'Devis et réservation',
  'Suivi des passages',
];

function Visual({ id }: { id: MetierId }): ReactNode {
  if (id === 'recouvrement') {
    return (
      <div aria-hidden="true" className="rounded-card border-line bg-brand-soft mt-6 border p-4 sm:max-w-md">
        <SignatureProgress steps={RECOVERY_STEPS} current={1} label="" />
      </div>
    );
  }
  if (id === 'nettoyage') {
    return (
      <ol
        aria-hidden="true"
        className="rounded-card border-line bg-surface relative mt-6 grid gap-3.5 border p-4 shadow-xs lg:mt-auto"
      >
        <span className="grow-y from-signature-1 via-signature-2 to-signature-3 absolute top-7 bottom-7 left-[1.6875rem] w-0.5 bg-linear-to-b" />
        {CLEANING_STEPS.map((step, index) => (
          <li key={step} className="text-small text-ink relative flex items-center gap-3 font-medium">
            <span
              className={cn(
                'grid size-6 shrink-0 place-items-center rounded-full',
                index === 0
                  ? 'bg-action text-on-action'
                  : 'bg-surface text-ink-subtle ring-line-strong ring-1',
              )}
            >
              {index === 0 ? (
                <IconCheck className="size-3.5" />
              ) : (
                <span className="size-1.5 rounded-full bg-current" />
              )}
            </span>
            {step}
          </li>
        ))}
      </ol>
    );
  }
  if (id === 'immobilier') {
    return (
      <div aria-hidden="true" className="mt-6 grid max-w-sm grid-cols-4 gap-2">
        {Array.from({ length: 4 }, (_, index) => (
          <span
            key={index}
            className="rounded-control bg-surface-sunken text-ink-subtle grid aspect-square place-items-center"
          >
            <IconImage className="size-5" />
          </span>
        ))}
      </div>
    );
  }
  return null;
}

function StatusBadge({ status, className }: { status: MetierStatus; className?: string }) {
  return (
    <Badge tone={status.live ? 'action' : 'neutral'} dot={status.live} className={className}>
      {status.live ? null : <IconClock className="size-3.5" />}
      {status.label}
    </Badge>
  );
}

function MetierCard({ metier, status }: { metier: Metier; status?: MetierStatus }) {
  const layout = LAYOUT[metier.id];
  const night = layout.look === 'night';
  return (
    <li
      data-tone={night ? 'inverse' : undefined}
      className={cn(
        'group/card rounded-card relative isolate flex flex-col overflow-hidden border p-6 sm:p-7',
        'ease-soft transition-[transform,box-shadow] duration-(--motion-slow) motion-safe:hover:-translate-y-1',
        'has-[.stretched-link:focus-visible]:outline-2 has-[.stretched-link:focus-visible]:outline-offset-3',
        night
          ? 'hero-band shadow-card hover:shadow-float has-[.stretched-link:focus-visible]:outline-brand-600 border-transparent'
          : 'border-line hover:shadow-card has-[.stretched-link:focus-visible]:outline-focus shadow-xs',
        layout.look === 'fresh' && 'from-action-soft to-surface bg-linear-to-b',
        layout.look === 'plain' && 'bg-surface',
        // Fil de la signature qui se déploie au survol, sur le bord haut.
        'before:from-signature-1 before:via-signature-2 before:to-signature-3 before:ease-soft before:absolute before:inset-x-0 before:top-0 before:h-[3px] before:origin-left before:scale-x-0 before:bg-linear-to-r before:transition-transform before:duration-(--motion-slow) hover:before:scale-x-100',
        layout.featured && 'lg:min-h-80',
        layout.className,
      )}
    >
      {night ? (
        <SignatureBackdrop className="absolute inset-y-0 right-0 -z-10 h-full w-2/3 [mask-image:linear-gradient(to_left,black,transparent)] opacity-20" />
      ) : null}
      <div className="flex items-start justify-between gap-3">
        <span
          aria-hidden="true"
          className={cn(
            'rounded-icon grid size-12 shrink-0 place-items-center transition-colors duration-(--motion-base)',
            night ? 'bg-accent text-on-accent' : 'bg-brand text-on-brand group-hover/card:text-accent-bright',
          )}
        >
          <MetierIcon id={metier.id} className="size-6" />
        </span>
        {status && layout.featured ? <StatusBadge status={status} /> : null}
      </div>
      <h3
        className={cn(
          'font-display text-ink mt-6 font-semibold',
          layout.featured ? 'max-w-md' : 'text-h3',
          layout.featured &&
            (layout.className.includes('row-span') ? 'text-h2 lg:text-[1.875rem]' : 'text-h2'),
        )}
      >
        <Link href={metier.href} className="stretched-link focus-visible:outline-none">
          {metier.label}
        </Link>
      </h3>
      <p className={cn('text-ink-muted mt-3 max-w-md', !layout.featured && 'text-small')}>{metier.summary}</p>
      {status && !layout.featured ? (
        <StatusBadge status={status} className="mt-4 self-start rounded-xl py-1 leading-snug" />
      ) : null}
      <Visual id={metier.id} />
      <span
        className={cn(
          'relative mt-auto inline-flex items-center gap-2 self-start pt-6 font-semibold',
          night ? 'text-accent-ink' : 'text-action-ink',
        )}
      >
        {metier.action}
        <IconArrowRight className="ease-soft size-4 transition-transform duration-(--motion-base) group-hover/card:translate-x-1" />
      </span>
    </li>
  );
}

/**
 * Les six métiers du groupe, sur une feuille blanche qui chevauche la bande héros : chaque carte mène à
 * son métier, dit son état d'ouverture et, pour les métiers mis en avant, montre la forme de son parcours.
 */
export function MetiersBento({
  content,
  metiers,
  statuses = {},
}: {
  content: HomeContent['metiers'];
  metiers: ReadonlyArray<Metier>;
  statuses?: Partial<Record<MetierId, MetierStatus>>;
}) {
  return (
    <section id="metiers" aria-labelledby="metiers-titre" className="relative scroll-mt-(--header-h)">
      <Container className="relative -mt-20 sm:-mt-24 lg:-mt-28">
        <div className="rounded-panel border-line bg-surface shadow-float border p-5 sm:p-8 lg:p-10">
          <SectionHeader
            id="metiers-titre"
            eyebrow={content.eyebrow}
            title={content.title}
            lead={content.lead}
          />
          <ul className="reveal-stagger mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 lg:gap-5">
            {metiers.map((metier) => (
              <MetierCard key={metier.id} metier={metier} status={statuses[metier.id]} />
            ))}
          </ul>
        </div>
      </Container>
    </section>
  );
}
