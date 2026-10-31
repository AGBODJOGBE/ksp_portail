/**
 * Ce qui appartient au contexte actif : une organisation (`organizationId`), ou le compte personnel
 * (aucune). La gateway renvoie toutes les demandes et missions du client, personnelles comme
 * d'entreprise : le navigateur garde celles du contexte (**à valider** : filtrage à porter par cleaning).
 * Une mission sans `organizationId` (champ facultatif au contrat) est personnelle.
 */
export type Owned = { organizationId?: string | null };

export function ownedBy(organizationId: string | null): (item: Owned) => boolean {
  return (item) => (item.organizationId ?? null) === organizationId;
}
