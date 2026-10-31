/** Nettoyage et assainissement (service cleaning) : page publique, simulateur, devis et « Mes prestations ». */
export { CleaningSimulatorSection } from './components/simulator-section';
export { CleaningServiceHero } from './components/service-hero';
// Écrans client chargés à la demande (voir components/lazy.tsx).
export {
  CleaningSpace,
  CleaningTodo,
  MissionDetail,
  QuoteRequestPanel,
  RequestDetail,
} from './components/lazy';
export { SIMULATOR_ID, nettoyageContent, nettoyageFaq } from './content';
export { cleaningPaths } from './paths';
export { cleaningTexts, serviceJourney } from './texts';
export { zonesSentence } from './zones';
