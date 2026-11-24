/*
 * Textes communs du Nettoyage, sans zod ni appel : page publique, carte et pages de Mon espace KSP
 * rendues par le serveur, « Suivre mes demandes ». Les écrans ont leurs propres fichiers de textes
 * (`simulator-texts.ts`, `request-texts.ts`, `place-texts.ts`), chargés avec eux. Textes provisoires (à
 * valider). Aucun prix, aucune zone ni aucun délai n'est écrit ici.
 */

export const cleaningTexts = {
  hero: {
    panelEyebrow: 'Votre devis en ligne',
    panelTitle: 'Trois temps, un seul dossier',
    panelSteps: [
      'Une estimation immédiate, sans compte',
      'La visite des lieux, sur le créneau de votre choix',
      'Le devis, puis le programme de séances dans votre espace',
    ],
    panelNote: 'Estimation non contractuelle : le prix est confirmé par le devis, après la visite.',
  },
  space: {
    eyebrow: 'Nettoyage et assainissement',
    title: 'Mes prestations de nettoyage',
    lead: 'Vos demandes de devis, vos lieux et, bientôt, vos programmes et vos séances.',
    /** Carte de l'accueil de Mon espace KSP. */
    homeLinkText: 'Demandes de devis, visites, devis et lieux enregistrés.',
    back: 'Mes prestations de nettoyage',
    newRequest: 'Demander un devis',
    soon: 'Bientôt',
    soonTitle: 'Bientôt disponible',
    soonText:
      'Cette page arrive avec la prochaine étape du service en ligne. Vos demandes et vos devis sont déjà dans « Mes prestations de nettoyage ».',
    soonProgram: 'Votre programme de nettoyage',
    soonSession: 'Votre séance de nettoyage',
    soonReorder: 'Commander à nouveau',
    soonClaim: 'Votre réclamation',
    soonSessionRedirect: 'Votre séance de nettoyage',
    discover: 'Découvrir le Nettoyage',
    contact: 'Nous contacter',
    requestsTitle: 'Mes demandes de devis',
    placesTitle: 'Mes lieux',
  },
} as const;

/** « Suivre mes demandes » (`/mon-espace/suivi`) : le suivi des programmes arrive avec la prochaine étape. */
export const trackingTexts = {
  eyebrow: 'Mon espace KSP',
  title: 'Suivre mes demandes',
  lead: 'Toutes vos demandes, tous services confondus : où en est chacune, et qui doit agir.',
  back: 'Mon espace KSP',
  emptyTitle: 'Aucune demande à suivre pour le moment',
  emptyText:
    'Vos demandes de nettoyage se suivent dans « Mes prestations de nettoyage ». Vos factures et vos paiements restent dans Mon espace KSP.',
  emptyAction: 'Mes factures et paiements',
} as const;
