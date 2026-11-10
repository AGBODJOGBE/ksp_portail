import Link from 'next/link';
import { MetierGlyph } from '@/components/sections/metier-glyph';
import { Container } from '@/components/ui/container';
import { Eyebrow } from '@/components/ui/eyebrow';
import { IconChevronRight } from '@/components/ui/icons';
import { ServiceCard, type ServiceEntry } from '@/features/services';
import type { HomeContent } from '@/features/home/content';
import { frenchSpacing } from '@/lib/typography';

const numberFormat = new Intl.NumberFormat('fr-BJ');

/* Nombre d'emplacements « à venir » affichés tant que les chiffres ne sont pas fournis. */
const PENDING_FIGURES = 4;

/** En-tête de section : surtitre, titre et sous-titre à gauche, lien « Voir tous » à droite. */
function SectionTop({
  id,
  eyebrow,
  title,
  lead,
  link,
}: {
  id: string;
  eyebrow: string;
  title: string;
  lead?: string;
  link?: { label: string; href: string };
}) {
  return (
    <div className="reveal flex flex-col gap-4 md:flex-row md:items-end md:justify-between md:gap-10">
      <div className="max-w-4xl md:flex-1">
        <Eyebrow>{eyebrow}</Eyebrow>
        <h2 id={id} className="font-display text-h2 text-ink mt-3 font-bold">
          {frenchSpacing(title)}
        </h2>
        {lead ? <p className="text-lead text-ink-muted mt-3">{frenchSpacing(lead)}</p> : null}
      </div>
      {link ? (
        <Link
          href={link.href}
          className="text-brand-ink font-display inline-flex min-h-11 shrink-0 items-center gap-1.5 text-lg font-semibold underline-offset-4 hover:underline"
        >
          {link.label}
          <IconChevronRight className="size-5" />
        </Link>
      ) : null}
    </div>
  );
}

/** Chiffres clés : un bloc blanc ; rendus seulement s'ils sont fournis, sinon emplacements « à venir ». */
export function KeyFiguresSection({ content }: { content: HomeContent['keyFigures'] }) {
  const hasFigures = content.items.length > 0;
  return (
    <section id="chiffres" aria-labelledby="chiffres-titre" className="pt-8 sm:pt-12">
      <Container size="wide">
        <div className="rounded-panel border-line bg-surface border px-6 py-8 shadow-xs sm:px-10 lg:px-14">
          <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
            <h2 id="chiffres-titre" className="font-display text-ink text-lg font-bold">
              {content.title}
            </h2>
            {hasFigures ? null : <p className="text-small text-ink-muted">{content.pending}</p>}
          </div>
          {hasFigures ? (
            <dl className="mt-6 grid grid-cols-2 gap-x-6 gap-y-8 lg:grid-cols-4">
              {content.items.map((figure) => (
                <div key={figure.label} className="flex flex-col">
                  <dt className="text-ink-muted mt-1">{figure.label}</dt>
                  <dd className="font-display text-brand-700 order-first text-4xl font-bold tabular-nums">
                    {numberFormat.format(figure.value)}
                    {figure.unit ? <span className="ml-1 text-2xl">{figure.unit}</span> : null}
                  </dd>
                </div>
              ))}
            </dl>
          ) : (
            <ul className="mt-6 grid grid-cols-2 gap-x-6 gap-y-8 lg:grid-cols-4">
              {Array.from({ length: PENDING_FIGURES }, (_, index) => (
                <li key={index} data-placeholder="" className="flex flex-col gap-2">
                  {/* Silhouette d'un chiffre, sans valeur : la place du futur chiffre clé. */}
                  <span aria-hidden="true" className="flex items-end gap-1.5">
                    <span className="bg-brand-100 h-10 w-20 rounded-lg" />
                    <span className="bg-brand-100 h-5 w-6 rounded" />
                  </span>
                  <span className="text-ink-muted">Chiffre clé à venir</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </Container>
    </section>
  );
}

/** « Votre besoin » : une carte par situation, icône illustrée, titre et texte, vers le bon service. */
export function NeedsSection({ content }: { content: HomeContent['needs'] }) {
  return (
    <section id="votre-besoin" aria-labelledby="besoin-titre" className="py-section scroll-mt-(--header-h)">
      <Container size="wide">
        <SectionTop
          id="besoin-titre"
          eyebrow={content.eyebrow}
          title={content.title}
          lead={content.lead}
          link={content.all}
        />
        <ul className="reveal-stagger mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {content.items.map((need) => (
            <li key={need.title}>
              <article className="group/card rounded-card border-line bg-surface ease-soft hover:shadow-card has-[a:focus-visible]:outline-focus relative flex h-full flex-col border p-6 shadow-xs transition-[translate,box-shadow] duration-(--motion-slow) hover:-translate-y-1 has-[a:focus-visible]:outline-2 has-[a:focus-visible]:outline-offset-3">
                <MetierGlyph id={need.metierId} className="size-16" />
                <h3 className="font-display text-h3 text-ink mt-5 font-bold">
                  <Link href={need.href} className="stretched-link focus-visible:outline-none">
                    {need.title}
                  </Link>
                </h3>
                <p className="text-ink-muted mt-2">{need.text}</p>
              </article>
            </li>
          ))}
        </ul>
      </Container>
    </section>
  );
}

/** « Les services à la une » : quelques cartes de l'annuaire, au style de la page « Tous nos services ». */
export function FeaturedServices({
  content,
  services,
}: {
  content: HomeContent['featured'];
  services: ReadonlyArray<ServiceEntry>;
}) {
  if (!services.length) return null;
  return (
    <section aria-labelledby="une-titre" className="bg-surface-muted py-section">
      <Container size="wide">
        <SectionTop
          id="une-titre"
          eyebrow={content.eyebrow}
          title={content.title}
          lead={content.lead}
          link={content.all}
        />
        <ul className="reveal-stagger mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {services.map((entry) => (
            <li key={entry.id}>
              <ServiceCard entry={entry} headingLevel="h3" />
            </li>
          ))}
        </ul>
      </Container>
    </section>
  );
}
