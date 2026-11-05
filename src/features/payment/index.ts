/** Paiement en ligne par Mobile Money (service payment, ADR-031) : bouton, page de retour et reçu, données de l’historique. */
// Écrans client chargés à la demande (voir components/lazy.tsx).
export { PayButton, PaymentReturn, PaymentSimulation } from './components/lazy';
export { listPayments, type PaymentSubjectInput } from './api';
export type { Payment } from './schemas';
export { paymentPaths, paymentStatus, paymentTexts, subjectLabel } from './texts';
