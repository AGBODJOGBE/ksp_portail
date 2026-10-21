import Image from 'next/image';
import Link from 'next/link';
import { WeavePattern } from '@/components/ui/brand/weave';
import { IconArrowRight, IconImage } from '@/components/ui/icons';
import { Badge } from '@/components/ui/badge';
import { ButtonArrow, ButtonLink } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Placeholder } from '@/components/ui/placeholder';
import { Section } from '@/components/ui/section';
import { SectionHeader } from '@/components/ui/section-header';
import type { HomeContent } from '@/features/home/content';
import { metiers } from '@/config/metiers';

const numberFormat = new Intl.NumberFormat('fr-BJ');
const metierLabel = (id: string) => metiers.find((metier) => metier.id === id)?.label ?? '';

/* Nombre d'emplacements « à venir » affichés tant que le contenu n'est pas fourni. */
const PENDING_FIGURES = 4;
const PENDING_REALISATIONS = 3;
const PENDING_TESTIMONIALS = 3;

/** Chiffres clés : rendus seulement s'ils sont fournis par le contenu, jamais inventés. */
export function KeyFiguresSection({ content }: { content: HomeContent['keyFigures'] }) {
  return (
    <Section id="chiffres" labelledBy="chiffres-titre" tone="muted" spacing="small">
      <SectionHeader
        id="chiffres-titre"
        eyebrow={content.eyebrow}
        title={content.title}
        lead={content.items.length > 0 ? undefined : content.pending}
      />
      {content.items.length > 0 ? (
        <dl className="reveal-stagger mt-10 grid grid-cols-2 gap-x-6 gap-y-10 lg:grid-cols-4">
          {content.items.map((figure) => (
            <div key={figure.label} className="border-accent flex flex-col border-l-2 pl-5">
              <dt className="text-small text-ink-muted">{figure.label}</dt>
              <dd className="font-display text-h1 text-ink order-first font-semibold tabular-nums">
                {numberFormat.format(figure.value)}
                {figure.unit ? <span className="text-h3 ml-1">{figure.unit}</span> : null}
              </dd>
            </div>
          ))}
        </dl>
      ) : (
        <ul className="reveal-stagger mt-10 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
          {Array.from({ length: PENDING_FIGURES }, (_, index) => (
            <Placeholder as="li" key={index} title="Chiffre clé à venir" />
          ))}
        </ul>
      )}
    </Section>
  );
}

/** Réalisations récentes : photos réelles uniquement (CMS) ; sinon, emplacements « à venir ». */
export function RealisationsSection({ content }: { content: HomeContent['realisations'] }) {
  return (
    <Section id="realisations" labelledBy="realisations-titre">
      <SectionHeader
        id="realisations-titre"
        eyebrow={content.eyebrow}
        title={content.title}
        lead={content.items.length > 0 ? undefined : content.pending}
        action={
          <ButtonLink href={content.allHref} variant="secondary">
            {content.allLabel}
            <ButtonArrow>
              <IconArrowRight />
            </ButtonArrow>
          </ButtonLink>
        }
      />
      <ul className="reveal-stagger mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {content.items.length > 0
          ? content.items.map((item) => (
              <Card as="li" key={item.id} interactive className="overflow-hidden p-0">
                <Image
                  src={item.image.src}
                  alt={item.image.alt}
                  width={item.image.width}
                  height={item.image.height}
                  sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                  className="aspect-[4/3] w-full object-cover"
                />
                <div className="p-6">
                  <Badge tone="accent">{metierLabel(item.metierId)}</Badge>
                  <h3 className="font-display text-h3 text-ink mt-3 font-semibold">
                    <Link href={item.href} className="stretched-link focus-visible:outline-none">
                      {item.title}
                    </Link>
                  </h3>
                  {item.place ? <p className="text-small text-ink-muted mt-1">{item.place}</p> : null}
                </div>
              </Card>
            ))
          : Array.from({ length: PENDING_REALISATIONS }, (_, index) => (
              <Placeholder
                as="li"
                key={index}
                title="Réalisation à venir"
                className={index > 0 ? 'max-sm:hidden' : undefined}
                media={
                  <span className="bg-surface-sunken relative grid aspect-[4/3] place-items-center overflow-hidden">
                    <WeavePattern className="text-ink-subtle absolute inset-0 size-full opacity-10" />
                    <IconImage className="text-ink-subtle relative size-8" />
                  </span>
                }
              >
                Photo et description publiées prochainement.
              </Placeholder>
            ))}
      </ul>
    </Section>
  );
}

/** Témoignages : publiés avec l'accord des clients ; sinon, emplacement « à venir ». */
export function TestimonialsSection({ content }: { content: HomeContent['testimonials'] }) {
  return (
    <Section id="temoignages" labelledBy="temoignages-titre" tone="inverse" className="overflow-hidden">
      <WeavePattern className="text-accent-bright pointer-events-none absolute inset-0 size-full [mask-image:linear-gradient(to_bottom,transparent,black)] opacity-10" />
      <div className="relative">
        <SectionHeader
          id="temoignages-titre"
          eyebrow={content.eyebrow}
          title={content.title}
          lead={content.items.length > 0 ? undefined : content.pending}
        />
        {content.items.length > 0 ? (
          <ul className="reveal-stagger mt-12 grid gap-5 lg:grid-cols-3">
            {content.items.map((item) => (
              <li key={item.id}>
                <figure className="rounded-card border-line bg-surface flex h-full flex-col border p-7">
                  <blockquote className="font-display text-ink text-xl leading-snug">
                    <p>« {item.quote} »</p>
                  </blockquote>
                  <figcaption className="text-small text-ink-muted mt-6">
                    <span className="text-ink block font-semibold">{item.author}</span>
                    {item.context ? `${item.context} · ` : null}
                    {metierLabel(item.metierId)}
                  </figcaption>
                </figure>
              </li>
            ))}
          </ul>
        ) : (
          <ul className="reveal-stagger mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: PENDING_TESTIMONIALS }, (_, index) => (
              <Placeholder
                as="li"
                key={index}
                title="Témoignage à venir"
                className={index > 0 ? 'max-sm:hidden' : undefined}
                media={
                  <span
                    aria-hidden="true"
                    className="font-display text-accent-ink px-6 pt-6 text-6xl leading-none"
                  >
                    «
                  </span>
                }
              />
            ))}
          </ul>
        )}
      </div>
    </Section>
  );
}
