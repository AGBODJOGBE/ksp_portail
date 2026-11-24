import { Container } from '@/components/ui/container';
import {
  FeaturedServices,
  HomeHero,
  homeContent as content,
  InfoBanner,
  KeyFiguresSection,
  NeedsSection,
  NewsCarousel,
  NewsIllustration,
} from '@/features/home';
import { buildServiceDirectory } from '@/features/services';

/** Nombre de cartes de « Les services à la une » : le premier service ouvert de chaque métier. */
const FEATURED_COUNT = 3;

/**
 * Accueil du portail (v3, F-020 : présentation des portails d'e-services) : bandeau d'information,
 * grande photo et recherche des services, nouveautés, chiffres clés « à venir », « Votre besoin », puis
 * les services à la une. Page statique, sans appel à la gateway.
 */
export default function HomePage() {
  const services = buildServiceDirectory();
  const { banner, news } = content;
  const featured = services
    .filter((entry) => !entry.status)
    .filter((entry, index, open) => open.findIndex((other) => other.category === entry.category) === index)
    .slice(0, FEATURED_COUNT);

  return (
    <>
      <InfoBanner text={banner.text} action={banner.action} closeLabel={banner.close} />
      <HomeHero content={content.hero} services={services} />
      <Container size="wide" className="pt-8 sm:pt-12">
        <NewsCarousel
          slides={news.slides}
          illustrations={news.slides.map((slide) => (
            <NewsIllustration key={slide.id} name={slide.illustration} />
          ))}
          labels={{
            label: news.label,
            pause: news.pause,
            play: news.play,
            slideLabels: news.slides.map((_, index) => news.goTo(index + 1, news.slides.length)),
          }}
        />
      </Container>
      <KeyFiguresSection content={content.keyFigures} />
      <NeedsSection content={content.needs} />
      <FeaturedServices content={content.featured} services={featured} />
    </>
  );
}
