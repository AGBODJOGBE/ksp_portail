/** Adresses des écrans du Nettoyage (celles de « Mes prestations » sont attendues par les notifications). */
export const cleaningPaths = {
  simulator: '/nettoyage#simulateur',
  space: '/mon-espace/nettoyage/demandes',
  request: (id: string) => `/mon-espace/nettoyage/demandes/${encodeURIComponent(id)}`,
  mission: (id: string) => `/mon-espace/nettoyage/missions/${encodeURIComponent(id)}`,
  /** Mission tout juste réservée (devis accepté) : l'écran affiche la confirmation. */
  missionBooked: (id: string) =>
    `/mon-espace/nettoyage/missions/${encodeURIComponent(id)}?reservation=confirmee`,
} as const;
