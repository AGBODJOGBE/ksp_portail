/**
 * Facturation (service billing) : « Mes factures » dans Mon espace KSP, factures de commission et reçus
 * des frais du Recouvrement (ADR-064). L'accueil de Mon espace passe par `@/features/billing/home`.
 */
// Écrans client chargés à la demande (voir components/lazy.tsx).
export {
  BillingHistory,
  BillingPreferences,
  CommissionInvoiceDetail,
  CommissionInvoiceList,
  FeeReceiptList,
  InvoiceDetail,
  InvoiceList,
} from './components/lazy';
export { commissionPaths, commissionTexts } from './commission-texts';
export { billingPaths, billingTexts, historyTexts } from './texts';
