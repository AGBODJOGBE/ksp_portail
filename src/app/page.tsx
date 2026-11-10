import { Container } from '@/components/ui/container';
import { zonesSentence } from '@/features/cleaning';
import { getPlaceCatalogForPage, getServedZones } from '@/features/cleaning/server';
import {
  FeaturedServices,
  HomeHero,
  homeContent as content,
  InfoBanner,
  KeyFiguresSection,
  NeedsSection,
  NewsCarousel,
} from '@/features/home';
import { buildServiceDirectory } from '@/features/services';

/** Nombre de cartes de « Les services à la une » : le premier service ouvert de chaque métier. */
const FEATURED_COUNT = 3;

/**
 * Accueil du portail (v3, F-020 : présentation des portails d'e-services) : bandeau d'information,
 * grande photo et recherche des services, nouveautés, chiffres clés « à venir », « Votre besoin », puis
 * les services à la une. Page statique : zones et catalogue du Nettoyage lus au build, puis revalidés.
 */
export default async function HomePage() {
  const [zones, catalog] = await Promise.all([getServedZones(), getPlaceCatalogForPage()]);
  const services = buildServiceDirectory(catalog?.services ?? null);
  const communes = zones ? zonesSentence(zones) : null;
  const { banner, news } = content;
  const featured = services
    .filter((entry) => !entry.status)
    .filter((entry, index, open) => open.findIndex((other) => other.category === entry.category) === index)
    .slice(0, FEATURED_COUNT);

  return (
    <>
      <InfoBanner
        text={communes ? banner.cleaningOnline(communes) : banner.cleaningOnlineFallback}
        action={banner.action}
        closeLabel={banner.close}
      />
      <HomeHero content={content.hero} services={services} />
      <Container size="wide" className="pt-8 sm:pt-12">
        <NewsCarousel
          slides={news.slides}
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
