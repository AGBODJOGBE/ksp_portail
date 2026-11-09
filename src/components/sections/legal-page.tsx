import { PageBand, PageSheet } from '@/components/ui/page-band';
import { Placeholder } from '@/components/ui/placeholder';
import { getDictionary } from '@/i18n';

/**
 * Page légale (mentions, conditions, confidentialité) : bande courte et feuille de lecture. Tant que le
 * texte n'est pas fourni, un emplacement « à venir » le dit, sans rien inventer.
 */
export function LegalPage({ title }: { title: string }) {
  const t = getDictionary();
  return (
    <>
      <PageBand eyebrow={t.common.legal} title={title} back={{ href: '/', label: t.common.backHome }} />
      <PageSheet bare>
        <Placeholder title={title} className="max-w-reading shadow-float bg-surface">
          {t.legal.pending}
        </Placeholder>
      </PageSheet>
    </>
  );
}
