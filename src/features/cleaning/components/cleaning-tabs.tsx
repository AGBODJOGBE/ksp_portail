'use client';

import Link from 'next/link';
import { type KeyboardEvent, type ReactNode, useCallback, useId, useRef, useState } from 'react';
import { TodoState } from '@/components/ui/todo-panel';
import { cn } from '@/lib/cn';
import { type Resource, type ResourceState, useResource } from '@/lib/use-resource';
import { listClaims, listPlaces, listPrograms, listRequests } from '@/features/cleaning/api';
import { describeCleaningError } from '@/features/cleaning/errors';
import { cleaningPaths } from '@/features/cleaning/paths';
import { dashboardTexts as t } from '@/features/cleaning/program-texts';
import { homeTexts } from '@/features/cleaning/request-texts';
import { ClaimRow } from './claim-list';
import { PlaceRow } from './places';
import { ProgramRow } from './program-list';
import { RequestRow } from './request-list';

const RECENT = 5;
const TABS = ['requests', 'programs', 'claims', 'places'] as const;
type Tab = (typeof TABS)[number];

/**
 * Onglets du tableau du Nettoyage : Demandes, Programmes, Réclamations, Mes lieux, avec les cinq plus
 * récents et le lien vers la liste entière. Motif WAI-ARIA des onglets (flèches, Début, Fin) ; chaque
 * liste n'est lue qu'à l'ouverture de son onglet.
 */
export function CleaningTabs() {
  const id = useId();
  const [current, setCurrent] = useState<Tab>('requests');
  const [opened, setOpened] = useState<ReadonlySet<Tab>>(() => new Set(['requests']));
  const buttons = useRef<Partial<Record<Tab, HTMLButtonElement | null>>>({});

  function select(tab: Tab, focus = false) {
    setCurrent(tab);
    setOpened((previous) => new Set(previous).add(tab));
    if (focus) buttons.current[tab]?.focus();
  }

  function onKey(event: KeyboardEvent<HTMLButtonElement>) {
    const index = TABS.indexOf(current);
    const moves: Record<string, number> = {
      ArrowRight: (index + 1) % TABS.length,
      ArrowLeft: (index - 1 + TABS.length) % TABS.length,
      Home: 0,
      End: TABS.length - 1,
    };
    const next = moves[event.key];
    if (next === undefined) return;
    event.preventDefault();
    select(TABS[next]!, true);
  }

  return (
    <section
      aria-label={t.tabsLabel}
      className="rounded-panel border-line bg-surface border p-5 shadow-xs sm:p-7"
    >
      <div
        role="tablist"
        aria-label={t.tabsLabel}
        className="border-line -mx-1 flex [scrollbar-width:none] gap-1 overflow-x-auto border-b px-1"
      >
        {TABS.map((tab) => {
          const selected = tab === current;
          return (
            <button
              key={tab}
              ref={(element) => {
                buttons.current[tab] = element;
              }}
              type="button"
              role="tab"
              id={`${id}-${tab}`}
              aria-selected={selected}
              aria-controls={`${id}-${tab}-panneau`}
              tabIndex={selected ? 0 : -1}
              onClick={() => select(tab)}
              onKeyDown={onKey}
              className={cn(
                'focus-visible:outline-focus -mb-px inline-flex min-h-11 shrink-0 items-center border-b-2 px-4 font-semibold whitespace-nowrap focus-visible:outline-2 focus-visible:-outline-offset-2',
                selected ? 'border-action text-ink' : 'text-ink-muted hover:text-ink border-transparent',
              )}
            >
              {t.tabs[tab]}
            </button>
          );
        })}
      </div>
      {TABS.map((tab) => (
        <div
          key={tab}
          role="tabpanel"
          id={`${id}-${tab}-panneau`}
          aria-labelledby={`${id}-${tab}`}
          hidden={tab !== current}
          tabIndex={0}
          className="focus-visible:outline-focus mt-5 rounded-md focus-visible:outline-2 focus-visible:outline-offset-4"
        >
          {opened.has(tab) ? <TabContent tab={tab} /> : null}
        </div>
      ))}
    </section>
  );
}

function TabContent({ tab }: { tab: Tab }) {
  switch (tab) {
    case 'requests':
      return <Requests />;
    case 'programs':
      return <Programs />;
    case 'claims':
      return <Claims />;
    default:
      return <Places />;
  }
}

function Recent<T>({
  resource: { state, reload },
  empty,
  all,
  render,
}: {
  resource: { state: ResourceState<{ data: T[] }>; reload: Resource<unknown>['reload'] };
  empty: string;
  all: { href: string; label: string };
  render: (item: T) => ReactNode;
}) {
  return (
    <div className="grid gap-4">
      {state.status === 'ready' ? (
        state.data.data.length ? (
          <ul className="grid gap-3">{state.data.data.map(render)}</ul>
        ) : (
          <p className="text-ink-muted">{empty}</p>
        )
      ) : (
        <TodoState
          loading={state.status === 'loading'}
          error={state.status === 'error' ? describeCleaningError(state.error).message : null}
          loadingLabel={homeTexts.todoLoading}
          retryLabel="Réessayer"
          onRetry={reload}
        />
      )}
      <Link
        href={all.href}
        className="text-action-ink inline-flex min-h-11 items-center justify-self-start text-sm font-semibold underline-offset-4 hover:underline"
      >
        {all.label}
      </Link>
    </div>
  );
}

function Requests() {
  const resource = useResource(useCallback(() => listRequests({ limit: RECENT }), []));
  return (
    <Recent
      resource={resource}
      empty={homeTexts.noRequest}
      all={{ href: cleaningPaths.requests, label: t.allRequests }}
      render={(request) => <RequestRow key={request.id} request={request} />}
    />
  );
}

function Programs() {
  const resource = useResource(useCallback(() => listPrograms({ limit: RECENT }), []));
  return (
    <Recent
      resource={resource}
      empty={t.noProgram}
      all={{ href: cleaningPaths.programs, label: t.allPrograms }}
      render={(program) => <ProgramRow key={program.id} program={program} />}
    />
  );
}

function Claims() {
  const resource = useResource(useCallback(() => listClaims({ limit: RECENT }), []));
  return (
    <Recent
      resource={resource}
      empty={t.noClaim}
      all={{ href: cleaningPaths.claims, label: t.allClaims }}
      render={(claim) => <ClaimRow key={claim.id} claim={claim} />}
    />
  );
}

function Places() {
  const resource = useResource(useCallback(() => listPlaces({ limit: RECENT }), []));
  return (
    <Recent
      resource={resource}
      empty={homeTexts.noPlace}
      all={{ href: cleaningPaths.places, label: t.allPlaces }}
      render={(place) => <PlaceRow key={place.id} place={place} />}
    />
  );
}
