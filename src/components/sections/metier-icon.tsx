import type { JSX } from 'react';
import type { MetierId } from '@/config/metiers';
import {
  IconImmobilier,
  IconImpression,
  IconLivraison,
  IconMarketplace,
  IconNettoyage,
  IconRecouvrement,
  type IconProps,
} from '@/components/ui/icons';

const ICONS: Record<MetierId, (props: IconProps) => JSX.Element> = {
  recouvrement: IconRecouvrement,
  immobilier: IconImmobilier,
  nettoyage: IconNettoyage,
  impression: IconImpression,
  marketplace: IconMarketplace,
  livraison: IconLivraison,
};

/** Icône d'un métier à partir de son identifiant (les contenus du CMS ne transportent que l'identifiant). */
export function MetierIcon({ id, ...props }: IconProps & { id: MetierId }) {
  const Component = ICONS[id];
  return <Component {...props} />;
}
