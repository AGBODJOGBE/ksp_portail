import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import {
  TermsDocumentView,
  cleaningPaths,
  cleaningTerms,
  getCleaningTerms,
} from '@/features/cleaning/server';
import { pageMetadata } from '@/lib/seo/metadata';

type Props = { params: Promise<{ version: string }> };

/** Une page par version connue, construite au build ; une autre version répond 404. */
export const dynamicParams = false;

export function generateStaticParams() {
  return Object.keys(cleaningTerms).map((version) => ({ version }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { version } = await params;
  const document = getCleaningTerms(version);
  if (!document) return {};
  return {
    ...pageMetadata({
      title: `${document.title} (${document.version})`,
      description: document.intro,
      path: cleaningPaths.terms(document.version),
    }),
    // Version provisoire, en cours de validation : pas d'indexation tant qu'elle n'est pas validée.
    ...(document.provisional ? { robots: { index: false, follow: true } } : {}),
  };
}

/** Conditions générales du Nettoyage, versionnées (`quote.termsVersion`). */
export default async function CleaningTermsPage({ params }: Props) {
  const { version } = await params;
  const document = getCleaningTerms(version);
  if (!document) notFound();
  return <TermsDocumentView document={document} />;
}
