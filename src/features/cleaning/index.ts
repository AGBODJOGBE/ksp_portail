/** Nettoyage et assainissement (service cleaning) : page publique, simulateur, devis et « Mes prestations ». */
export { CleaningSimulatorSection } from './components/simulator-section';
// Écrans client chargés à la demande (voir components/lazy.tsx).
export { CleaningSpace, MissionDetail, QuoteRequestPanel, RequestDetail } from './components/lazy';
export { SIMULATOR_ID, nettoyageContent } from './content';
export { cleaningPaths } from './paths';
export { cleaningTexts } from './texts';
