import { Suspense } from 'react';
import { ButtonLink } from '@/components/ui/button';
import { Container } from '@/components/ui/container';
import { Eyebrow } from '@/components/ui/eyebrow';
import { Heading } from '@/components/ui/heading';
import { IconClock } from '@/components/ui/icons';
import { contactConfig } from '@/config/contact';
import { navigation } from '@/config/navigation';
import { siteConfig } from '@/config/site';
import { ContactChannels, ContactWithSubject, contactTexts as t } from '@/features/contact';
import { BreadcrumbJsonLd, JsonLd } from '@/lib/seo/json-ld';
import { pageMetadata } from '@/lib/seo/metadata';
import { frenchSpacing } from '@/lib/typography';

export const metadata = pageMetadata({ title: t.title, description: t.description, path: '/contact' });

/** Données structurées : seulement les coordonnées réellement configurées (jamais un exemple). */
function ContactJsonLd() {
  const { phone, email, address } = contactConfig;
  return (
    <JsonLd
      data={{
        '@context': 'https://schema.org',
        '@type': 'ContactPage',
        name: t.title,
        url: new URL('/contact', siteConfig.url).toString(),
        mainEntity: {
          '@type': 'Organization',
          name: siteConfig.name,
          url: siteConfig.url,
          ...(address.example ? {} : { address: address.value }),
          contactPoint: {
            '@type': 'ContactPoint',
            contactType: 'customer service',
            areaServed: 'BJ',
            availableLanguage: 'French',
            ...(phone.example ? {} : { telephone: phone.value }),
            ...(email.example ? {} : { email: email.value }),
          },
        },
      }}
    />
  );
}

/**
 * Page Contact (publique, statique) : moyens de contact directs de KSP, lus dans la configuration. Le
 * sujet d'un lien « support » (`?sujet=paiement`) est lu dans le navigateur, sous Suspense.
 */
export default function ContactPage() {
  return (
    <Container className="py-12 sm:py-16">
      <BreadcrumbJsonLd items={[{ name: 'Contact', path: '/contact' }]} />
      <ContactJsonLd />
      <div className="max-w-reading">
        <Eyebrow>Groupe KSP</Eyebrow>
        <Heading as="h1" size="h1" className="mt-4">
          {t.title}
        </Heading>
        <p className="text-ink-muted mt-4 text-lg">{frenchSpacing(t.lead)}</p>
      </div>

      <section aria-labelledby="contact-moyens" className="mt-10">
        <Heading as="h2" size="h2" id="contact-moyens" className="sr-only">
          {t.channelsTitle}
        </Heading>
        <Suspense fallback={<ContactChannels contact={contactConfig} subject={null} />}>
          <ContactWithSubject contact={contactConfig} />
        </Suspense>
      </section>

      <div className="mt-10 grid gap-6 lg:grid-cols-2">
        <section
          aria-labelledby="contact-horaires"
          className="rounded-card border-line bg-surface border p-5 sm:p-6"
        >
          <Heading as="h2" size="h3" id="contact-horaires" className="flex items-center gap-2">
            <IconClock className="size-5" />
            {t.hoursTitle}
          </Heading>
          <p className="text-ink-muted mt-2">{frenchSpacing(contactConfig.hours)}</p>
        </section>
        <section
          aria-labelledby="contact-espace"
          className="rounded-card border-line bg-surface border p-5 sm:p-6"
        >
          <Heading as="h2" size="h3" id="contact-espace">
            {t.accountTitle}
          </Heading>
          <p className="text-ink-muted mt-2">{frenchSpacing(t.accountText)}</p>
          <ButtonLink href={navigation.account.href} variant="secondary" className="mt-4">
            {t.accountAction}
          </ButtonLink>
        </section>
      </div>
    </Container>
  );
}
