/**
 * Adresses du Nettoyage. Module à part, sans texte : l'accueil de Mon espace, la page de retour d'un
 * paiement et les pages de la fonctionnalité le lisent sans télécharger ses textes. Les adresses de Mon
 * espace sont celles des liens des notifications du service cleaning
 * (`services/notification/src/application/events/cleaning.recipients.ts`), suivies de
 * `?organisation=<id>` pour un dossier d'entreprise.
 */
const id = (value: string) => encodeURIComponent(value);

const SPACE = '/mon-espace/nettoyage';

export const cleaningPaths = {
  /** Page publique du Nettoyage. */
  home: '/nettoyage',
  /** Simulateur de la page publique (ancre). */
  simulator: '/nettoyage#simulateur',
  /** Assistant de demande de devis. */
  request: '/nettoyage/demande',
  /** Demande de devis pour un lieu de « Mes lieux ». */
  requestForPlace: (placeId: string) => `/nettoyage/demande?lieu=${id(placeId)}`,
  /** Conditions générales du Nettoyage, dans la version acceptée avec le devis (`quote.termsVersion`). */
  terms: (version: string) => `/conditions/nettoyage/${id(version)}`,
  /** « Mes prestations de nettoyage » dans Mon espace KSP. */
  space: SPACE,
  places: `${SPACE}/lieux`,
  newPlace: `${SPACE}/lieux/nouveau`,
  place: (placeId: string) => `${SPACE}/lieux/${id(placeId)}`,
  requests: `${SPACE}/demandes`,
  requestDetail: (requestId: string) => `${SPACE}/demandes/${id(requestId)}`,
  programs: `${SPACE}/programmes`,
  program: (programId: string) => `${SPACE}/programmes/${id(programId)}`,
  session: (programId: string, sessionId: string) =>
    `${SPACE}/programmes/${id(programId)}/seances/${id(sessionId)}`,
  reorder: (programId: string) => `${SPACE}/programmes/${id(programId)}/commander-a-nouveau`,
  claims: `${SPACE}/reclamations`,
  claim: (claimId: string) => `${SPACE}/reclamations/${id(claimId)}`,
  /** Séance ouverte sans son programme (retour d'un paiement). */
  sessionRedirect: (sessionId: string) => `${SPACE}/seances/${id(sessionId)}`,
  /** Factures impayées et facture d'une séance (Mes factures, service billing). */
  unpaidInvoices: '/mon-espace/factures?etat=impayee',
  invoice: (invoiceId: string) => `/mon-espace/factures/${id(invoiceId)}`,
  /** Support du Nettoyage (page Contact, sujet présélectionné). */
  support: '/contact?sujet=nettoyage',
} as const;
