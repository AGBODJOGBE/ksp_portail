/**
 * Adresses du Recouvrement. Module à part, sans texte : l'accueil de Mon espace et les pages de la
 * fonctionnalité le lisent sans télécharger ses textes. Les adresses du dossier et de la décision sont
 * celles des liens des notifications du service recovery
 * (`services/notification/src/application/events/recovery.rules.ts`), suivies de `?organisation=<id>`
 * pour un dossier d'entreprise.
 */
const id = (value: string) => encodeURIComponent(value);

const SPACE = '/mon-espace/recouvrement';

export const recoveryPaths = {
  /** Page publique du Recouvrement. */
  home: '/recouvrement',
  /** Tableau de bord du créancier dans Mon espace KSP. */
  space: SPACE,
  newCase: `${SPACE}/nouveau`,
  cases: `${SPACE}/dossiers`,
  /** Liste filtrée par l'adresse (`?etat=`, `?etape=`, `?type=`, `?q=`). */
  casesWith: (query: Record<string, string | undefined>) => {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(query)) if (value) params.set(key, value);
    const search = params.toString();
    return search ? `${SPACE}/dossiers?${search}` : `${SPACE}/dossiers`;
  },
  case: (caseId: string) => `${SPACE}/dossiers/${id(caseId)}`,
  editCase: (caseId: string) => `${SPACE}/dossiers/${id(caseId)}/modifier`,
  preferences: `${SPACE}/preferences`,
  decisions: `${SPACE}/decisions`,
  decision: (decisionId: string) => `${SPACE}/decisions/${id(decisionId)}`,
  statements: `${SPACE}/releves`,
  imports: `${SPACE}/import`,
  importDetail: (importId: string) => `${SPACE}/import/${id(importId)}`,
  /** Portefeuille du contexte actif : frais payés, sommes recouvrées créditées, retraits. */
  wallet: '/mon-espace/portefeuille',
  /** Document du service document (mandat signé, attestation). */
  document: (documentId: string) => `/mon-espace/documents/${id(documentId)}`,
  /** Support du Recouvrement (page Contact, sujet présélectionné). */
  support: '/contact?sujet=recouvrement-conseil',
} as const;
