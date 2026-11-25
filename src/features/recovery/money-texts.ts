import type { BackendNeed } from '@/components/ui/backend-pending';

/*
 * Textes de l'argent du créancier : arrêt d'un dossier et paiement reçu directement (fiche d'un dossier),
 * reversements et relevés (`/mon-espace/recouvrement/releves`). Sans zod. Règle des frais de dossier
 * (décision du 25 novembre 2026) : frais d'étude, jamais remboursés.
 */

const PATH = '/api/v1/recovery';

export const stopTexts = {
  title: 'Arrêter le dossier',
  lead: 'Vous pouvez arrêter le recouvrement de ce dossier. KSP cesse alors toute démarche auprès de votre débiteur.',
  consequencesTitle: 'Ce que l’arrêt implique',
  consequences: [
    'La commission de KSP reste due sur les sommes déjà encaissées.',
    'Si votre débiteur vous paie directement dans les 30 jours qui suivent l’arrêt, la commission est due sur ce paiement.',
    'Les frais de dossier sont des frais d’étude : ils ne sont jamais remboursés.',
  ],
  open: 'Arrêter le dossier…',
  reasonLabel: 'Motif de l’arrêt',
  reasonHint: 'De 3 à 500 caractères : accord trouvé avec le débiteur, créance abandonnée…',
  reasonTooShort: 'Indiquez le motif de l’arrêt, en 3 caractères au moins.',
  acknowledge:
    'J’ai compris : la commission reste due sur les sommes encaissées et sur un paiement direct reçu dans les 30 jours.',
  acknowledgeRequired: 'Cochez la case pour confirmer que vous avez compris.',
  submit: 'Confirmer l’arrêt',
  submitting: 'Arrêt en cours…',
  cancel: 'Annuler',
  done: 'Dossier arrêté. La commission reste due sur les sommes encaissées et sur un paiement direct reçu dans les 30 jours.',
  pendingTitle: 'L’arrêt en ligne arrive bientôt',
  pendingText:
    'Pour arrêter ce dossier dès maintenant, contactez KSP : votre chargé de dossier enregistre l’arrêt et son motif.',
  counter: (count: number) => `${count} / 500`,
} as const;

export const stopNeeds: ReadonlyArray<BackendNeed> = [
  {
    method: 'POST',
    path: `${PATH}/cases/{id}/stop`,
    purpose:
      'Arrêter le dossier (motif de 3 à 500 caractères) : le service répond 501 RECOVERY_NOT_IMPLEMENTED.',
  },
];

export const directPaymentTexts = {
  title: 'Déclarer un paiement reçu',
  lead: 'Votre débiteur vous a payé directement, en espèces, par virement ou par Mobile Money ? Déclarez-le : la somme est déduite de ce qu’il doit et KSP cesse de la lui réclamer.',
  commission:
    'La commission de KSP sur ce paiement vous est facturée chaque mois, sur votre facture de commission, et débitée de votre portefeuille.',
  open: 'Déclarer un paiement reçu…',
  amountLabel: 'Montant reçu (FCFA)',
  amountHint: (due: string) => `Au plus le reste dû : ${due}.`,
  amountInvalid: 'Saisissez un montant entier en FCFA, supérieur à zéro.',
  dateLabel: 'Date de réception',
  dateHint: 'Aujourd’hui au plus tard.',
  dateInvalid: 'Indiquez la date de réception, aujourd’hui au plus tard.',
  noteLabel: 'Note (facultatif)',
  noteHint: 'Moyen de paiement, référence du virement… 500 caractères au plus.',
  counter: (count: number) => `${count} / 500`,
  proofLegend: 'Preuve du paiement (facultatif)',
  proofHint: 'Reçu, capture d’écran du virement… PDF, JPEG, PNG ou WebP, 10 Mo au plus.',
  submit: 'Déclarer le paiement',
  submitting: 'Enregistrement…',
  cancel: 'Annuler',
  done: (amount: string, due: string) => `Paiement de ${amount} enregistré. Reste dû : ${due}.`,
  suspended:
    'Le dossier est suspendu par une contestation : vous pouvez tout de même déclarer un paiement reçu.',
} as const;

export const statementsTexts = {
  title: 'Reversements et relevés',
  lead: 'Ce que vous avez reçu, la commission de KSP et vos factures, mois par mois.',
  back: 'Mon recouvrement',
  tabsLabel: 'Argent du recouvrement',
  tabs: {
    remittances: 'Reversements',
    statements: 'Relevés mensuels',
    invoices: 'Factures de commission',
    receipts: 'Reçus des frais',
  },
  loading: 'Chargement…',
  retry: 'Réessayer',
  loadMore: 'Afficher plus',
  loadingMore: 'Chargement…',

  // Reversements.
  remittancesLead:
    'Chaque somme payée par vos débiteurs est créditée à votre portefeuille, commission de KSP déduite. Vous la retirez depuis votre portefeuille.',
  withdraw: 'Retirer depuis mon portefeuille',
  remittancesNone:
    'Aucun reversement pour le moment : chaque somme recouvrée apparaîtra ici, commission déduite.',
  gross: 'Payé par le débiteur',
  commission: 'Commission KSP',
  net: 'Crédité à votre portefeuille',
  creditedOn: (date: string) => `Crédité le ${date}`,
  caseLink: (number: string) => `Dossier ${number}`,

  // Relevés.
  statementsLead:
    'Un relevé par dossier et par mois : sommes encaissées, commission, frais et montant reversé, avec le relevé PDF et la facture de commission.',
  statementsNone: 'Aucun relevé pour le moment : le premier est émis après le premier mois d’encaissements.',
  collected: 'Encaissé',
  costs: 'Frais',
  remitted: 'Reversé',
  pdf: 'Relevé PDF',
  invoice: 'Facture de commission',
  pendingTitle: 'Vos relevés mensuels arrivent bientôt',
  pendingText:
    'En attendant, l’onglet « Reversements » détaille chaque somme créditée, et l’onglet « Factures de commission » la commission de chaque mois.',
  issuedOn: (date: string) => `Émis le ${date}`,
} as const;

export const statementsNeeds: ReadonlyArray<BackendNeed> = [
  {
    method: 'GET',
    path: `${PATH}/statements`,
    purpose:
      'Relevés par mois (`period` AAAA-MM) et par dossier, PDF et facture de commission : le service répond 501 RECOVERY_NOT_IMPLEMENTED.',
  },
];
