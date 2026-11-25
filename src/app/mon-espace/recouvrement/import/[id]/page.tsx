import { RecoveryPendingPage, pendingPages } from '@/features/recovery';

/** Résultat d'un import : en attente du backend. */
export default function ImportResultPage() {
  return <RecoveryPendingPage id="import-resultat-attente" page={pendingPages.importDetail} />;
}
