import { siteConfig } from '@/config/site';

/** Données structurées de l'organisation (référencement). Le contenu est statique et maîtrisé. */
export function OrganizationJsonLd() {
  const data = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: siteConfig.name,
    url: siteConfig.url,
    description: siteConfig.description,
    areaServed: 'BJ',
  };
  return (
    <script
      type="application/ld+json"
      // Échappement de « < » : empêche toute fermeture prématurée de la balise script.
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, '\\u003c') }}
    />
  );
}
