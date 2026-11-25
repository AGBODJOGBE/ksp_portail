import { RecoveryPendingPage, pendingPages } from '@/features/recovery';

/** Import d'un tableur : en attente du backend (finalité `recovery_import` absente du service file). */
export default function ImportPage() {
  return <RecoveryPendingPage id="import-attente" page={pendingPages.imports} />;
}
