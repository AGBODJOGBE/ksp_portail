import { FEE_RULE } from './texts';

/** Textes de la fiche d'un dossier. Sans zod. */
export const caseTexts = {
  back: 'Mes dossiers',
  loading: 'Chargement du dossier…',
  retry: 'Réessayer',
  notFound:
    'Ce dossier est introuvable. Il appartient peut-être à un autre compte : vérifiez le compte actif.',
  numberOf: (number: string) => `Dossier ${number}`,
  createdAt: 'Créé le',
  submittedAt: 'Envoyé le',
  acceptedAt: 'Accepté le',
  stage: 'Étape',
  due: 'Reste dû',
  paid: 'Recouvré',
  nextDeadline: 'Prochaine échéance',
  none: '—',
  readOnly:
    'Votre rôle dans cette entreprise permet de consulter ce dossier : seuls les administrateurs et les membres peuvent agir.',
  tabs: { case: 'Dossier', journal: 'Journal' },
  tabsLabel: 'Sections du dossier',

  // Action du moment.
  actionTitle: 'À faire maintenant',
  draftTitle: 'Brouillon à finaliser',
  draftText:
    'Préparez puis signez le mandat, et payez les frais de dossier. Vous pouvez encore modifier la saisie.',
  draftBefore: (date: string) => `À finaliser avant le ${date}, sinon le brouillon est supprimé.`,
  editDraft: 'Modifier le brouillon',
  mandateTitle: 'Mandat à signer',
  feeTitle: 'Frais de dossier à payer',
  feeBefore: (date: string) => `À payer avant le ${date}, sinon le dossier est supprimé.`,
  reviewTitle: 'Dossier en examen',
  reviewText: 'KSP examine votre dossier sous 2 jours ouvrés. Vous êtes prévenu dès la décision.',
  reviewBefore: (date: string) => `Réponse au plus tard le ${date}.`,
  infoTitle: 'Complément demandé',
  infoBefore: (date: string) => `À envoyer avant le ${date}, sinon le dossier est classé.`,
  complete: 'Compléter le dossier',
  activeTitle: 'Recouvrement en cours',
  activeText: (stage: string) => `Étape actuelle : ${stage}. KSP agit auprès de votre débiteur.`,
  suspendedTitle: 'Dossier suspendu',
  suspendedText:
    'Le débiteur conteste la créance : le recouvrement est suspendu le temps de traiter la contestation. Votre réponse vous est demandée dans « Décisions ».',
  decisionsLink: 'Voir les décisions',
  closedTitle: 'Dossier clos',
  closedOn: (date: string) => `Clos le ${date}.`,
  certificate: 'Attestation de règlement',
  rejectedTitle: 'Dossier refusé',
  rejectedNote: 'Précision de KSP',

  // Frise.
  timelineTitle: 'Étapes du recouvrement',
  timelineBefore: 'Les étapes commencent quand KSP accepte le dossier.',
  stageDone: 'Faite',
  stageCurrent: 'En cours',
  stageNext: 'À venir',
  stageSince: (date: string) => `depuis le ${date}`,

  // Montants.
  amountsTitle: 'Montants',
  principal: 'Créances',
  interests: 'Intérêts et pénalités',
  costs: 'Frais refacturés au débiteur',
  paidAmount: 'Déjà payé',
  waived: 'Remise accordée',
  dueAmount: 'Reste dû',
  overpaid: 'Trop-perçu',
  prescription: 'Prescription de la créance',

  // Échéancier en cours.
  planTitle: 'Échéancier du débiteur',
  planTotal: 'Total de l’échéancier',
  planMissed: (count: number) => `${count} échéance${count > 1 ? 's' : ''} manquée${count > 1 ? 's' : ''}`,
  installment: (rank: number) => `Échéance ${rank}`,

  // Débiteurs et créances.
  debtorsTitle: 'Débiteurs',
  ifu: 'IFU',
  rccm: 'RCCM',
  representative: 'Représentant',
  claimsTitle: 'Créances',
  dueDate: (date: string) => `exigible le ${date}`,

  // Paiements.
  paymentsTitle: 'Paiements reçus',
  paymentsNone: 'Aucun paiement pour le moment.',
  gross: 'Payé',
  commission: 'Commission KSP',
  net: 'Crédité à votre portefeuille',
  receipt: 'Reçu',
  walletLink: 'Voir mon portefeuille',

  // Pièces.
  documentsTitle: 'Pièces du dossier',
  documentsNone: 'Aucune pièce.',
  addedOn: (date: string, by: string | null) => (by ? `Ajoutée le ${date} par ${by}` : `Ajoutée le ${date}`),
  open: 'Ouvrir',
  addLegend: 'Ajouter des pièces',
  addHint: 'PDF, JPEG, PNG ou WebP, 10 Mo au plus : 20 pièces au plus par dossier.',
  adding: 'Rattachement au dossier…',
  added: (count: number) =>
    count > 1 ? `${count} pièces ajoutées au dossier.` : 'Pièce ajoutée au dossier.',

  // Tarification.
  pricingTitle: 'Frais et commission',
  pricingPending: 'Les frais et la commission sont figés à la préparation du mandat.',
  feeAmount: 'Frais de dossier',
  feeStatus: 'État des frais',
  feePaidOn: (date: string) => `payés le ${date}`,
  refunded: 'Montant remboursé',
  commissionRule: 'Commission sur les sommes recouvrées',
  feeRule: FEE_RULE,
  mandate: 'Mandat',
  mandateSigned: (date: string) => `Signé le ${date}`,
  mandatePending: 'En attente de signature',
  readMandate: 'Lire le mandat',
  agent: 'Chargé de votre dossier',

  // Journal.
  journalTitle: 'Journal du dossier',
  journalLead: 'Chaque action menée sur votre dossier, la plus récente d’abord.',
  journalNone: 'Aucune action enregistrée pour le moment.',
  journalLoading: 'Chargement du journal…',
  journalTruncated: 'Les 100 dernières actions sont affichées.',
  by: (name: string) => `par ${name}`,
} as const;
