/** Textes de la page « Tous nos services » (`/services`). Provisoires, prêts pour le CMS. */
export const servicesTexts = {
  metadata: {
    title: 'Tous nos services',
    description:
      'Tous les services du Groupe KSP : recouvrement, nettoyage, immobilier clés en main, impression, marketplace et livraison. Trouvez le service qu’il vous faut et faites votre demande en ligne.',
  },
  eyebrow: 'E-services KSP',
  title: 'Tous nos services',
  lead: 'Choisissez une catégorie ou cherchez un service : chaque fiche mène à la démarche en ligne.',
  categoriesTitle: 'Catégories de services',
  allCategories: 'Tous les services',
  searchLabel: 'Trouver un service',
  searchPlaceholder: 'Trouver un service',
  searchSubmit: 'Rechercher',
  details: 'Afficher les détails',
  /** Nombre de résultats annoncé aux lecteurs d'écran. */
  count: (total: number) => (total > 1 ? `${total} services` : `${total} service`),
  emptyTitle: 'Aucun service ne correspond à votre recherche',
  emptyText: 'Vérifiez l’orthographe, essayez un autre mot ou parcourez toutes les catégories.',
  emptyAction: 'Voir tous les services',
  pagination: 'Pages de résultats',
  previous: 'Page précédente',
  next: 'Page suivante',
  pageLabel: (page: number) => `Page ${page}`,
} as const;
