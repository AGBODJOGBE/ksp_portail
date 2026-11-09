/**
 * Paiements en ligne par Mobile Money (service payment, ADR-031) : page de retour et reçu, données de
 * l’historique. Le paiement direct d’une mission ou d’une facture est remplacé par le portefeuille prépayé
 * (ADR-046) ; ses recharges passent toujours par ici (objet `wallet_top_up`).
 */
// Écrans client chargés à la demande (voir components/lazy.tsx).
export { PaymentReturn, PaymentSimulation } from './components/lazy';
export { listPayments } from './api';
export { safeCheckoutUrl } from './polling';
export type { Payment } from './schemas';
export { paymentPaths, paymentTexts, paymentView, subjectLabel } from './texts';
