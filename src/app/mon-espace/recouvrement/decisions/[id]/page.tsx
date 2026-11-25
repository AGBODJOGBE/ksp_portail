import { DecisionDetail, decisionTexts, recoveryPaths } from '@/features/recovery';
import { OrganizationContextGate } from '@/features/identity';

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ organisation?: string | string[] }>;
};

/**
 * Une décision (adresse des notifications `recovery.decision_requested`). Le lien d'une entreprise
 * (`?organisation=`) passe d'abord dans son contexte.
 */
export default async function DecisionPage({ params, searchParams }: Props) {
  const [{ id }, { organisation }] = await Promise.all([params, searchParams]);
  return (
    <OrganizationContextGate
      organisation={organisation}
      back={{ href: recoveryPaths.decisions, label: decisionTexts.allDecisions }}
    >
      <DecisionDetail id={id} />
    </OrganizationContextGate>
  );
}
