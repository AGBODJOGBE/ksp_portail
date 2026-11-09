import Link from 'next/link';
import type { CSSProperties } from 'react';
import { SignatureArrow, SignatureRule } from '@/components/ui/brand/signature';
import { Badge, type BadgeTone } from '@/components/ui/badge';
import { ButtonArrow, ButtonLink } from '@/components/ui/button';
import { Eyebrow } from '@/components/ui/eyebrow';
import { HeroBand } from '@/components/ui/hero-band';
import { IconArrowRight, IconCard, IconCheck, IconFileCheck, IconRecouvrement } from '@/components/ui/icons';
import { navigation } from '@/config/navigation';
import type { HomeContent } from '@/features/home/content';
import { frenchSpacing } from '@/lib/typography';

const PREVIEW_ICONS = [IconFileCheck, IconCard, IconRecouvrement];

/** Décalages de la pile de cartes de l'aperçu (profondeur), du premier au dernier plan. */
const PREVIEW_OFFSETS = ['lg:mr-10', 'lg:ml-8', 'lg:mr-4'];

/**
 * Aperçu illustré de Mon espace KSP : trois cartes empilées qui flottent doucement, avec les libellés
 * réels de l'espace et des lignes neutres à la place des données (aucun montant, aucune date). Décoratif :
 * masqué aux lecteurs d'écran ; la carte du compte qui le suit en donne le sens.
 */
function SpacePreview({ preview }: { preview: HomeContent['hero']['preview'] }) {
  return (
    <div aria-hidden="true" data-tone="light" className="relative grid gap-3 bg-transparent">
      {preview.items.map((item, index) => {
        const Icon = PREVIEW_ICONS[index] ?? IconFileCheck;
        return (
          <div
            key={item.label}
            className={`rise ${PREVIEW_OFFSETS[index] ?? ''}`}
            style={{ '--i': index + 2 } as CSSProperties}
          >
            <div
              className="float rounded-card border-line bg-surface shadow-float flex items-center gap-4 border p-4"
              style={{ '--i': index } as CSSProperties}
            >
              <span className="rounded-icon bg-brand text-on-brand grid size-11 shrink-0 place-items-center">
                <Icon className="size-5" />
              </span>
              <span className="grid min-w-0 flex-1 gap-1.5">
                <span className="flex flex-wrap items-center gap-2">
                  <span className="text-ink font-semibold">{item.label}</span>
                  <Badge tone={item.tone as BadgeTone} dot>
                    {item.service}
                  </Badge>
                </span>
                <span className="flex gap-1.5">
                  <span className="bg-surface-sunken h-2 w-2/5 rounded-full" />
                  <span className="bg-surface-sunken h-2 w-1/4 rounded-full" />
                </span>
              </span>
              <span className="rounded-control bg-action text-on-action grid size-9 shrink-0 place-items-center">
                <IconArrowRight className="size-4" />
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

/**
 * Premier écran de l'accueil (direction « Signature ») : bande bleu nuit, promesse en très grand avec le
 * soulignement or qui se trace, actions, atouts vérifiables ; à droite, l'aperçu de Mon espace KSP (un seul
 * compte pour tous les services). Le bas de la bande est réservé aux métiers, qui la chevauchent. Rendu
 * par le serveur ; le titre n'est pas animé (premier affichage).
 */
export function HomeHero({ content }: { content: HomeContent['hero'] }) {
  return (
    <HeroBand
      labelledBy="accueil-titre"
      overlap
      className="lg:min-h-[calc(100svh-var(--header-h))]"
      containerClassName="pt-10 pb-28 sm:pt-16 sm:pb-32 lg:pt-20 lg:pb-40"
    >
      <div className="grid gap-12 lg:grid-cols-12 lg:items-center lg:gap-10">
        <div className="lg:col-span-7">
          <Eyebrow>{content.eyebrow}</Eyebrow>
          <h1 id="accueil-titre" className="font-display text-display text-ink mt-6 font-semibold">
            {content.title} <span className="underline-draw">{content.titleAccent}</span>
          </h1>
          <p className="text-lead text-ink-muted mt-7 max-w-2xl">{frenchSpacing(content.lead)}</p>
          <div className="mt-10 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            <ButtonLink
              href={content.primaryAction.href}
              variant="action"
              size="lg"
              className="shadow-action"
            >
              {content.primaryAction.label}
              <ButtonArrow>
                <IconArrowRight />
              </ButtonArrow>
            </ButtonLink>
            <ButtonLink href={content.secondaryAction.href} variant="secondary" size="lg">
              {content.secondaryAction.label}
            </ButtonLink>
          </div>
          <ul className="text-small text-ink mt-9 flex flex-col gap-x-6 gap-y-2.5 sm:flex-row sm:flex-wrap">
            {content.highlights.map((item) => (
              <li key={item} className="flex items-center gap-2">
                <span className="bg-action-soft ring-action-muted grid size-5 shrink-0 place-items-center rounded-full ring-1">
                  <IconCheck className="text-action-ink size-3" />
                </span>
                {frenchSpacing(item)}
              </li>
            ))}
          </ul>
        </div>

        <div className="lg:col-span-5">
          <div className="rounded-panel border-line bg-brand-soft relative border p-5 backdrop-blur-sm sm:p-7">
            <div className="flex items-center justify-between gap-3">
              <p className="text-eyebrow text-accent-ink inline-flex items-center gap-2 font-semibold uppercase">
                <SignatureArrow className="h-2.5 w-2" />
                {content.preview.caption}
              </p>
            </div>
            {/* Téléphone : l'aperçu illustré est omis, pour amener les métiers plus tôt. */}
            <div className="mt-5 max-sm:hidden">
              <SpacePreview preview={content.preview} />
            </div>
            <SignatureRule className="mt-5 sm:mt-6" />
            <p className="font-display text-ink mt-5 text-lg leading-snug font-semibold">
              {content.panelTitle}
            </p>
            <p className="text-small text-ink-muted mt-1">{frenchSpacing(content.panelText)}</p>
            <Link
              href={navigation.account.href}
              className="group/link text-accent-ink mt-2 inline-flex min-h-11 items-center gap-1.5 font-semibold"
            >
              {navigation.account.label}
              <IconArrowRight className="ease-soft size-4 transition-transform duration-(--motion-base) group-hover/link:translate-x-1" />
            </Link>
          </div>
        </div>
      </div>
    </HeroBand>
  );
}
