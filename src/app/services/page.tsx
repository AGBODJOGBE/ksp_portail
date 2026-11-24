import { Container } from '@/components/ui/container';
import { Eyebrow } from '@/components/ui/eyebrow';
import { buildServiceDirectory, ServicesDirectory, servicesTexts as t } from '@/features/services';
import { BreadcrumbJsonLd } from '@/lib/seo/json-ld';
import { pageMetadata } from '@/lib/seo/metadata';
import { frenchSpacing } from '@/lib/typography';

export const metadata = pageMetadata({ ...t.metadata, path: '/services' });

/**
 * « Tous nos services » : catégories, recherche et grille de cartes, sur le modèle des portails
 * d'e-services (F-020). Page statique, tirée des contenus des pages métiers ; catégorie, recherche et
 * page sont dans l'adresse (`?categorie=`, `?q=`, `?page=`).
 */
export default function ServicesPage() {
  const entries = buildServiceDirectory();
  return (
    <>
      <Container size="wide" className="pb-section-sm pt-10 sm:pt-14">
        <header className="max-w-reading mb-10">
          <Eyebrow>{t.eyebrow}</Eyebrow>
          <h1 className="font-display text-h1 text-ink mt-4 font-bold">{t.title}</h1>
          <p className="text-lead text-ink-muted mt-3">{frenchSpacing(t.lead)}</p>
        </header>
        <ServicesDirectory entries={entries} />
      </Container>
      <BreadcrumbJsonLd
        items={[
          { name: 'Accueil', path: '/' },
          { name: t.title, path: '/services' },
        ]}
      />
    </>
  );
}
