/**
 * Recouvrement, espace du créancier (service recovery, ADR-060 à 062) : tableau de bord, dossiers,
 * assistant « Nouveau dossier » (mandat signé par code, frais payés par le portefeuille), fiche et
 * modification d'un dossier (paiement reçu directement, arrêt), décisions, reversements et relevés, import
 * d'un tableur, préférences ; espace du débiteur sans compte (`/recouvrement/[token]`, ADR-061). Les écrans
 * client sont chargés à la demande (`components/lazy.tsx`). La page publique passe par
 * `@/features/recovery/server` (aucun module client), l'accueil de Mon espace et « Suivre ma demande » par
 * `@/features/recovery/home`.
 */
export {
  CaseDetail,
  CaseEdit,
  CaseList,
  CaseWizard,
  DebtorSpace,
  DecisionDetail,
  DecisionList,
  ImportDetail,
  ImportStart,
  RecoveryHome,
  RecoveryPreferences,
  RecoveryStatements,
} from './components/lazy';
export { caseTexts } from './case-texts';
export { decisionTexts } from './decision-texts';
export { DEBTOR_META_TITLE } from './debtor-meta';
export { importTexts } from './import-texts';
export { statementsTexts } from './money-texts';
export { recoveryPaths } from './paths';
export { preferenceTexts } from './preference-texts';
export { spaceTexts } from './space-texts';
export { recoveryTexts } from './texts';
export { wizardTexts } from './wizard-texts';
