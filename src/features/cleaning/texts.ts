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
    lead: 'Vos demandes de devis, vos programmes et leurs séances, vos réclamations et vos lieux.',
    /** Carte de l'accueil de Mon espace KSP. */
    homeLinkText: 'Demandes de devis, programmes, séances à payer, réclamations et lieux enregistrés.',
    back: 'Mes prestations de nettoyage',
    newRequest: 'Demander un devis',
    discover: 'Découvrir le Nettoyage',
    contact: 'Nous contacter',
    requestsTitle: 'Mes demandes de devis',
    placesTitle: 'Mes lieux',
    programsTitle: 'Mes programmes',
    programsLead: 'Vos programmes de séances, nés d’un devis accepté, et leur calendrier.',
    claimsTitle: 'Mes réclamations',
    claimsLead: 'Les problèmes signalés après une séance, et la réponse de KSP.',
    programsBack: 'Mes programmes',
    claimsBack: 'Mes réclamations',
    loading: 'Chargement…',
  },
} as const;

/** « Suivre mes demandes » (`/mon-espace/suivi`) : le Nettoyage en cours, demandes et programmes. */
export const trackingTexts = {
  eyebrow: 'Mon espace KSP',
  title: 'Suivre mes demandes',
  lead: 'Toutes vos demandes, tous services confondus : où en est chacune, et qui doit agir.',
  back: 'Mon espace KSP',
  otherTitle: 'Factures et paiements',
  otherText: 'Vos factures et vos paiements, tous services confondus, restent dans Mon espace KSP.',
  otherAction: 'Mes factures et paiements',
} as const;
