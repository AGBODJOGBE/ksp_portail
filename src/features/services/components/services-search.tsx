'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { IconSearch } from '@/components/ui/icons';
import type { MetierId } from '@/config/metiers';
import { servicesTexts as t } from '@/features/services/content';
import { directoryHref } from '@/features/services/search';

/** Délai après la dernière frappe avant de mettre la recherche dans l'adresse. */
const TYPING_DELAY_MS = 250;

/**
 * Grande recherche en pilule de l'annuaire. Sans JavaScript, c'est un formulaire GET vers `/services` ;
 * avec, la liste se filtre pendant la frappe et la recherche reste dans l'adresse (`?q=`), partageable.
 */
export function ServicesSearch({ q, category }: { q: string; category: MetierId | null }) {
  const router = useRouter();
  const [value, setValue] = useState(q);
  // Adresse changée ailleurs (catégorie, « Voir tous les services ») : le champ suit.
  const [synced, setSynced] = useState(q);
  if (q !== synced) {
    setSynced(q);
    if (q.trim() !== value.trim()) setValue(q);
  }
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);

  function update(next: string) {
    setValue(next);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      router.replace(directoryHref({ category, q: next }), { scroll: false });
    }, TYPING_DELAY_MS);
  }

  return (
    <form
      role="search"
      action="/services"
      method="get"
      onSubmit={(event) => {
        event.preventDefault();
        clearTimeout(timer.current);
        router.replace(directoryHref({ category, q: value }), { scroll: false });
      }}
      className="border-line-strong bg-surface focus-within:border-brand flex min-h-15 items-center gap-2 rounded-full border pr-2 pl-5 shadow-xs transition-colors duration-(--motion-base)"
    >
      {category ? <input type="hidden" name="categorie" value={category} /> : null}
      <IconSearch className="text-ink-subtle size-6" />
      <label htmlFor="recherche-services" className="sr-only">
        {t.searchLabel}
      </label>
      <input
        id="recherche-services"
        type="search"
        name="q"
        value={value}
        onChange={(event) => update(event.target.value)}
        placeholder={t.searchPlaceholder}
        autoComplete="off"
        enterKeyHint="search"
        maxLength={80}
        className="font-display text-ink placeholder:text-ink-subtle min-w-0 flex-1 bg-transparent py-3 text-lg outline-none"
      />
      <button
        type="submit"
        className="bg-brand text-on-brand grid size-11 shrink-0 place-items-center rounded-full"
        aria-label={t.searchSubmit}
      >
        <IconSearch className="size-5" />
      </button>
    </form>
  );
}
