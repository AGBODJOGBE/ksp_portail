/** Compte KSP (service identity) : connexion, garde de l'espace, profil, comptes entreprise, contexte actif. */
export { AccountOverview } from './components/account-overview';
export { LoginFlow } from './components/login-flow';
export { ProfileForm } from './components/profile-form';
export { RequireSession } from './components/require-session';
export { useOrganizationRole, useReadOnly, type OrganizationRole } from './components/use-read-only';
// Écrans client chargés à la demande (voir components/lazy.tsx).
export {
  AccountDeletion,
  AccountTodo,
  ContextSwitcher,
  OrganizationContextFromSearch,
  OrganizationContextGate,
  OrganizationDetail,
  OrganizationSpace,
  ProfileSpace,
} from './components/lazy';
export { accountTexts, identityPaths } from './texts';
export { deletionTexts } from './deletion-texts';
