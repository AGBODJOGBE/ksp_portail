/*
 * Textes de l'interface du Nettoyage, pendant la préparation de sa nouvelle version (v2) : page
 * publique, « Mes prestations de nettoyage » et « Suivre mes demandes » en attente. Textes provisoires
 * (à valider). Aucune zone, aucun prix ni aucune prestation de la gateway n'est cité ici.
 */

export const cleaningTexts = {
  hero: {
    preparationEyebrow: 'Nouvelle version en préparation',
    preparationTitle: 'Le Nettoyage en ligne fait peau neuve',
    preparationText:
      'La demande de devis en ligne et le suivi depuis Mon espace KSP reviennent bientôt, dans une nouvelle version.',
    preparationContact:
      'En attendant, notre équipe prend vos demandes directement, par WhatsApp, par téléphone ou par e-mail.',
  },
  space: {
    eyebrow: 'Nettoyage et assainissement',
    title: 'Mes prestations de nettoyage',
    /** Carte de l'accueil de Mon espace KSP. */
    homeLinkText: 'Nouvelle version en préparation : demandes, devis et passages.',
    soon: 'Bientôt',
    soonTitle: 'Bientôt disponible',
    soonText:
      'Le suivi de vos demandes de nettoyage, de vos devis et de vos passages arrive avec la nouvelle version du service. Les messages que vous recevez mèneront directement ici.',
    discover: 'Découvrir le Nettoyage',
    contact: 'Nous contacter',
  },
} as const;

/** « Suivre mes demandes » (`/mon-espace/suivi`) : le suivi du Nettoyage revient avec sa nouvelle version. */
export const trackingTexts = {
  eyebrow: 'Mon espace KSP',
  title: 'Suivre mes demandes',
  lead: 'Toutes vos demandes, tous services confondus : où en est chacune, et qui doit agir.',
  back: 'Mon espace KSP',
  emptyTitle: 'Aucune demande à suivre pour le moment',
  emptyText:
    'Le suivi de vos demandes de nettoyage reviendra ici avec la nouvelle version du service. Vos factures et vos paiements restent dans Mon espace KSP.',
  emptyAction: 'Mes factures et paiements',
} as const;
