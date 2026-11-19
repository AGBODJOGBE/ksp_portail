import Image from 'next/image';
import Link from 'next/link';
import { ServiceSearchBox, type ServiceEntry } from '@/features/services';
import type { HomeContent } from '@/features/home/content';
import { frenchSpacing } from '@/lib/typography';

/**
 * Premier écran (v3, F-020) : grande photo pleine largeur assombrie, sélecteur en pilule « Rechercher |
 * Être guidé », titre blanc centré, puis la grande recherche translucide. Le texte s'affiche aussitôt
 * (aucune animation) ; la photo est chargée en priorité.
 */
export function HomeHero({
  content,
  services,
}: {
  content: HomeContent['hero'];
  services: ReadonlyArray<ServiceEntry>;
}) {
  return (
    <section
      aria-labelledby="accueil-titre"
      className="relative isolate z-20 flex min-h-[30rem] items-center py-16 sm:min-h-[34rem] lg:min-h-[36rem]"
    >
      <div aria-hidden="true" className="absolute inset-0 -z-10 overflow-hidden">
        <Image
          src={content.image.src}
          alt={content.image.alt}
          width={content.image.width}
          height={content.image.height}
          priority
          // Fichier déjà optimisé (WebP, 145 Ko) : servi tel quel, sans passer par l'optimiseur.
          unoptimized
          sizes="100vw"
          className="size-full object-cover object-[50%_60%]"
        />
        <div className="hero-veil absolute inset-0" />
      </div>

      <div className="px-gutter mx-auto w-full max-w-5xl text-center text-white">
        <div
          role="group"
          aria-label={content.modesLabel}
          className="inline-flex gap-1 rounded-full bg-white p-1.5 shadow-sm"
        >
          <span
            aria-current="true"
            className="bg-accent text-on-accent font-display inline-flex min-h-11 items-center rounded-full px-5 font-semibold sm:px-6 sm:text-lg"
          >
            {content.searchMode}
          </span>
          <Link
            href={content.guidedHref}
            className="text-ink font-display hover:bg-brand-soft inline-flex min-h-11 items-center rounded-full px-5 font-semibold sm:px-6 sm:text-lg"
          >
            {content.guidedMode}
          </Link>
        </div>
        <h1
          id="accueil-titre"
          className="font-display text-h1 mx-auto mt-8 max-w-3xl font-bold text-white sm:mt-10"
        >
          {frenchSpacing(content.title)}
        </h1>
        <div className="mt-8 sm:mt-10">
          <ServiceSearchBox
            entries={services}
            labels={{
              label: content.searchLabel,
              placeholder: content.searchPlaceholder,
              submit: content.searchSubmit,
              suggestions: content.suggestionsLabel,
              none: content.noSuggestion,
              allResults: content.allResults,
              allResultsOne: content.allResultsOne,
            }}
          />
        </div>
      </div>
    </section>
  );
}
