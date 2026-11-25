/**
 * Recouvrement, espace du créancier (service recovery, ADR-060 à 062) : tableau de bord, dossiers,
 * assistant « Nouveau dossier » (mandat signé par code, frais payés par le portefeuille), fiche et
 * modification d'un dossier, préférences, pages en attente du backend (décisions, relevés, import). Les
 * écrans client sont chargés à la demande (`components/lazy.tsx`). La page publique passe par
 * `@/features/recovery/server` (aucun module client), l'accueil de Mon espace par `@/features/recovery/home`
 * (panneau « À faire » seulement).
 */
export {
  CaseDetail,
  CaseEdit,
  CaseList,
  CaseWizard,
  RecoveryHome,
  RecoveryPreferences,
} from './components/lazy';
export { RecoveryPendingPage } from './components/pending-page';
export { caseTexts } from './case-texts';
export { recoveryPaths } from './paths';
export { pendingPages } from './pending-texts';
export { preferenceTexts } from './preference-texts';
export { spaceTexts } from './space-texts';
export { recoveryTexts } from './texts';
export { wizardTexts } from './wizard-texts';
