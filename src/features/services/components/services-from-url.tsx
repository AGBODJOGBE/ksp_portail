'use client';

import { useSearchParams } from 'next/navigation';
import { useEffect, useRef } from 'react';
import { readDirectoryQuery, type ServiceEntry } from '@/features/services/search';
import { ServicesView } from './services-view';

/** Feuille client : lit la catégorie, la recherche et la page dans l'adresse (sous `<Suspense>`). */
export function ServicesFromUrl({ entries }: { entries: ReadonlyArray<ServiceEntry> }) {
  const query = readDirectoryQuery(useSearchParams());
  const root = useRef<HTMLDivElement>(null);

  // Téléphone : le sélecteur horizontal des catégories montre la catégorie active, sans faire défiler la page.
  useEffect(() => {
    const active = root.current?.querySelector<HTMLElement>('#categories-titre ~ ul [aria-current="true"]');
    const list = active?.closest('ul');
    if (active && list && list.scrollWidth > list.clientWidth) {
      list.scrollLeft = active.offsetLeft - list.offsetLeft - 16;
    }
  }, [query.category]);

  return (
    <div ref={root}>
      <ServicesView entries={entries} query={query} />
    </div>
  );
}
