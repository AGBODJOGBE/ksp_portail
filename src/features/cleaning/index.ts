/**
 * Nettoyage et assainissement (service cleaning, v2, ADR-054 à 059) : page publique et simulateur,
 * assistant de demande de devis, « Mes prestations de nettoyage » (demandes, devis, lieux), conditions
 * générales. Les écrans client sont chargés à la demande (`components/lazy.tsx`).
 */
export { CleaningServiceHero } from './components/service-hero';
export {
  CleaningHome,
  CleaningSimulator,
  CleaningTodo,
  NewPlace,
  PlaceDetail,
  PlaceList,
  RequestDetail,
  RequestList,
  RequestWizard,
} from './components/lazy';
export { CleaningSoon } from './components/soon';
export { nettoyageContent } from './content';
export { cleaningPaths } from './paths';
export { cleaningTexts, trackingTexts } from './texts';
export { listTexts, wizardTexts } from './request-texts';
export { placeTexts } from './place-texts';
