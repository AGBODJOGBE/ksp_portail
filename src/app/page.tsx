import { ClosingCta } from '@/components/home/closing-cta';
import { HomeHero } from '@/components/home/home-hero';
import { MetiersBento } from '@/components/home/metiers-bento';
import {
  KeyFiguresSection,
  RealisationsSection,
  TestimonialsSection,
} from '@/components/home/proof-sections';
import { homeContent } from '@/content/home';
import { metiers } from '@/content/metiers';

/**
 * Accueil du portail : promesse, six métiers, preuves (chiffres, réalisations, témoignages), contact.
 * Les contenus viennent de `src/content` (remplacés plus tard par Payload CMS).
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
