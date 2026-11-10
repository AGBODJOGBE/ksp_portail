import { Suspense } from 'react';
import type { ServiceEntry } from '@/features/services/search';
import { ServicesFromUrl } from './services-from-url';
import { ServicesView } from './services-view';

/**
 * Annuaire de `/services`. La page reste statique : le serveur rend la liste complète (c'est aussi le
 * rendu sans JavaScript), puis la feuille client applique les paramètres de l'adresse.
 */
export function ServicesDirectory({ entries }: { entries: ReadonlyArray<ServiceEntry> }) {
  return (
    <Suspense fallback={<ServicesView entries={entries} query={{ category: null, q: '', page: 1 }} />}>
      <ServicesFromUrl entries={entries} />
    </Suspense>
  );
}
