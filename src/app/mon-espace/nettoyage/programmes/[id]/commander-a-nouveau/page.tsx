import { CleaningSoon, cleaningTexts } from '@/features/cleaning';

/** Nouvelle commande après un programme ponctuel (adresse des notifications), remplie à l'étape suivante. */
export default function CleaningReorderPage() {
  return <CleaningSoon title={cleaningTexts.space.soonReorder} />;
}
