import { BandHeader, BandTitle } from '@/components/ui/band-header';
import { ImportDetail, importTexts as t, recoveryPaths, recoveryTexts } from '@/features/recovery';

type Props = { params: Promise<{ id: string }> };

/** Résultat d'un import : lignes à corriger ou ignorer, confirmation, brouillons créés. */
export default async function ImportResultPage({ params }: Props) {
  const { id } = await params;
  return (
    <div className="grid gap-10">
      <BandHeader>
        <BandTitle
          back={{ href: recoveryPaths.imports, label: t.title }}
          eyebrow={recoveryTexts.title}
          title={t.resultTitle}
          lead={t.resultLead}
        />
      </BandHeader>
      <ImportDetail id={id} />
    </div>
  );
}
