import { CleaningSoon, cleaningTexts } from '@/features/cleaning';

/** Séance d'un programme (adresse des notifications), remplie à l'étape suivante. */
export default function CleaningSessionPage() {
  return <CleaningSoon title={cleaningTexts.space.soonSession} />;
}
