/** Paiement en ligne par Mobile Money (service payment, ADR-031) : bouton, page de retour, « Mes paiements ». */
// Écrans client chargés à la demande (voir components/lazy.tsx).
export { PayButton, PaymentList, PaymentReturn, PaymentSimulation } from './components/lazy';
export type { PaymentSubjectInput } from './api';
export { paymentPaths, paymentTexts } from './texts';
