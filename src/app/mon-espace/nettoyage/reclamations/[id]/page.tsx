import { CleaningSoon, cleaningTexts } from '@/features/cleaning';

/** Réclamation (adresse des notifications), remplie à l'étape suivante. */
export default function CleaningClaimPage() {
  return <CleaningSoon title={cleaningTexts.space.soonClaim} />;
}
