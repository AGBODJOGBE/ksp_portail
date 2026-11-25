import { RecoveryPendingPage, pendingPages } from '@/features/recovery';

/** Décisions du créancier : en attente du backend (`GET /recovery/decisions` répond 501). */
export default function DecisionsPage() {
  return <RecoveryPendingPage id="decisions-attente" page={pendingPages.decisions} />;
}
