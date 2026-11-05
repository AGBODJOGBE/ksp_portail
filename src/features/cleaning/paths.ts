/** Adresses des écrans du Nettoyage (celles de « Mes prestations » sont attendues par les notifications). */
export const cleaningPaths = {
  /** Demande de devis par lieu (assistant en étapes). */
  journey: '/nettoyage/demande',
  /** Demande de devis qui commence par un type de lieu déjà choisi. */
  journeyFor: (placeType: string) => `/nettoyage/demande?lieu=${encodeURIComponent(placeType)}`,
  /** Confirmation d'une demande envoyée (relue par son numéro après un rafraîchissement). */
  journeySent: (groupId: string) => `/nettoyage/demande?groupe=${encodeURIComponent(groupId)}`,
  space: '/mon-espace/nettoyage/demandes',
  request: (id: string) => `/mon-espace/nettoyage/demandes/${encodeURIComponent(id)}`,
  /** Suivi d'une demande groupée (ADR-035 : adresse citée par les messages regroupés). */
  group: (id: string) => `/mon-espace/nettoyage/demandes/groupes/${encodeURIComponent(id)}`,
  mission: (id: string) => `/mon-espace/nettoyage/missions/${encodeURIComponent(id)}`,
  /** Mission tout juste réservée (devis accepté) : l'écran affiche la confirmation. */
  missionBooked: (id: string) =>
    `/mon-espace/nettoyage/missions/${encodeURIComponent(id)}?reservation=confirmee`,
} as const;
