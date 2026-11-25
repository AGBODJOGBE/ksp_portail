'use client';

import { type KeyboardEvent, type ReactNode, useId, useRef, useState } from 'react';
import { cn } from '@/lib/cn';

export interface TabItem {
  key: string;
  label: ReactNode;
  /** Contenu de l'onglet, rendu à sa première ouverture seulement (lecture à la demande). */
  render: () => ReactNode;
}

/**
 * Onglets (motif WAI-ARIA : flèches, Début, Fin ; un seul onglet dans l'ordre de tabulation). Chaque
 * panneau n'est rendu qu'à la première ouverture de son onglet, puis gardé.
 */
export function Tabs({
  label,
  items,
  panelClassName,
  defaultKey,
}: {
  /** Nom accessible de la liste d'onglets. */
  label: string;
  items: ReadonlyArray<TabItem>;
  panelClassName?: string;
  /** Onglet ouvert au premier rendu (lien vers un onglet précis) ; par défaut, le premier. */
  defaultKey?: string;
}) {
  const id = useId();
  const initial = items.find((item) => item.key === defaultKey)?.key ?? items[0]?.key ?? '';
  const [current, setCurrent] = useState(initial);
  const [opened, setOpened] = useState<ReadonlySet<string>>(() => new Set(initial ? [initial] : []));
  const buttons = useRef<Record<string, HTMLButtonElement | null>>({});

  function select(key: string, focus = false) {
    setCurrent(key);
    setOpened((previous) => new Set(previous).add(key));
    if (focus) buttons.current[key]?.focus();
  }

  function onKey(event: KeyboardEvent<HTMLButtonElement>) {
    const index = items.findIndex((item) => item.key === current);
    const moves: Record<string, number> = {
      ArrowRight: (index + 1) % items.length,
      ArrowLeft: (index - 1 + items.length) % items.length,
      Home: 0,
      End: items.length - 1,
    };
    const next = moves[event.key];
    if (next === undefined) return;
    event.preventDefault();
    select(items[next]!.key, true);
  }

  return (
    <>
      <div
        role="tablist"
        aria-label={label}
        className="border-line -mx-1 flex [scrollbar-width:none] gap-1 overflow-x-auto border-b px-1"
      >
        {items.map((item) => {
          const selected = item.key === current;
          return (
            <button
              key={item.key}
              ref={(element) => {
                buttons.current[item.key] = element;
              }}
              type="button"
              role="tab"
              id={`${id}-${item.key}`}
              aria-selected={selected}
              aria-controls={`${id}-${item.key}-panneau`}
              tabIndex={selected ? 0 : -1}
              onClick={() => select(item.key)}
              onKeyDown={onKey}
              className={cn(
                'focus-visible:outline-focus -mb-px inline-flex min-h-11 shrink-0 items-center border-b-2 px-4 font-semibold whitespace-nowrap focus-visible:outline-2 focus-visible:-outline-offset-2',
                selected ? 'border-action text-ink' : 'text-ink-muted hover:text-ink border-transparent',
              )}
            >
              {item.label}
            </button>
          );
        })}
      </div>
      {items.map((item) => (
        <div
          key={item.key}
          role="tabpanel"
          id={`${id}-${item.key}-panneau`}
          aria-labelledby={`${id}-${item.key}`}
          hidden={item.key !== current}
          tabIndex={0}
          className={cn(
            'focus-visible:outline-focus mt-5 rounded-md focus-visible:outline-2 focus-visible:outline-offset-4',
            panelClassName,
          )}
        >
          {opened.has(item.key) ? item.render() : null}
        </div>
      ))}
    </>
  );
}
