/*
 * Textes de « Suivre ma demande » (`/mon-espace/suivi`) et du résumé du suivi de « Mon espace KSP ».
 * À part de `texts.ts` : seuls ces écrans les téléchargent. Textes provisoires (à valider).
 */

export const trackingTexts = {
  eyebrow: 'Mon espace KSP',
  title: 'Suivre mes demandes',
  lead: 'Toutes vos demandes, tous services confondus : où en est chacune, et qui doit agir.',
  back: 'Mon espace KSP',
  searchLabel: 'Rechercher une demande',
  searchPlaceholder: 'Référence ou prestation',
  statesTitle: 'État',
  servicesTitle: 'Service',
  allStates: 'Toutes',
  allServices: 'Tous les services',
  states: {
    action: 'Action requise',
    ongoing: 'En cours',
    done: 'Terminées',
    cancelled: 'Annulées',
  },
  soon: 'Bientôt',
  count: (total: number) => (total > 1 ? `${total} demandes` : `${total} demande`),
  reference: (value: string) => `Réf. ${value}`,
  requestedOn: (date: string) => `Demandée le ${date}`,
  group: (place: string | null, count: number) => `${place ?? 'Demande groupée'} · ${count} prestations`,
  steps: ['Demande', 'Visite', 'Devis', 'Réservation', 'Passages'] as const,
  progress: (title: string) => `${title} : avancement`,
  done: 'Tout est fait',
  nextStep: 'Prochaine étape',
  payNext: 'Un paiement est attendu : réglez-le depuis la mission.',
  details: 'Voir le détail',
  newRequest: 'Faire une nouvelle demande',
  agendaTitle: 'Vos prochains rendez-vous',
  visitTitle: 'Visite des lieux',
  passageTitle: 'Passage',
  see: 'Voir',
  emptyTitle: 'Aucune demande en cours',
  emptyText: 'Vos demandes de tous les services KSP apparaîtront ici, avec leur avancement.',
  emptyAction: 'Faire une demande',
  noMatchTitle: 'Aucune demande ne correspond',
  noMatchText: 'Changez l’état, le service ou la recherche.',
  reset: 'Tout afficher',
  more: 'Voir toutes mes prestations de nettoyage',
  loading: 'Chargement de vos demandes…',
  retry: 'Réessayer',
  summaryTitle: 'Suivi de mes demandes',
  summaryOngoing: (count: number) =>
    count > 1 ? `${count} demandes en cours` : count === 1 ? '1 demande en cours' : 'Aucune demande en cours',
  summaryAction: (count: number) =>
    count > 1 ? `dont ${count} attendent votre action` : count === 1 ? 'dont 1 attend votre action' : '',
  summaryLink: 'Suivre mes demandes',
} as const;
