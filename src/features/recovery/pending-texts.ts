import type { BackendNeed } from '@/components/ui/backend-pending';

/*
 * Pages du Recouvrement qui attendent le backend (lot suivant) : décisions, relevés, import d'un tableur.
 * Chaque page dit au client ce qui arrive et quoi faire en attendant ; hors production, les routes
 * attendues sont listées (`BackendPending`).
 */

const PATH = '/api/v1/recovery';

export interface PendingPage {
  eyebrow: string;
  title: string;
  lead: string;
  pendingTitle: string;
  pendingText: string;
  needs: ReadonlyArray<BackendNeed>;
}

const decisionNeeds: ReadonlyArray<BackendNeed> = [
  {
    method: 'GET',
    path: `${PATH}/decisions`,
    purpose:
      'Décisions du créancier (échéancier hors barème, remise, devis d’huissier ou judiciaire, contestation, saut d’étape) : aujourd’hui 501 RECOVERY_NOT_IMPLEMENTED.',
  },
  {
    method: 'POST',
    path: `${PATH}/decisions/{id}`,
    purpose: 'Accepter, refuser ou répondre (Idempotency-Key) ; un devis accepté débite la provision.',
  },
];

export const pendingPages = {
  decisions: {
    eyebrow: 'Recouvrement',
    title: 'Décisions',
    lead: 'Les choix qui vous reviennent pendant le recouvrement : échéancier hors barème, remise, passage à l’huissier ou au judiciaire, réponse à une contestation.',
    pendingTitle: 'Vos décisions en ligne arrivent bientôt',
    pendingText:
      'Vous serez prévenu à chaque décision attendue et pourrez répondre ici. En attendant, KSP vous contacte pour recueillir votre accord.',
    needs: decisionNeeds,
  },
  decision: {
    eyebrow: 'Recouvrement',
    title: 'Décision attendue',
    lead: 'Une décision vous est demandée sur l’un de vos dossiers.',
    pendingTitle: 'La réponse en ligne arrive bientôt',
    pendingText:
      'Vous pourrez lire la proposition et y répondre ici. En attendant, contactez KSP pour donner votre réponse avant la date limite indiquée dans le message reçu.',
    needs: [
      ...decisionNeeds,
      {
        method: 'GET',
        path: `${PATH}/decisions/{id}`,
        purpose:
          'Lecture d’une décision par son identifiant (lien des notifications) : absente du contrat, la page la cherchera dans la liste en attendant.',
      },
    ],
  },
  statements: {
    eyebrow: 'Recouvrement',
    title: 'Relevés mensuels',
    lead: 'Chaque mois, par dossier : sommes encaissées, commission de KSP, frais, montant crédité à votre portefeuille et facture de commission.',
    pendingTitle: 'Vos relevés arrivent bientôt',
    pendingText:
      'En attendant, chaque somme créditée apparaît dans le relevé de votre portefeuille, et chaque paiement dans la fiche du dossier.',
    needs: [
      {
        method: 'GET',
        path: `${PATH}/statements`,
        purpose:
          'Relevés par mois (`period` AAAA-MM) et par dossier, PDF et facture de commission : aujourd’hui 501.',
      },
      {
        method: 'GET',
        path: `${PATH}/remittances`,
        purpose: 'Reversements reçus (brut, commission, net, transaction du portefeuille) : aujourd’hui 501.',
      },
    ],
  },
  imports: {
    eyebrow: 'Recouvrement',
    title: 'Importer un tableur',
    lead: 'Plusieurs factures d’un coup : un tableur au modèle KSP (CSV ou XLSX, 1 000 lignes au plus), contrôlé ligne par ligne, puis un brouillon par débiteur.',
    pendingTitle: 'L’import par tableur arrive bientôt',
    pendingText:
      'En attendant, déposez vos dossiers un par un avec l’assistant : un dossier peut regrouper jusqu’à 200 factures d’un même débiteur.',
    needs: [
      {
        method: 'POST',
        path: '/api/v1/file/uploads',
        purpose:
          'Finalité `recovery_import` (tableur) absente de la liste ouverte au client : l’envoi du fichier est refusé.',
      },
      {
        method: 'POST',
        path: `${PATH}/imports`,
        purpose: 'Contrôle du tableur (Idempotency-Key), lignes valides et en erreur.',
      },
      {
        method: 'PUT',
        path: `${PATH}/imports/{id}/lines/{row}`,
        purpose: 'Correction ou mise à l’écart d’une ligne.',
      },
      {
        method: 'POST',
        path: `${PATH}/imports/{id}/confirm`,
        purpose: 'Création d’un brouillon par débiteur (Idempotency-Key).',
      },
    ],
  },
  importDetail: {
    eyebrow: 'Recouvrement',
    title: 'Résultat de l’import',
    lead: 'Lignes valides, lignes à corriger et dossiers prévus avant la confirmation.',
    pendingTitle: 'L’import par tableur arrive bientôt',
    pendingText: 'En attendant, déposez vos dossiers un par un avec l’assistant.',
    needs: [
      {
        method: 'GET',
        path: `${PATH}/imports/{id}`,
        purpose: 'Résultat d’un import : lignes, erreurs, dossiers prévus, dossiers créés.',
      },
    ],
  },
} satisfies Record<string, PendingPage>;

export const pendingTexts = {
  back: 'Mon recouvrement',
  newCase: 'Déposer un dossier',
  contact: 'Contacter KSP',
} as const;

/** Actions de la fiche d'un dossier pas encore servies (arrêt, paiement direct). */
export const caseActionNeeds: ReadonlyArray<BackendNeed> = [
  {
    method: 'POST',
    path: `${PATH}/cases/{id}/stop`,
    purpose: 'Arrêter le dossier (motif de 3 à 500 caractères) : aujourd’hui 501.',
  },
  {
    method: 'POST',
    path: `${PATH}/cases/{id}/direct-payments`,
    purpose: 'Déclarer un paiement reçu directement (Idempotency-Key) : aujourd’hui 501.',
  },
];
