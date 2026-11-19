'use client';

import { type KeyboardEvent, useEffect, useId, useMemo, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { IconChevronLeft, IconChevronRight } from '@/components/ui/icons';
import { cn } from '@/lib/cn';

/**
 * Teinte d'un jour marqué : `brand` (fait, bleu nuit), `action` (prévu, vert), `pending` (reste à faire,
 * contour or en tirets), `soft` (jour du plan, sans état), `muted` (passé sans suite, barré).
 */
export type CalendarTone = 'brand' | 'action' | 'pending' | 'soft' | 'muted';

export interface CalendarMark {
  /** Jour civil `AAAA-MM-JJ`. */
  date: string;
  tone: CalendarTone;
  /** État lu avec la date par un lecteur d'écran (« fait », « planifié »…). */
  label: string;
}

const TONES: Record<CalendarTone, string> = {
  brand: 'bg-brand text-on-brand',
  action: 'bg-action text-on-action',
  pending: 'border-accent-strong bg-accent-soft text-ink border-2 border-dashed',
  soft: 'bg-brand-100 text-ink ring-brand-muted ring-1 ring-inset',
  muted: 'bg-surface-sunken text-ink-subtle line-through',
};

const SWATCHES: Record<CalendarTone, string> = {
  brand: 'bg-brand',
  action: 'bg-action',
  pending: 'border-accent-strong bg-accent-soft border-2 border-dashed',
  soft: 'bg-brand-100 ring-brand-muted ring-1 ring-inset',
  muted: 'bg-surface-sunken ring-line-strong ring-1 ring-inset',
};

const WEEKDAYS = [
  ['L', 'lundi'],
  ['M', 'mardi'],
  ['M', 'mercredi'],
  ['J', 'jeudi'],
  ['V', 'vendredi'],
  ['S', 'samedi'],
  ['D', 'dimanche'],
] as const;

// Jours civils : calculs en UTC, jamais dans le fuseau de l'appareil.
const monthTitle = new Intl.DateTimeFormat('fr-BJ', { timeZone: 'UTC', month: 'long', year: 'numeric' });
const dayTitle = new Intl.DateTimeFormat('fr-BJ', {
  timeZone: 'UTC',
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  year: 'numeric',
});

const monthOf = (date: string) => date.slice(0, 7);

/** Mois `AAAA-MM` décalé de `delta` mois. */
function shiftMonth(month: string, delta: number): string {
  const [year, index] = month.split('-').map(Number) as [number, number];
  const date = new Date(Date.UTC(year, index - 1 + delta, 1));
  return date.toISOString().slice(0, 7);
}

/** Jour civil décalé de `delta` jours (navigation au clavier). */
function shiftDay(date: string, delta: number): string {
  return new Date(Date.parse(`${date}T00:00:00Z`) + delta * 86_400_000).toISOString().slice(0, 10);
}

/** Même jour, `delta` mois plus tard, ramené au dernier jour du mois s'il n'existe pas. */
function shiftDayByMonth(date: string, delta: number): string {
  const month = shiftMonth(monthOf(date), delta);
  const [year, index] = month.split('-').map(Number) as [number, number];
  const length = new Date(Date.UTC(year, index, 0)).getUTCDate();
  return `${month}-${String(Math.min(Number(date.slice(8)), length)).padStart(2, '0')}`;
}

/** 0 = lundi … 6 = dimanche. */
const weekdayOf = (date: string) => (new Date(`${date}T12:00:00Z`).getUTCDay() + 6) % 7;

/**
 * Saisie de jours : chaque jour entre `min` et `max` devient un bouton à bascule (`aria-pressed` : jour
 * marqué). Clavier : flèches (jour, semaine), Début et Fin (lundi, dimanche), Page précédente et suivante
 * (mois) ; un seul jour du mois dans l'ordre de tabulation.
 */
export interface CalendarSelection {
  /** Premier et dernier jours proposés (`AAAA-MM-JJ`). */
  min: string;
  max: string;
  onToggle: (date: string) => void;
  /** État lu pour un jour hors de la période (« indisponible »). */
  unavailableLabel: string;
  /** Identifiant du premier bouton de jour (focus depuis un message d'erreur). */
  id?: string;
  describedBy?: string;
}

/** Cases d'un mois, semaines du lundi au dimanche ; `null` hors du mois. */
function monthCells(month: string): Array<string | null> {
  const [year, index] = month.split('-').map(Number) as [number, number];
  const first = new Date(Date.UTC(year, index - 1, 1));
  const length = new Date(Date.UTC(year, index, 0)).getUTCDate();
  const offset = (first.getUTCDay() + 6) % 7;
  const cells: Array<string | null> = Array.from({ length: offset }, () => null);
  for (let day = 1; day <= length; day += 1) cells.push(`${month}-${String(day).padStart(2, '0')}`);
  while (cells.length % 7) cells.push(null);
  return cells;
}

/**
 * Calendrier mois par mois : jours marqués d'une teinte et d'un état lu avec la date, du premier au
 * dernier mois marqué (boutons « mois précédent », « mois suivant »). Affichage seul par défaut ; avec
 * `selection`, saisie de jours (voir `CalendarSelection`), mois de `min` à `max`.
 */
export function MonthCalendar({
  marks,
  initialMonth,
  legend,
  label,
  previousLabel,
  nextLabel,
  monthCount,
  selection,
  className,
}: {
  marks: ReadonlyArray<CalendarMark>;
  /** Mois affiché d'abord (`AAAA-MM`) ; par défaut, celui du premier jour marqué. */
  initialMonth?: string;
  /** Légende des teintes, avec un nombre facultatif. */
  legend?: ReadonlyArray<{ tone: CalendarTone; label: string; count?: number }>;
  /** Nom accessible du calendrier (« Calendrier des passages »). */
  label: string;
  /** Libellés des boutons (« Mois précédent », « Mois suivant »). */
  previousLabel: string;
  nextLabel: string;
  /** Nombre de jours marqués du mois affiché, sous son nom (« 13 passages »). */
  monthCount: (count: number) => string;
  selection?: CalendarSelection;
  className?: string;
}) {
  const id = useId();
  const byDate = useMemo(() => new Map(marks.map((mark) => [mark.date, mark])), [marks]);
  const months = useMemo(() => {
    if (selection) return { first: monthOf(selection.min), last: monthOf(selection.max) };
    const sorted = marks.map((mark) => mark.date).sort();
    return {
      first: sorted[0] ? monthOf(sorted[0]) : null,
      last: sorted.at(-1) ? monthOf(sorted.at(-1)!) : null,
    };
  }, [marks, selection]);
  const [month, setMonth] = useState(initialMonth ?? months.first ?? new Date().toISOString().slice(0, 7));
  const [focused, setFocused] = useState<string | null>(null);
  const moveFocus = useRef(false);
  const grid = useRef<HTMLTableElement>(null);

  // Après une flèche du clavier : le focus suit le jour atteint, une fois le mois affiché.
  useEffect(() => {
    if (!moveFocus.current || !focused) return;
    moveFocus.current = false;
    grid.current?.querySelector<HTMLButtonElement>(`[data-day="${focused}"]`)?.focus();
  }, [focused]);

  if (!months.first || !months.last) return null;
  const shown = month < months.first ? months.first : month > months.last ? months.last : month;
  const cells = monthCells(shown);
  const marked = cells.filter((cell) => cell && byDate.has(cell)).length;
  const title = monthTitle.format(new Date(`${shown}-01T12:00:00Z`));
  const selectable = (cell: string) => !!selection && cell >= selection.min && cell <= selection.max;
  // Jour du mois affiché dans l'ordre de tabulation : celui qui a le focus, sinon le premier marqué, sinon
  // le premier proposé.
  const days = cells.filter((cell): cell is string => !!cell && selectable(cell));
  const tabStop =
    (focused && days.includes(focused) ? focused : null) ??
    days.find((cell) => byDate.has(cell)) ??
    days[0] ??
    null;

  function onKey(event: KeyboardEvent<HTMLButtonElement>, cell: string) {
    if (!selection) return;
    const moves: Record<string, () => string> = {
      ArrowLeft: () => shiftDay(cell, -1),
      ArrowRight: () => shiftDay(cell, 1),
      ArrowUp: () => shiftDay(cell, -7),
      ArrowDown: () => shiftDay(cell, 7),
      Home: () => shiftDay(cell, -weekdayOf(cell)),
      End: () => shiftDay(cell, 6 - weekdayOf(cell)),
      PageUp: () => shiftDayByMonth(cell, -1),
      PageDown: () => shiftDayByMonth(cell, 1),
    };
    const move = moves[event.key];
    if (!move) return;
    event.preventDefault();
    const target = move();
    const next = target < selection.min ? selection.min : target > selection.max ? selection.max : target;
    moveFocus.current = true;
    setFocused(next);
    setMonth(monthOf(next));
  }

  return (
    <section aria-label={label} className={cn('grid gap-3', className)}>
      <div className="flex items-center justify-between gap-2">
        <Button
          variant="secondary"
          size="icon"
          aria-label={previousLabel}
          disabled={shown <= months.first}
          onClick={() => setMonth(shiftMonth(shown, -1))}
        >
          <IconChevronLeft className="size-5" />
        </Button>
        <p id={`${id}-mois`} aria-live="polite" className="font-display text-ink text-center font-semibold">
          <span className="first-letter:uppercase">{title}</span>
          <span className="text-small text-ink-muted block font-normal tabular-nums">
            {monthCount(marked)}
          </span>
        </p>
        <Button
          variant="secondary"
          size="icon"
          aria-label={nextLabel}
          disabled={shown >= months.last}
          onClick={() => setMonth(shiftMonth(shown, 1))}
        >
          <IconChevronRight className="size-5" />
        </Button>
      </div>
      <table
        ref={grid}
        aria-labelledby={`${id}-mois`}
        className="w-full table-fixed border-separate border-spacing-y-1"
      >
        <thead>
          <tr>
            {WEEKDAYS.map(([short, full]) => (
              <th key={full} scope="col" abbr={full} className="text-small text-ink-muted pb-1 font-semibold">
                {short}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: cells.length / 7 }, (_, row) => (
            <tr key={row}>
              {cells.slice(row * 7, row * 7 + 7).map((cell, column) => {
                const mark = cell ? byDate.get(cell) : undefined;
                const name = cell ? dayTitle.format(new Date(`${cell}T12:00:00Z`)) : '';
                if (cell && selectable(cell)) {
                  return (
                    <td key={cell} className="p-0 text-center">
                      <button
                        type="button"
                        data-day={cell}
                        id={cell === days[0] ? selection?.id : undefined}
                        aria-pressed={!!mark}
                        aria-describedby={selection?.describedBy}
                        tabIndex={cell === tabStop ? 0 : -1}
                        onClick={() => {
                          setFocused(cell);
                          selection?.onToggle(cell);
                        }}
                        onKeyDown={(event) => onKey(event, cell)}
                        className={cn(
                          'mx-auto grid size-11 place-items-center rounded-full text-[0.9375rem] tabular-nums',
                          'ease-soft transition-[background-color,color,transform] duration-(--motion-fast) active:scale-95',
                          'focus-visible:outline-focus focus-visible:outline-2 focus-visible:outline-offset-2',
                          mark ? cn('font-semibold', TONES[mark.tone]) : 'text-ink hover:bg-surface-sunken',
                        )}
                      >
                        <span aria-hidden="true">{Number(cell.slice(8))}</span>
                        <span className="sr-only">
                          {name}
                          {mark ? ` : ${mark.label}` : ''}
                        </span>
                      </button>
                    </td>
                  );
                }
                return (
                  <td key={cell ?? `vide-${row}-${column}`} className="p-0 text-center">
                    {cell ? (
                      <span
                        className={cn(
                          'mx-auto grid place-items-center rounded-full text-sm tabular-nums',
                          selection ? 'size-11' : 'size-9',
                          mark ? cn('font-semibold', TONES[mark.tone]) : 'text-ink-subtle',
                        )}
                      >
                        <span aria-hidden="true">{Number(cell.slice(8))}</span>
                        <span className="sr-only">
                          {name}
                          {mark ? ` : ${mark.label}` : selection ? ` : ${selection.unavailableLabel}` : ''}
                        </span>
                      </span>
                    ) : null}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
      {legend?.length ? (
        <ul className="text-small text-ink-muted flex flex-wrap gap-x-4 gap-y-1.5">
          {legend.map((item) => (
            <li key={item.label} className="inline-flex items-center gap-2">
              <span
                aria-hidden="true"
                className={cn('size-3.5 shrink-0 rounded-full', SWATCHES[item.tone])}
              />
              <span>
                {item.label}
                {item.count !== undefined ? (
                  <span className="text-ink font-semibold tabular-nums"> {item.count}</span>
                ) : null}
              </span>
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}
