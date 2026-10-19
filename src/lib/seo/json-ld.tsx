import { siteConfig } from '@/config/site';

/** Balise de données structurées. Le contenu est statique et maîtrisé ; « < » est échappé. */
export function JsonLd({ data }: { data: Record<string, unknown> }) {
  return (
    <script
      type="application/ld+json"
      // Échappement de « < » : empêche toute fermeture prématurée de la balise script.
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, '\u003c') }}
    />
  );
}

/** Données structurées de l'organisation (référencement). */
export function OrganizationJsonLd() {
  return (
    <JsonLd
      data={{
        '@context': 'https://schema.org',
        '@type': 'Organization',
        name: siteConfig.name,
        url: siteConfig.url,
        description: siteConfig.description,
        areaServed: 'BJ',
      }}
    />
  );
}

/** Fil d'Ariane (référencement) : de l'accueil à la page courante. */
export function BreadcrumbJsonLd({ items }: { items: ReadonlyArray<{ name: string; path: string }> }) {
  return (
    <JsonLd
      data={{
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: items.map((item, index) => ({
          '@type': 'ListItem',
          position: index + 1,
          name: item.name,
          item: new URL(item.path, siteConfig.url).toString(),
        })),
      }}
    />
  );
}

/** Questions fréquentes (référencement), reprises telles qu'affichées sur la page. */
export function FaqJsonLd({ items }: { items: ReadonlyArray<{ question: string; answer: string }> }) {
  return (
    <JsonLd
      data={{
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        mainEntity: items.map((item) => ({
          '@type': 'Question',
          name: item.question,
          acceptedAnswer: { '@type': 'Answer', text: item.answer },
        })),
      }}
    />
  );
}
