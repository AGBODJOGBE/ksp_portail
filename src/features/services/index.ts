/** Annuaire des services du portail (`/services`) : liste, recherche et filtre par catégorie. */
export { buildServiceDirectory } from './catalog';
export { servicesTexts } from './content';
export { ServiceCard } from './components/service-card';
export type { SearchBoxLabels } from './components/service-search-box';
// Composants client chargés à la demande (voir components/lazy.tsx).
export { ServiceSearchBox, ServicesDirectory } from './components/lazy';
export {
  CATEGORY_LABELS,
  directoryHref,
  filterServices,
  matchesQuery,
  readDirectoryQuery,
  type ServiceEntry,
} from './search';
