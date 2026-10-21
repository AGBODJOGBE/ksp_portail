import { metiers } from '@/config/metiers';
import {
  ClosingCta,
  HomeHero,
  KeyFiguresSection,
  MetiersBento,
  RealisationsSection,
  TestimonialsSection,
  homeContent,
} from '@/features/home';

/**
 * Accueil du portail : promesse, six métiers, preuves (chiffres, réalisations, témoignages), contact.
 * Les contenus viennent de `src/features/home` (remplacés plus tard par Payload CMS).
 */
export default function HomePage() {
  return (
    <>
      <HomeHero content={homeContent.hero} />
      <MetiersBento content={homeContent.metiers} metiers={metiers} />
      <KeyFiguresSection content={homeContent.keyFigures} />
      <RealisationsSection content={homeContent.realisations} />
      <TestimonialsSection content={homeContent.testimonials} />
      <ClosingCta content={homeContent.closing} />
    </>
  );
}
