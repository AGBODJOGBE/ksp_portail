import { PlaceDetail, cleaningPaths, placeTexts } from '@/features/cleaning';
import { OrganizationContextGate } from '@/features/identity';

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ organisation?: string | string[] }>;
};

/** Un lieu de « Mes lieux ». `?organisation=` : lieu d'un compte entreprise, ouvert dans son contexte. */
export default async function PlacePage({ params, searchParams }: Props) {
  const [{ id }, { organisation }] = await Promise.all([params, searchParams]);
  return (
    <OrganizationContextGate
      organisation={organisation}
      back={{ href: cleaningPaths.places, label: placeTexts.back }}
    >
      <PlaceDetail id={id} />
    </OrganizationContextGate>
  );
}
