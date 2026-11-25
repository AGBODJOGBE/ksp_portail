import { RecoveryPendingPage, pendingPages, recoveryPaths, spaceTexts } from '@/features/recovery';
import { OrganizationContextGate } from '@/features/identity';

type Props = { searchParams: Promise<{ organisation?: string | string[] }> };

/**
 * Une décision (adresse des notifications `recovery.decision_requested`) : en attente du backend. Le lien
 * d'une entreprise (`?organisation=`) passe d'abord dans son contexte.
 */
export default async function DecisionPage({ searchParams }: Props) {
  const { organisation } = await searchParams;
  return (
    <OrganizationContextGate
      organisation={organisation}
      back={{ href: recoveryPaths.space, label: spaceTexts.title }}
    >
      <RecoveryPendingPage id="decision-attente" page={pendingPages.decision} />
    </OrganizationContextGate>
  );
}
