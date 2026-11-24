import { CleaningSoon, cleaningTexts } from '@/features/cleaning';

/** Programme de nettoyage (adresse des notifications), rempli à l'étape suivante. */
export default function CleaningProgramPage() {
  return <CleaningSoon title={cleaningTexts.space.soonProgram} />;
}
