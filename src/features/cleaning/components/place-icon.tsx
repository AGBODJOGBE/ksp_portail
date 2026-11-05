import {
  IconApartment,
  IconConstruction,
  IconHouse,
  IconNettoyage,
  IconOffice,
  IconVilla,
  type IconProps,
} from '@/components/ui/icons';

/**
 * Icône d'un type de lieu. Le nom vient du back-office (`CleaningPublicPlaceType.icon`, texte libre) :
 * un nom inconnu prend l'icône du Nettoyage.
 */
const ICONS: Record<string, (props: IconProps) => React.JSX.Element> = {
  house: IconHouse,
  home: IconHouse,
  villa: IconVilla,
  apartment: IconApartment,
  building: IconApartment,
  office: IconOffice,
  construction: IconConstruction,
  construction_site: IconConstruction,
};

export function PlaceIcon({ icon, ...props }: IconProps & { icon: string }) {
  const Icon = ICONS[icon] ?? IconNettoyage;
  return <Icon {...props} />;
}
