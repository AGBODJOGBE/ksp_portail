/** Nettoyage et assainissement (service cleaning) : page publique, demande de devis par lieu et « Mes prestations ». */
export { CleaningServiceHero } from './components/service-hero';
export { JourneyEntrySection } from './components/journey-entry';
// Écrans client chargés à la demande (voir components/lazy.tsx).
export {
  CleaningJourney,
  CleaningSpace,
  CleaningTodo,
  MissionDetail,
  RequestDetail,
  RequestGroupDetail,
} from './components/lazy';
export { JOURNEY_SECTION_ID, nettoyageContent, nettoyageFaq } from './content';
export { journeyTexts } from './journey-texts';
export { cleaningPaths } from './paths';
export { cleaningTexts, serviceJourney } from './texts';
export { zonesSentence } from './zones';
