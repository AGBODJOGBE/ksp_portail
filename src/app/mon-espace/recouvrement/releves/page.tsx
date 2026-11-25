import { RecoveryPendingPage, pendingPages } from '@/features/recovery';

/** Relevés mensuels et reversements : en attente du backend (routes en 501). */
export default function StatementsPage() {
  return <RecoveryPendingPage id="releves-attente" page={pendingPages.statements} />;
}
