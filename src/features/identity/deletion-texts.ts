/*
 * Textes de la suppression du compte (ADR-036), à part de `texts.ts` : celui-ci est lu par le sélecteur de
 * contexte, présent sur toutes les pages de l'espace ; ces textes ne sont téléchargés qu'avec les écrans
 * de la suppression.
 */

export const deletionTexts = {
  settings: {
    title: 'Mon compte',
    lead: 'Votre compte KSP est commun à tous les sites du groupe.',
    link: 'Supprimer mon compte',
    linkText: 'Vous pouvez demander la suppression de votre compte KSP.',
  },
  deletion: {
    title: 'Supprimer mon compte',
    lead: 'La suppression vaut pour votre compte KSP sur tous les sites du groupe.',
    stepsTitle: 'Ce qui se passe',
    steps: [
      'Votre compte est gelé pendant 30 jours : vous ne pouvez plus commander ni payer.',
      'Toutes vos sessions sont fermées, sur tous vos appareils.',
      'Vous changez d’avis ? Reconnectez-vous avant la date prévue et annulez la suppression.',
      'À la date prévue, vos données personnelles sont effacées (nom, numéro de téléphone, e-mail). Vos factures et paiements sont conservés 10 ans, comme l’exige la loi comptable.',
    ],
    conditions:
      'La suppression est refusée tant qu’une opération est en cours : prestation ou demande de devis, facture à régler, paiement en attente ou en vérification.',
    start: 'Supprimer mon compte',
    confirmTitle: 'Confirmer la suppression de votre compte ?',
    confirmText:
      'Votre compte sera gelé tout de suite et vous serez déconnecté. Sans annulation de votre part, il sera supprimé dans 30 jours.',
    confirm: 'Oui, supprimer mon compte',
    confirming: 'Vérification de votre compte…',
    keep: 'Garder mon compte',
    blockedTitle: 'Opérations en cours',
    obstacleLink: 'Voir',
    unavailable: 'Nous ne pouvons pas vérifier votre compte pour le moment. Réessayez plus tard.',
    // Après la demande (session fermée).
    requestedTitle: (date: string) => `Suppression de votre compte prévue le ${date}`,
    requestedText:
      'Votre compte est gelé et vous avez été déconnecté de tous vos appareils. Un message vous confirme la date prévue.',
    requestedCancel:
      'Vous changez d’avis ? Reconnectez-vous avant cette date avec votre numéro, puis annulez la suppression.',
    home: 'Retour à l’accueil',
    signInAgain: 'Se reconnecter',
    // Session restreinte (compte en cours de suppression).
    pendingEyebrow: 'Compte en cours de suppression',
    pendingTitle: (date: string) => `Suppression prévue le ${date}`,
    pendingTitleUnknown: 'Suppression de votre compte demandée',
    pendingText:
      'Votre compte est gelé : vos services KSP ne sont plus accessibles. À la date prévue, vos données personnelles seront effacées ; vos factures et paiements restent conservés comme l’exige la loi.',
    pendingCancelHint: 'Annulez la suppression pour retrouver votre compte, vos demandes et vos factures.',
    postponedTitle: 'Suppression reportée',
    postponedText:
      'Des opérations étaient encore en cours à la date prévue : la suppression attend qu’elles soient terminées.',
    cancel: 'Annuler la suppression',
    cancelling: 'Annulation…',
    cancelled: 'Suppression annulée : votre compte est de nouveau actif.',
    continue: 'Continuer',
    signOut: 'Se déconnecter',
    signingOut: 'Déconnexion…',
    readError: 'La date prévue n’a pas pu être lue.',
    // Pages publiques qui demandent un compte actif (demande de devis).
    restricted:
      'Votre compte est en cours de suppression : annulez la suppression pour l’utiliser à nouveau.',
    restrictedLink: 'Gérer la suppression',
  },
} as const;

/** Nature d'une obligation qui empêche la suppression (`DeletionObstacle.kind`) : libellé et écran. */
export const deletionObstacleKinds: Record<string, { label: string; href: string }> = {
  open_cleaning_mission: {
    label: 'Prestation de nettoyage en cours',
    href: '/mon-espace/nettoyage/demandes',
  },
  open_cleaning_request: { label: 'Demande de devis en cours', href: '/mon-espace/nettoyage/demandes' },
  unpaid_invoice: { label: 'Facture à régler', href: '/mon-espace/factures' },
  pending_payment: { label: 'Paiement en attente', href: '/mon-espace/paiements' },
  payment_under_review: { label: 'Paiement en vérification', href: '/mon-espace/paiements' },
  last_org_admin: { label: 'Compte entreprise sans autre administrateur', href: '/mon-espace/entreprise' },
};

/** Repli par service, pour une nature encore inconnue du portail (liste ouverte du contrat). */
const obstacleServices: Record<string, { label: string; href: string }> = {
  cleaning: { label: 'Nettoyage', href: '/mon-espace/nettoyage/demandes' },
  billing: { label: 'Facturation', href: '/mon-espace/factures' },
  payment: { label: 'Paiement', href: '/mon-espace/paiements' },
  identity: { label: 'Compte entreprise', href: '/mon-espace/entreprise' },
};

/**
 * Libellé et écran d'une obligation. Les adresses des autres fonctionnalités sont recopiées ici : leurs
 * index importent identity (connexion intégrée), l'inverse ferait un cycle.
 */
export function deletionObstacle(obstacle: { service: string; kind: string }): {
  label: string;
  href: string | null;
} {
  return (
    deletionObstacleKinds[obstacle.kind] ??
    obstacleServices[obstacle.service] ?? { label: 'Opération en cours', href: null }
  );
}
