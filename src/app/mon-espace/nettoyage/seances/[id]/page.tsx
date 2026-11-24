import { CleaningSoon, cleaningTexts } from '@/features/cleaning';

/** Séance ouverte sans son programme (retour d'un paiement) : redirigera vers l'adresse imbriquée à l'étape suivante. */
export default function CleaningSessionRedirectPage() {
  return <CleaningSoon title={cleaningTexts.space.soonSessionRedirect} />;
}
