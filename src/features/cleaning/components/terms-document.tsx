import Link from 'next/link';
import { IconAlert } from '@/components/ui/icons';
import { PageBand, PageSheet } from '@/components/ui/page-band';
import { frenchSpacing } from '@/lib/typography';
import { cleaningPaths } from '@/features/cleaning/paths';
import { type TermsDocument, termsTexts as t } from '@/features/cleaning/terms';

/**
 * Conditions générales du Nettoyage dans une version donnée : bandeau « Version provisoire » tant que le
 * texte n'est pas validé, sommaire, articles. Page statique, rendue par le serveur, sans JavaScript.
 */
export function TermsDocumentView({ document }: { document: TermsDocument }) {
  return (
    <>
      <PageBand
        eyebrow={t.eyebrow}
        title={document.title}
        lead={t.version(document.version)}
        back={{ href: cleaningPaths.home, label: t.back }}
      />
      <PageSheet size="reading">
        <article className="grid gap-10">
          {document.provisional ? (
            <div
              role="note"
              className="rounded-card border-warning bg-warning-soft text-ink flex items-start gap-3 border-2 p-4 sm:p-5"
            >
              <IconAlert className="text-warning mt-0.5 size-5 shrink-0" />
              <div>
                <p className="font-semibold">{t.provisionalTitle}</p>
                <p className="text-small mt-1">{t.provisionalText}</p>
              </div>
            </div>
          ) : null}
          <p className="text-lead text-ink">{frenchSpacing(document.intro)}</p>
          <nav
            aria-labelledby="cg-sommaire"
            className="rounded-card border-line bg-surface-muted border p-4 sm:p-5"
          >
            <h2 id="cg-sommaire" className="text-ink font-semibold">
              {t.summary}
            </h2>
            <ol className="mt-3 grid gap-1 sm:grid-cols-2">
              {document.sections.map((section) => (
                <li key={section.id}>
                  <a
                    href={`#${section.id}`}
                    className="text-brand-ink inline-flex min-h-11 items-center underline-offset-4 hover:underline"
                  >
                    {section.title}
                  </a>
                </li>
              ))}
            </ol>
          </nav>
          {document.sections.map((section) => (
            <section
              key={section.id}
              id={section.id}
              aria-labelledby={`${section.id}-titre`}
              className="scroll-mt-28"
            >
              <h2 id={`${section.id}-titre`} className="font-display text-h3 text-ink font-semibold">
                {section.title}
              </h2>
              <div className="text-ink mt-4 grid gap-4 leading-relaxed">
                {section.paragraphs?.map((paragraph) => (
                  <p key={paragraph}>{frenchSpacing(paragraph)}</p>
                ))}
                {section.items ? (
                  <ul className="marker:text-brand-ink grid list-disc gap-3 pl-5">
                    {section.items.map((item) => (
                      <li key={item}>{frenchSpacing(item)}</li>
                    ))}
                  </ul>
                ) : null}
                {section.after?.map((paragraph) => (
                  <p key={paragraph}>{frenchSpacing(paragraph)}</p>
                ))}
                {section.links?.length ? (
                  <p className="flex flex-wrap gap-4">
                    {section.links.map((link) => (
                      <Link
                        key={link.href}
                        href={link.href}
                        className="text-brand-ink inline-flex min-h-11 items-center font-semibold underline underline-offset-4 hover:no-underline"
                      >
                        {link.label}
                      </Link>
                    ))}
                  </p>
                ) : null}
              </div>
            </section>
          ))}
        </article>
      </PageSheet>
    </>
  );
}
