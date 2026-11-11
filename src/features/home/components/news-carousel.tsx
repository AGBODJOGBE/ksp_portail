'use client';

import Link from 'next/link';
import { type ReactNode, useEffect, useState } from 'react';
import { IconArrowRight } from '@/components/ui/icons';
import { cn } from '@/lib/cn';
import type { NewsSlide } from '@/features/home/content';

/** Durée d'affichage d'une nouveauté avant la suivante. */
const ROTATE_MS = 7000;

export type CarouselLabels = {
  label: string;
  pause: string;
  play: string;
  /** Libellé de chaque point (« Nouveauté 1 sur 3 »), calculé par le serveur. */
  slideLabels: ReadonlyArray<string>;
};

/**
 * Carrousel « Nouveautés sur KSP » (v3, F-020) : une carte blanche, un fait du portail et son lien,
 * une illustration aux couleurs du logo. Défilement toutes les sept secondes, arrêté au survol, au
 * focus, par le bouton pause et sous `prefers-reduced-motion` ; points de navigation au clavier.
 */
export function NewsCarousel({
  slides,
  labels,
  illustrations,
}: {
  slides: ReadonlyArray<NewsSlide>;
  labels: CarouselLabels;
  /** Illustration de chaque nouveauté, rendue par le serveur (aucun SVG dans le JavaScript). */
  illustrations: ReadonlyArray<ReactNode>;
}) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    if (typeof window.matchMedia !== 'function') return;
    const query = window.matchMedia('(prefers-reduced-motion: reduce)');
    const sync = () => setReduced(query.matches);
    sync();
    query.addEventListener('change', sync);
    return () => query.removeEventListener('change', sync);
  }, []);

  const rotating = !paused && !hovered && !focused && !reduced && slides.length > 1;
  useEffect(() => {
    if (!rotating) return;
    const timer = setInterval(() => setIndex((current) => (current + 1) % slides.length), ROTATE_MS);
    return () => clearInterval(timer);
  }, [rotating, slides.length]);

  const slide = slides[index];
  if (!slide) return null;

  return (
    <section
      aria-roledescription="carrousel"
      aria-label={labels.label}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onFocus={() => setFocused(true)}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setFocused(false);
      }}
      className="rounded-panel border-line bg-surface relative overflow-hidden border shadow-xs"
    >
      <div className="grid items-center gap-6 p-6 sm:p-10 md:grid-cols-[minmax(0,1fr)_auto] md:gap-10 lg:px-14">
        <div aria-live={rotating ? 'off' : 'polite'}>
          <div
            key={slide.id}
            role="group"
            aria-roledescription="nouveauté"
            aria-label={labels.slideLabels[index]}
            className="slide-in"
          >
            <p className="font-display text-brand-ink flex items-center gap-2 font-semibold">
              <svg viewBox="0 0 24 24" aria-hidden="true" className="fill-brand-700 size-5">
                <path d="m10 3 1.9 5.1L17 10l-5.1 1.9L10 17l-1.9-5.1L3 10l5.1-1.9Z" />
                <path
                  className="fill-gold-500"
                  d="m18.5 2 .9 2.6L22 5.5l-2.6.9-.9 2.6-.9-2.6L15 5.5l2.6-.9Z"
                />
              </svg>
              {labels.label}
            </p>
            <h2 className="font-display text-h2 text-ink mt-3 font-bold">{slide.title}</h2>
            <p className="text-lead text-ink-muted mt-3 max-w-xl">{slide.text}</p>
            <Link
              href={slide.action.href}
              className="text-brand-ink font-display mt-5 inline-flex min-h-11 items-center gap-2 font-semibold underline underline-offset-4"
            >
              {slide.action.label}
              <IconArrowRight className="size-4" />
            </Link>
          </div>

          <div className="mt-6 flex items-center gap-3">
            <ul className="bg-brand-soft flex items-center gap-1 rounded-full px-2 py-1">
              {slides.map((item, dot) => (
                <li key={item.id}>
                  <button
                    type="button"
                    onClick={() => setIndex(dot)}
                    aria-label={labels.slideLabels[dot]}
                    aria-current={dot === index ? 'true' : undefined}
                    className="group/dot grid size-8 place-items-center rounded-full"
                  >
                    <span
                      className={cn(
                        'block rounded-full transition-[width] duration-(--motion-base)',
                        dot === index
                          ? 'bg-brand h-2.5 w-6'
                          : 'bg-brand-300 group-hover/dot:bg-brand-500 size-2.5',
                      )}
                    />
                  </button>
                </li>
              ))}
            </ul>
            {slides.length > 1 && !reduced ? (
              <button
                type="button"
                onClick={() => setPaused((value) => !value)}
                aria-label={paused ? labels.play : labels.pause}
                className="text-ink-muted hover:text-ink hover:bg-brand-soft grid size-11 place-items-center rounded-full"
              >
                {paused ? (
                  <svg viewBox="0 0 24 24" aria-hidden="true" className="size-5 fill-current">
                    <path d="M8 5.5v13l10-6.5Z" />
                  </svg>
                ) : (
                  <svg viewBox="0 0 24 24" aria-hidden="true" className="size-5 fill-current">
                    <rect x="7" y="5.5" width="3.5" height="13" rx="1" />
                    <rect x="13.5" y="5.5" width="3.5" height="13" rx="1" />
                  </svg>
                )}
              </button>
            ) : null}
          </div>
        </div>

        <div aria-hidden="true" className="relative hidden justify-self-center md:block">
          <div className="bg-brand-100 grid size-64 place-items-center rounded-full lg:size-72">
            <div key={slide.id} className="slide-in">
              {illustrations[index]}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
