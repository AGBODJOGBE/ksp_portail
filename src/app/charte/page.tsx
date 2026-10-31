import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { ReactNode } from 'react';
import { LogoMark } from '@/components/ui/brand/logo';
import {
  SignatureArrow,
  SignatureBackdrop,
  SignatureProgress,
  SignatureRule,
} from '@/components/ui/brand/signature';
import {
  IconArrowRight,
  IconArrowUpRight,
  IconCheck,
  IconChevronDown,
  IconClock,
  IconClose,
  IconImmobilier,
  IconImpression,
  IconLivraison,
  IconMarketplace,
  IconMenu,
  IconNettoyage,
  IconRecouvrement,
  IconUser,
  IconWhatsApp,
} from '@/components/ui/icons';
import { MetierIcon } from '@/components/sections/metier-icon';
import { Badge } from '@/components/ui/badge';
import { Button, ButtonArrow, ButtonLink } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Container } from '@/components/ui/container';
import { Eyebrow } from '@/components/ui/eyebrow';
import { Heading } from '@/components/ui/heading';
import { Placeholder } from '@/components/ui/placeholder';
import { Section } from '@/components/ui/section';
import { metiers } from '@/config/metiers';
import { siteConfig } from '@/config/site';
import { cn } from '@/lib/cn';
import { ContrastPair, TokenValue } from '@/components/ui/token-inspector';

/**
 * Charte vivante : jetons, police, motif et composants de base, rendus avec le vrai code.
 * Outil de travail réservé au développement : la page n'existe pas en production.
 */
export const metadata: Metadata = {
  title: 'Charte',
  robots: { index: false, follow: false },
};

const SECTIONS = [
  { id: 'couleurs', label: 'Couleurs' },
  { id: 'typographie', label: 'Typographie' },
  { id: 'espaces', label: 'Espaces et formes' },
  { id: 'mouvement', label: 'Mouvement' },
  { id: 'logo', label: 'Logo' },
  { id: 'signature', label: 'Signature' },
  { id: 'composants', label: 'Composants' },
] as const;

/* Noms de jetons uniquement : les valeurs sont lues dans le navigateur (TokenValue). */
const SCALES: ReadonlyArray<{ name: string; prefix: string; steps: ReadonlyArray<number | string> }> = [
  {
    name: 'Bleu nuit du logo (#0F2850 = 900) — marque',
    prefix: 'brand',
    steps: [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950],
  },
  {
    name: 'Vert du logo (#008651 = 600) — action et succès',
    prefix: 'green',
    steps: [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950],
  },
  {
    name: 'Or de la flèche (#D4A018 = 500) — accent, jamais en texte sur fond clair',
    prefix: 'gold',
    steps: [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950],
  },
  { name: 'Neutres froids', prefix: 'neutral', steps: [25, 50, 100, 200, 300, 400, 500, 600, 700] },
];

const ROLE_SWATCHES = ['brand', 'action', 'accent', 'focus'] as const;
const STATE_SWATCHES = ['success', 'warning', 'danger', 'whatsapp'] as const;

const PAIRS: ReadonlyArray<{ label: string; fg: string; bg: string }> = [
  { label: 'Texte principal', fg: '--color-ink', bg: '--color-canvas' },
  { label: 'Texte secondaire', fg: '--color-ink-muted', bg: '--color-canvas' },
  { label: 'Texte discret', fg: '--color-ink-subtle', bg: '--color-canvas' },
  { label: 'Texte secondaire sur fond doux', fg: '--color-ink-muted', bg: '--color-surface-muted' },
  { label: 'Bouton de marque (bleu nuit)', fg: '--color-on-brand', bg: '--color-brand' },
  { label: 'Bouton d’action (vert)', fg: '--color-on-action', bg: '--color-action' },
  { label: 'Survol du bouton d’action', fg: '--color-on-action', bg: '--color-action-strong' },
  { label: 'Lien d’action (vert foncé)', fg: '--color-action-ink', bg: '--color-canvas' },
  { label: 'Étiquette verte', fg: '--color-action-ink', bg: '--color-action-soft' },
  { label: 'Surtitre (bleu nuit sur fond clair)', fg: '--color-accent-ink', bg: '--color-canvas' },
  { label: 'Étiquette or (texte bleu nuit)', fg: '--color-ink', bg: '--color-accent-soft' },
  { label: 'Texte bleu nuit sur or', fg: '--color-on-accent', bg: '--color-accent' },
  { label: 'Étiquette bleu nuit', fg: '--color-brand-ink', bg: '--color-brand-soft' },
  { label: 'Or sur fond clair (interdit en texte)', fg: '--color-accent', bg: '--color-canvas' },
  { label: 'Bordure de champ (3:1 exigé)', fg: '--color-line-control', bg: '--color-surface' },
  { label: 'Succès', fg: '--color-success', bg: '--color-success-soft' },
  { label: 'Avertissement', fg: '--color-warning', bg: '--color-warning-soft' },
  { label: 'Erreur', fg: '--color-danger', bg: '--color-danger-soft' },
  { label: 'Bouton WhatsApp', fg: '--color-white', bg: '--color-whatsapp' },
];

const INVERSE_PAIRS: ReadonlyArray<{ label: string; fg: string; bg: string }> = [
  { label: 'Texte sur bleu nuit', fg: '--color-ink', bg: '--color-canvas' },
  { label: 'Texte secondaire sur bleu nuit', fg: '--color-ink-muted', bg: '--color-canvas' },
  { label: 'Surtitre or sur bleu nuit', fg: '--color-accent-ink', bg: '--color-canvas' },
  { label: 'Lien vert sur bleu nuit', fg: '--color-action-ink', bg: '--color-canvas' },
  { label: 'Bouton inversé (blanc)', fg: '--color-on-brand', bg: '--color-brand' },
  { label: 'Bouton d’action sur bleu nuit', fg: '--color-on-action', bg: '--color-action' },
];

const TYPE_SCALE: ReadonlyArray<{ token: string; label: string; className: string; sample: string }> = [
  {
    token: 'display',
    label: 'Affiche — accueil',
    className: 'font-display text-display font-semibold',
    sample: 'Un seul groupe',
  },
  {
    token: 'h1',
    label: 'Titre de page',
    className: 'font-display text-h1 font-semibold',
    sample: 'Immobilier clés en main',
  },
  {
    token: 'h2',
    label: 'Titre de section',
    className: 'font-display text-h2 font-semibold',
    sample: 'Nos réalisations',
  },
  {
    token: 'h3',
    label: 'Titre de carte',
    className: 'font-display text-h3 font-semibold',
    sample: 'Nettoyage et assainissement',
  },
  {
    token: 'lead',
    label: 'Chapeau',
    className: 'text-lead text-ink-muted',
    sample: 'Un accompagnement de bout en bout, avec un seul interlocuteur.',
  },
  {
    token: 'body',
    label: 'Texte courant (police système)',
    className: 'text-body',
    sample: 'Suivez chaque étape de votre dossier depuis votre espace KSP.',
  },
  {
    token: 'small',
    label: 'Texte secondaire',
    className: 'text-small text-ink-muted',
    sample: 'Mis à jour le 17 octobre 2026',
  },
  {
    token: 'eyebrow',
    label: 'Surtitre',
    className: 'text-eyebrow text-accent-ink font-semibold uppercase',
    sample: 'Nos métiers',
  },
];

const SPACING = [1, 2, 3, 4, 6, 8, 12, 16, 24] as const;
/* Classes écrites en entier pour que Tailwind les détecte. */
const SPACING_CLASS: Record<(typeof SPACING)[number], string> = {
  1: 'w-1',
  2: 'w-2',
  3: 'w-3',
  4: 'w-4',
  6: 'w-6',
  8: 'w-8',
  12: 'w-12',
  16: 'w-16',
  24: 'w-24',
};

const RADII = [
  { token: '--radius-control', label: 'Contrôles', className: 'rounded-control' },
  { token: '--radius-card', label: 'Cartes', className: 'rounded-card' },
  { token: '--radius-panel', label: 'Panneaux', className: 'rounded-panel' },
  { token: '—', label: 'Pastilles', className: 'rounded-full' },
] as const;

const SHADOWS = [
  { token: '--shadow-xs', label: 'Repos', className: 'shadow-xs' },
  { token: '--shadow-card', label: 'Carte', className: 'shadow-card' },
  { token: '--shadow-raised', label: 'Élévation (survol, panneaux)', className: 'shadow-raised' },
] as const;

const MOTION = [
  { token: '--motion-fast', usage: 'Appui, retour immédiat' },
  { token: '--motion-base', usage: 'Survol, ouverture de panneau' },
  { token: '--motion-slow', usage: 'Élévation des cartes, arrivée d’une page' },
  { token: '--motion-reveal', usage: 'Apparitions (référence)' },
  { token: '--ease-soft', usage: 'Courbe d’arrivée (décélération douce)' },
  { token: '--ease-exit', usage: 'Courbe de sortie (plus rapide)' },
] as const;

const ICONS: ReadonlyArray<{ name: string; Icon: (props: { className?: string }) => ReactNode }> = [
  { name: 'Menu', Icon: IconMenu },
  { name: 'Fermer', Icon: IconClose },
  { name: 'Flèche', Icon: IconArrowRight },
  { name: 'Lien externe', Icon: IconArrowUpRight },
  { name: 'Déplier', Icon: IconChevronDown },
  { name: 'Compte', Icon: IconUser },
  { name: 'Validé', Icon: IconCheck },
  { name: 'Bientôt', Icon: IconClock },
  { name: 'Recouvrement', Icon: IconRecouvrement },
  { name: 'Immobilier', Icon: IconImmobilier },
  { name: 'Nettoyage', Icon: IconNettoyage },
  { name: 'Impression', Icon: IconImpression },
  { name: 'Marketplace', Icon: IconMarketplace },
  { name: 'Livraison', Icon: IconLivraison },
  { name: 'WhatsApp', Icon: IconWhatsApp },
];

function SectionTitle({
  id,
  eyebrow,
  title,
  children,
}: {
  id: string;
  eyebrow: string;
  title: string;
  children?: ReactNode;
}) {
  return (
    <div className="max-w-reading">
      <Eyebrow>{eyebrow}</Eyebrow>
      <Heading id={id} className="mt-4">
        {title}
      </Heading>
      {children ? <p className="text-ink-muted mt-4">{children}</p> : null}
    </div>
  );
}

function SubTitle({ children }: { children: ReactNode }) {
  return <h3 className="font-display text-h3 text-ink mt-14 font-semibold first:mt-0">{children}</h3>;
}

function Swatch({ token, label }: { token: string; label: string }) {
  return (
    <li className="min-w-0">
      <span
        className="rounded-control border-line block h-14 border"
        style={{ backgroundColor: `var(${token})` }}
      />
      <span className="text-ink mt-2 block text-xs font-semibold">{label}</span>
      <TokenValue token={token} className="text-ink-muted block font-mono text-xs" />
    </li>
  );
}

export default function ChartePage() {
  if (process.env.NODE_ENV === 'production') notFound();

  return (
    <>
      {/* En-tête de la charte */}
      <div className="border-line relative overflow-hidden border-b">
        <SignatureBackdrop className="absolute inset-0 size-full [mask-image:linear-gradient(105deg,transparent_35%,black_85%)] opacity-[0.08]" />
        <Container className="relative py-16 sm:py-24">
          <Badge tone="warning">
            <IconClock className="size-3.5" />
            Développement uniquement — absente en production
          </Badge>
          <Heading as="h1" size="display" className="mt-6 max-w-4xl">
            Charte KSP, tirée du logo
          </Heading>
          <p className="text-lead text-ink-muted mt-6 max-w-2xl">
            Trois couleurs mesurées sur le logo du groupe (F-017) : le bleu nuit pour la marque, le vert pour
            l’action, l’or pour l’accent. La barre bleu nuit, la barre verte et la flèche or forment la
            signature, fil de progression des parcours. Tout ce qui suit est rendu avec les vrais jetons et
            composants du site.
          </p>
          <nav aria-label="Sections de la charte" className="mt-10">
            <ul className="flex flex-wrap gap-2">
              {SECTIONS.map((section) => (
                <li key={section.id}>
                  <a
                    href={`#${section.id}`}
                    className="hover-veil border-line-strong text-ink inline-flex min-h-11 items-center rounded-full border px-4 text-sm font-medium"
                  >
                    {section.label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        </Container>
      </div>

      {/* Couleurs */}
      <Section id="couleurs" labelledBy="couleurs-titre">
        <SectionTitle id="couleurs-titre" eyebrow="1 · Couleurs" title="Bleu nuit, vert et or">
          Gammes construites en OKLCH autour des trois teintes du logo, qui y gardent leur valeur exacte. Les
          composants n’utilisent que les rôles sémantiques : marque (bleu nuit), action (vert), accent (or).
        </SectionTitle>
        <div className="mt-12 space-y-10">
          {SCALES.map((scale) => (
            <div key={scale.prefix}>
              <p className="text-small text-ink font-semibold">{scale.name}</p>
              <ul className="mt-3 grid grid-cols-3 gap-3 sm:grid-cols-6 lg:grid-cols-11">
                {scale.steps.map((step) => (
                  <Swatch
                    key={step}
                    token={`--color-${scale.prefix}-${step}`}
                    label={`${scale.prefix}-${step}`}
                  />
                ))}
              </ul>
            </div>
          ))}
          <div>
            <p className="text-small text-ink font-semibold">Rôles</p>
            <ul className="mt-3 grid grid-cols-3 gap-3 sm:grid-cols-6 lg:grid-cols-11">
              {ROLE_SWATCHES.map((role) => (
                <Swatch key={role} token={`--color-${role}`} label={role} />
              ))}
            </ul>
          </div>
          <div>
            <p className="text-small text-ink font-semibold">États</p>
            <ul className="mt-3 grid grid-cols-3 gap-3 sm:grid-cols-6 lg:grid-cols-11">
              {STATE_SWATCHES.map((state) => (
                <Swatch key={state} token={`--color-${state}`} label={state} />
              ))}
            </ul>
          </div>
        </div>

        <SubTitle>Rôles et contrastes mesurés</SubTitle>
        <p className="text-small text-ink-muted max-w-reading mt-3">
          Rapports calculés dans le navigateur à partir des jetons appliqués. Exigence : 4,5:1 pour le texte
          courant, 3:1 pour les grands titres et les composants d’interface. La ligne « Or sur fond clair »
          montre pourquoi l’or n’y est jamais un texte ni une icône seule.
        </p>
        <div className="mt-6 grid gap-3 md:grid-cols-2">
          {PAIRS.map((pair) => (
            <ContrastPair key={pair.label} {...pair} />
          ))}
        </div>
        <div data-tone="inverse" className="rounded-card mt-3 grid gap-3 p-3 md:grid-cols-2">
          {INVERSE_PAIRS.map((pair) => (
            <ContrastPair key={pair.label} {...pair} />
          ))}
        </div>
      </Section>

      {/* Typographie */}
      <Section id="typographie" labelledBy="typographie-titre" tone="muted">
        <SectionTitle
          id="typographie-titre"
          eyebrow="2 · Typographie"
          title="Une police de titres, le texte en système"
        >
          Bricolage Grotesque, police variable hébergée par le site (aucun appel externe), sous-ensemble
          latin, environ 40 Ko, affichée immédiatement avec une police de secours ajustée. Le texte courant
          reste en polices système.
        </SectionTitle>
        <Card className="mt-12 grid gap-8 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)] lg:items-end">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone="accent">
                <IconCheck className="size-3.5" />
                Retenue
              </Badge>
              <Badge tone="neutral">Grotesque expressive</Badge>
              <Badge tone="brand">40 Ko</Badge>
            </div>
            <p className="font-display text-ink mt-6 text-[2rem] leading-[1.04] font-semibold tracking-tight sm:text-[3rem]">
              Vos services du quotidien, réunis par un seul groupe
            </p>
          </div>
          <div className="font-display text-ink">
            <p className="text-ink-muted text-xl">
              <span className="font-light">Léger</span> · <span className="font-normal">Normal</span> ·{' '}
              <span className="font-semibold">Demi-gras</span> ·{' '}
              <span className="font-extrabold">Extra-gras</span>
            </p>
            <p className="mt-3 text-lg">À É È Ê Ç Œ « Clés en main » 0123456789 — 150 000 FCFA</p>
            <p className="text-small text-ink-muted mt-4 font-sans">
              Bricolage Grotesque · graisses 200 à 800
            </p>
          </div>
        </Card>

        <SubTitle>Échelle fluide</SubTitle>
        <p className="text-small text-ink-muted max-w-reading mt-3">
          Les tailles varient continûment de 375 à 1440 px de large (fonction <code>clamp()</code>) : aucun
          saut brutal entre téléphone et ordinateur.
        </p>
        <dl className="divide-line border-line mt-6 divide-y border-y">
          {TYPE_SCALE.map((item) => (
            <div
              key={item.token}
              className="grid gap-2 py-5 md:grid-cols-[12rem_minmax(0,1fr)] md:items-baseline"
            >
              <dt className="text-small">
                <span className="text-ink block font-semibold">{item.label}</span>
                <code className="text-ink-muted text-xs">text-{item.token}</code>
              </dt>
              <dd className={cn(item.className, 'min-w-0')}>{item.sample}</dd>
            </div>
          ))}
        </dl>
      </Section>

      {/* Espaces, rayons, ombres */}
      <Section id="espaces" labelledBy="espaces-titre">
        <SectionTitle id="espaces-titre" eyebrow="3 · Espaces et formes" title="De l’air, des angles doux">
          Grille de 4 px, marges latérales fluides (16 à 32 px), rythme vertical des sections de 64 à 128 px.
        </SectionTitle>
        <div className="mt-12 grid gap-12 lg:grid-cols-3">
          <div>
            <p className="text-small text-ink font-semibold">Espacements</p>
            <ul className="mt-4 space-y-2">
              {SPACING.map((step) => (
                <li key={step} className="text-small text-ink-muted flex items-center gap-4">
                  <span className="w-16 font-mono text-xs">{step * 4} px</span>
                  <span className={cn('bg-accent h-3 rounded-sm', SPACING_CLASS[step])} />
                </li>
              ))}
              <li className="text-small text-ink-muted flex items-center gap-4">
                <span className="w-16 font-mono text-xs">section</span>
                <TokenValue token="--spacing-section" className="font-mono text-xs" />
              </li>
            </ul>
          </div>
          <div>
            <p className="text-small text-ink font-semibold">Rayons</p>
            <ul className="mt-4 grid grid-cols-2 gap-4">
              {RADII.map((radius) => (
                <li key={radius.label}>
                  <span
                    className={cn('bg-brand-soft border-brand-200 block h-16 border', radius.className)}
                  />
                  <span className="text-ink mt-2 block text-xs font-semibold">{radius.label}</span>
                  {radius.token !== '—' ? (
                    <TokenValue token={radius.token} className="text-ink-muted font-mono text-xs" />
                  ) : null}
                </li>
              ))}
            </ul>
          </div>
          <div>
            <p className="text-small text-ink font-semibold">Ombres teintées</p>
            <ul className="mt-4 space-y-4">
              {SHADOWS.map((shadow) => (
                <li
                  key={shadow.label}
                  className={cn('rounded-card bg-surface text-small text-ink p-5', shadow.className)}
                >
                  <span className="font-semibold">{shadow.label}</span>
                  <code className="text-ink-muted block text-xs">{shadow.token}</code>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </Section>

      {/* Mouvement */}
      <Section id="mouvement" labelledBy="mouvement-titre" tone="muted">
        <SectionTitle id="mouvement-titre" eyebrow="4 · Mouvement" title="Discret, rapide, jamais bloquant">
          CSS natif uniquement, aucune bibliothèque. Seules l’opacité et la transformation sont animées ; tout
          s’arrête si l’utilisateur demande à réduire les animations.
        </SectionTitle>
        <div className="mt-12 grid gap-10 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
          <dl className="divide-line border-line divide-y self-start border-y">
            {MOTION.map((item) => (
              <div key={item.token} className="flex items-baseline justify-between gap-4 py-3">
                <dt className="text-small">
                  <code className="text-ink font-semibold">{item.token}</code>
                  <span className="text-ink-muted block">{item.usage}</span>
                </dt>
                <dd>
                  <TokenValue token={item.token} className="text-ink-muted font-mono text-xs" />
                </dd>
              </div>
            ))}
          </dl>
          <div className="space-y-8">
            <div>
              <p className="text-small text-ink font-semibold">Apparition au défilement</p>
              <p className="text-small text-ink-muted mt-1">
                Classes <code>reveal</code> et <code>reveal-stagger</code> : visible par défaut, animé
                seulement si le navigateur sait lier l’animation au défilement.
              </p>
              <ul className="reveal-stagger mt-4 grid grid-cols-3 gap-3">
                {metiers.map((metier) => (
                  <li
                    key={metier.id}
                    className="rounded-control bg-surface border-line text-ink grid aspect-[4/3] place-items-center border"
                  >
                    <MetierIcon id={metier.id} className="size-7" />
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <p className="text-small text-ink font-semibold">Transitions entre pages</p>
              <p className="text-small text-ink-muted mt-1">
                Composant <code>ViewTransition</code> de React 19 (API View Transitions du navigateur) : fondu
                court du contenu, l’en-tête reste immobile. Sans prise en charge, la navigation reste
                instantanée.
              </p>
              <div className="mt-4 flex flex-wrap gap-3">
                <ButtonLink href="/" variant="secondary">
                  Essayer vers l’accueil
                  <ButtonArrow>
                    <IconArrowRight />
                  </ButtonArrow>
                </ButtonLink>
                <ButtonLink href="/mon-espace" variant="secondary">
                  Vers « Mon espace »
                  <ButtonArrow>
                    <IconArrowRight />
                  </ButtonArrow>
                </ButtonLink>
              </div>
            </div>
          </div>
        </div>
      </Section>

      {/* Logo */}
      <Section id="logo" labelledBy="logo-titre">
        <SectionTitle id="logo-titre" eyebrow="5 · Logo" title="Le logo, en tracés vectoriels">
          Redessiné en SVG d’après l’image fournie, en attendant le fichier officiel : toutes les lettres sont
          des tracés, aucune police. Un seul composant à remplacer le jour venu
          (src/components/ui/brand/logo.tsx).
        </SectionTitle>
        <div className="mt-12 grid gap-4 md:grid-cols-2">
          <div className="rounded-panel border-line bg-surface grid justify-items-center gap-6 border p-10">
            <LogoMark title="Logo KSP Group, version composée" className="w-full max-w-72" />
            <p className="text-small text-ink-muted">Composé (pages, documents)</p>
          </div>
          <div data-tone="inverse" className="rounded-panel grid justify-items-center gap-6 p-10">
            <LogoMark title="Logo KSP Group, version claire" className="w-full max-w-72" />
            <p className="text-small text-ink-muted">Version claire, sur bleu nuit (pied de page)</p>
          </div>
          <div className="rounded-panel border-line bg-surface grid gap-5 border p-8 md:col-span-2">
            <LogoMark
              variant="horizontal"
              title="Logo KSP Group, version horizontale"
              className="h-12 w-auto"
            />
            <LogoMark variant="horizontal" className="h-9 w-auto" />
            <p className="text-small text-ink-muted">
              Version horizontale compacte (en-tête : 36 px de haut sur téléphone, 40 px sur ordinateur).
              Favicon : src/app/icon.svg (K blanc et signature sur bleu nuit).
            </p>
          </div>
        </div>
      </Section>

      {/* Signature */}
      <Section id="signature" labelledBy="signature-titre" tone="muted">
        <SectionTitle
          id="signature-titre"
          eyebrow="6 · Signature"
          title="Barre bleu nuit, barre verte, flèche or"
        >
          Le motif du logo remplace le tissage. Il sert de fil de progression dans les parcours (étapes
          franchies en bleu nuit, étape en cours en vert, la flèche or vers la suite) et de séparateur
          discret.
        </SectionTitle>
        <div className="mt-12 grid gap-8">
          <div className="grid gap-3">
            <p className="text-small text-ink font-semibold">Séparateur</p>
            <SignatureRule />
            <SignatureRule size="md" />
          </div>
          <div className="rounded-card border-line bg-surface grid gap-8 border p-6">
            <SignatureProgress
              steps={[
                { label: 'Votre demande' },
                { label: 'Visite des lieux' },
                { label: 'Devis' },
                { label: 'Réservation' },
              ]}
              current={2}
              label="Exemple : avancement d’une demande"
            />
            <SignatureProgress
              steps={[
                { label: 'Votre demande' },
                { label: 'Visite des lieux' },
                { label: 'Devis' },
                { label: 'Réservation' },
              ]}
              current={2}
              stopped
              label="Exemple : demande arrêtée (devis refusé)"
            />
          </div>
          <div data-tone="inverse" className="rounded-panel relative h-56 overflow-hidden">
            <SignatureBackdrop className="absolute inset-0 size-full opacity-25" />
            <p className="text-small text-ink absolute bottom-4 left-4 inline-flex items-center gap-2 font-semibold">
              <SignatureArrow className="h-2.5 w-2" />
              Toile de fond des panneaux bleu nuit
            </p>
          </div>
        </div>
      </Section>

      {/* Composants */}
      <Section id="composants" labelledBy="composants-titre" tone="muted">
        <SectionTitle id="composants-titre" eyebrow="7 · Composants" title="Composants de base">
          Rendus serveur, sans dépendance. Cibles d’au moins 44 px, focus visible au clavier (essayez Tab).
        </SectionTitle>

        <SubTitle>Boutons</SubTitle>
        <div className="mt-6 flex flex-wrap items-center gap-3">
          <Button variant="action">
            Demander un devis
            <ButtonArrow>
              <IconArrowRight />
            </ButtonArrow>
          </Button>
          <Button>Marque (bleu nuit)</Button>
          <Button variant="secondary">Secondaire</Button>
          <Button variant="ghost">Discret</Button>
          <Button disabled>Indisponible</Button>
          <Button variant="secondary" size="icon" aria-label="Exemple de bouton icône">
            <IconMenu />
          </Button>
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <Button size="lg" variant="action">
            Simuler ma prestation
          </Button>
          <Button size="lg">Grand bouton de marque</Button>
          <ButtonLink href="/mon-espace" size="lg" variant="secondary">
            <IconUser />
            Lien en forme de bouton
          </ButtonLink>
        </div>
        <div data-tone="inverse" className="rounded-card mt-4 flex flex-wrap items-center gap-3 p-6">
          <Button variant="action">Action sur bleu nuit</Button>
          <Button variant="inverse">Inversé</Button>
          <Button>Marque sur bleu nuit</Button>
          <Button variant="ghost">Discret</Button>
        </div>

        <SubTitle>Étiquettes et surtitre</SubTitle>
        <div className="mt-6 flex flex-wrap items-center gap-2">
          <Badge>Neutre</Badge>
          <Badge tone="brand">Bleu nuit</Badge>
          <Badge tone="accent">Nouveau (or)</Badge>
          <Badge tone="action" dot>
            À vous d’agir
          </Badge>
          <Badge tone="success">
            <IconCheck className="size-3.5" />
            Payé
          </Badge>
          <Badge tone="warning">En attente</Badge>
          <Badge tone="danger">En retard</Badge>
        </div>
        <Eyebrow className="mt-6">Surtitre éditorial</Eyebrow>

        <SubTitle>Cartes</SubTitle>
        <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Card as="li">
            <Badge tone="neutral">Carte simple</Badge>
            <p className="font-display text-h3 text-ink mt-4 font-semibold">Contenu statique</p>
            <p className="text-small text-ink-muted mt-2">Bordure fine, ombre de repos, rayon de carte.</p>
          </Card>
          {metiers.slice(0, 2).map((metier) => (
            <Card as="li" key={metier.id} interactive>
              <span className="rounded-control bg-accent-soft text-accent-ink grid size-12 place-items-center">
                <MetierIcon id={metier.id} className="size-6" />
              </span>
              <h4 className="font-display text-h3 text-ink mt-5 font-semibold">
                <Link href={metier.href} className="stretched-link focus-visible:outline-none">
                  {metier.label}
                </Link>
              </h4>
              <p className="text-small text-ink-muted mt-2">{metier.summary}</p>
              <span className="text-action-ink mt-5 inline-flex items-center gap-1.5 text-sm font-semibold">
                Découvrir
                <IconArrowRight className="ease-soft size-4 transition-transform duration-(--motion-base) group-hover/card:translate-x-1" />
              </span>
            </Card>
          ))}
        </ul>

        <SubTitle>Emplacements « à venir »</SubTitle>
        <p className="text-small text-ink-muted max-w-reading mt-3">
          Pour tout contenu non encore fourni (chiffres, réalisations, témoignages) : jamais de contenu
          inventé. Repérables par l’attribut <code>data-placeholder</code>.
        </p>
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Placeholder title="Chiffre clé à venir" />
          <Placeholder title="Réalisation à venir">Photo et description publiées prochainement.</Placeholder>
        </div>

        <SubTitle>Icônes</SubTitle>
        <p className="text-small text-ink-muted max-w-reading mt-3">
          SVG intégrés, trait de 1,75 sur 24 px, couleur héritée du texte. Aucune bibliothèque ajoutée.
        </p>
        <ul className="mt-6 grid grid-cols-3 gap-3 sm:grid-cols-5 lg:grid-cols-8">
          {ICONS.map(({ name, Icon }) => (
            <li
              key={name}
              className="rounded-control bg-surface border-line text-ink flex flex-col items-center gap-2 border px-2 py-4"
            >
              <Icon className="size-6" />
              <span className="text-ink-muted text-xs">{name}</span>
            </li>
          ))}
        </ul>

        <SubTitle>En-tête, pied de page, WhatsApp</SubTitle>
        <p className="text-small text-ink-muted max-w-reading mt-3">
          L’en-tête et le pied de page de cette page sont les vrais. Le bouton WhatsApp n’apparaît que si
          <code> NEXT_PUBLIC_WHATSAPP_NUMBER</code> est renseigné ({siteConfig.domain}).
        </p>
      </Section>
    </>
  );
}
