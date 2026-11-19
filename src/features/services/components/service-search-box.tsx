'use client';

import { useRouter } from 'next/navigation';
import { type KeyboardEvent, useId, useState } from 'react';
import { IconArrowRight, IconSearch } from '@/components/ui/icons';
import { cn } from '@/lib/cn';
import { CATEGORY_LABELS, directoryHref, matchesQuery, type ServiceEntry } from '@/features/services/search';

/** Nombre de suggestions affichées sous le champ. */
const MAX_SUGGESTIONS = 6;
/** Nombre de caractères avant la première suggestion. */
const MIN_CHARS = 2;

export type SearchBoxLabels = {
  label: string;
  placeholder: string;
  submit: string;
  suggestions: string;
  none: string;
  /** « Voir les {total} services correspondants » : `{total}` est remplacé par le nombre. */
  allResults: string;
  allResultsOne: string;
};

/**
 * Recherche de services du premier écran (v3, F-020) : grande pilule translucide posée sur la photo,
 * suggestions filtrées dans le navigateur sur la liste des services, chacune avec son lien. Liste de
 * suggestions au modèle « combobox » (flèches, Entrée, Échap). Entrée sans suggestion choisie, ou sans
 * JavaScript : la page « Tous nos services » avec la recherche (`/services?q=`).
 */
export function ServiceSearchBox({
  entries,
  labels,
}: {
  entries: ReadonlyArray<ServiceEntry>;
  labels: SearchBoxLabels;
}) {
  const router = useRouter();
  const id = useId();
  const listId = `${id}-suggestions`;
  const [value, setValue] = useState('');
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);

  const query = value.trim();
  const matching = query.length >= MIN_CHARS ? entries.filter((entry) => matchesQuery(entry, query)) : [];
  const suggestions = matching.slice(0, MAX_SUGGESTIONS);
  const expanded = open && query.length >= MIN_CHARS;

  function go(href: string) {
    setOpen(false);
    router.push(href);
  }

  function onKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'ArrowDown' && suggestions.length) {
      event.preventDefault();
      setOpen(true);
      setActive((index) => (index + 1) % suggestions.length);
    } else if (event.key === 'ArrowUp' && suggestions.length) {
      event.preventDefault();
      setActive((index) => (index <= 0 ? suggestions.length - 1 : index - 1));
    } else if (event.key === 'Escape') {
      setOpen(false);
      setActive(-1);
    } else if (event.key === 'Enter' && expanded && active >= 0 && suggestions[active]) {
      event.preventDefault();
      go(suggestions[active].href);
    }
  }

  return (
    <form
      role="search"
      action="/services"
      method="get"
      onSubmit={(event) => {
        event.preventDefault();
        go(directoryHref({ q: query }));
      }}
      className="relative mx-auto w-full max-w-3xl"
    >
      <label htmlFor={`${id}-q`} className="sr-only">
        {labels.label}
      </label>
      <div className="glass-pill flex min-h-15 items-center gap-2 rounded-full pr-2 pl-5 focus-within:border-white sm:min-h-16 sm:pl-6">
        <IconSearch className="size-6 text-white" />
        <input
          id={`${id}-q`}
          name="q"
          type="text"
          role="combobox"
          aria-expanded={expanded}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={expanded && active >= 0 ? `${listId}-${active}` : undefined}
          value={value}
          onChange={(event) => {
            setValue(event.target.value);
            setOpen(true);
            setActive(-1);
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => setOpen(false)}
          onKeyDown={onKeyDown}
          placeholder={labels.placeholder}
          autoComplete="off"
          enterKeyHint="search"
          maxLength={80}
          className="font-display min-w-0 flex-1 bg-transparent py-3 text-lg text-white outline-none placeholder:text-white/90 sm:text-xl"
        />
        <button
          type="submit"
          aria-label={labels.submit}
          className="bg-accent text-on-accent grid size-11 shrink-0 place-items-center rounded-full sm:size-12"
        >
          <IconSearch className="size-5" />
        </button>
      </div>

      <div
        hidden={!expanded}
        className="rounded-card border-line bg-surface text-ink shadow-raised absolute inset-x-0 top-full z-10 mt-2 overflow-hidden border text-left"
      >
        <ul id={listId} role="listbox" aria-label={labels.suggestions} className="py-2">
          {suggestions.map((entry, index) => (
            <li
              key={entry.id}
              id={`${listId}-${index}`}
              role="option"
              aria-selected={index === active}
              // La souris choisit sans retirer le focus du champ (sinon la liste se ferme avant le clic).
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => go(entry.href)}
              onMouseEnter={() => setActive(index)}
              className={cn(
                'flex min-h-12 cursor-pointer items-center justify-between gap-4 px-5 py-2.5',
                index === active && 'bg-brand-soft',
              )}
            >
              <span className="font-display font-semibold">{entry.title}</span>
              <span className="text-small text-ink-muted shrink-0">{CATEGORY_LABELS[entry.category]}</span>
            </li>
          ))}
        </ul>
        {suggestions.length === 0 ? <p className="text-ink-muted px-5 pb-4">{labels.none}</p> : null}
        {matching.length > 0 ? (
          <a
            href={directoryHref({ q: query })}
            onMouseDown={(event) => event.preventDefault()}
            onClick={(event) => {
              event.preventDefault();
              go(directoryHref({ q: query }));
            }}
            className="border-line text-brand-ink font-display flex min-h-12 items-center gap-2 border-t px-5 font-semibold underline-offset-4 hover:underline"
          >
            {matching.length > 1
              ? labels.allResults.replace('{total}', String(matching.length))
              : labels.allResultsOne}
            <IconArrowRight className="size-4" />
          </a>
        ) : null}
      </div>
      <p className="sr-only" aria-live="polite">
        {expanded
          ? suggestions.length
            ? `${matching.length} ${labels.suggestions.toLowerCase()}`
            : labels.none
          : ''}
      </p>
    </form>
  );
}
