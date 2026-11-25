import type { StepName } from './draft';
import { FEE_RULE } from './texts';

/** Textes de l'assistant « Nouveau dossier » et de la modification d'un dossier. Sans zod. */
export const wizardTexts = {
  title: 'Nouveau dossier de recouvrement',
  lead: 'Décrivez la créance, joignez vos pièces, signez le mandat par code et payez les frais de dossier : KSP examine ensuite votre dossier.',
  progress: (current: number, total: number) => `Étape ${current} sur ${total}`,
  steps: {
    type: 'Type de créance',
    debtors: 'Débiteurs',
    claims: 'Créances',
    evidence: 'Pièces',
    effort: 'Démarches et échéancier',
    review: 'Récapitulatif',
    mandate: 'Mandat',
    fee: 'Frais de dossier',
  } satisfies Record<StepName, string>,
  stepLeads: {
    type: 'Qui vous doit de l’argent, et pourquoi ?',
    debtors: 'La personne ou la société qui vous doit, et le cas échéant ses codébiteurs ou garants.',
    claims: 'Chaque facture ou somme due, avec sa date d’exigibilité.',
    evidence: 'Factures, contrats, bons de livraison, échanges écrits : ce qui prouve la créance.',
    effort: 'Ce que vous avez déjà fait, et l’échéancier que vous acceptez pour votre débiteur.',
    review: 'Relisez votre dossier, puis enregistrez-le : vous signerez ensuite le mandat.',
    mandate:
      'Le mandat autorise KSP à recouvrer la créance en votre nom. Lisez-le, puis signez-le avec le code reçu.',
    fee: 'Dernière étape : les frais de dossier, payés avec votre portefeuille KSP.',
  } satisfies Record<StepName, string>,
  next: 'Continuer',
  back: 'Retour',
  save: 'Enregistrer le brouillon',
  saving: 'Enregistrement…',
  saveChanges: 'Enregistrer les modifications',
  restart: 'Recommencer un nouveau dossier',
  restartConfirm:
    'Le brouillon de cet onglet sera effacé. Un brouillon déjà enregistré reste dans vos dossiers.',
  goToStep: 'Corriger',
  fixStep: (step: string) => `Corrigez l’étape « ${step} ».`,
  loading: 'Chargement…',
  retry: 'Réessayer',
  readOnly:
    'Votre rôle dans cette entreprise permet de consulter les dossiers : seuls les administrateurs et les membres peuvent en déposer.',

  // 1. Type.
  kindLegend: 'Votre débiteur est',
  kinds: {
    b2b: { label: 'Une entreprise', hint: 'Factures, prestations, ventes à un client professionnel.' },
    b2c: { label: 'Un particulier', hint: 'Somme prêtée, vente ou service à une personne.' },
    rent: { label: 'Un locataire', hint: 'Loyers impayés : bientôt disponible.' },
  },
  soon: 'Bientôt',
  natureLabel: 'Nature de la créance',
  naturePlaceholder: 'Choisissez…',

  // 2. Débiteurs.
  debtorTitle: (index: number) => (index === 0 ? 'Débiteur' : `Débiteur ${index + 1}`),
  debtorKindLegend: 'Il s’agit de',
  roleLabel: 'Rôle',
  roleHint: 'Un seul débiteur principal : son nom identifie le dossier.',
  lastName: 'Nom',
  firstNames: 'Prénoms (facultatif)',
  legalName: 'Raison sociale',
  ifu: 'IFU (facultatif)',
  rccm: 'RCCM (facultatif)',
  representativeName: 'Représentant (facultatif)',
  phone: (index: number) => (index === 0 ? 'Téléphone' : `Autre téléphone`),
  phoneHint: 'Un numéro du Bénin peut s’écrire sans indicatif : 01 97 00 00 45.',
  phoneUsed: (value: string) => `Numéro utilisé : ${value}.`,
  email: (index: number) => (index === 0 ? 'E-mail' : 'Autre e-mail'),
  contactHint: 'Au moins un téléphone ou un e-mail : KSP contacte le débiteur par WhatsApp, SMS ou e-mail.',
  addPhone: 'Ajouter un téléphone',
  addEmail: 'Ajouter un e-mail',
  removeContact: (label: string) => `Retirer ${label}`,
  address: 'Adresse (facultatif)',
  addDebtor: 'Ajouter un codébiteur ou un garant',
  removeDebtor: (index: number) => `Retirer le débiteur ${index + 1}`,

  // 3. Créances.
  claimTitle: (index: number) => `Créance ${index + 1}`,
  reference: 'Référence',
  referenceHint: 'Numéro de facture, de contrat ou de reconnaissance.',
  amount: 'Montant (FCFA)',
  dueDate: 'Date d’exigibilité',
  dueDateHint: 'Date à laquelle la somme devait être payée.',
  description: 'Précision (facultatif)',
  addClaim: 'Ajouter une créance',
  removeClaim: (index: number) => `Retirer la créance ${index + 1}`,
  interests: 'Intérêts et pénalités (facultatif, FCFA)',
  alreadyPaid: 'Déjà payé par le débiteur (facultatif, FCFA)',
  estimateTitle: 'Estimation des frais',
  estimateLead: 'Calculée par KSP sur le montant déclaré ; elle est figée dans le mandat.',
  estimateWaiting: 'Saisissez les montants pour voir les frais de dossier et la commission.',
  estimating: 'Calcul en cours…',
  declared: 'Montant dû déclaré',
  caseFee: 'Frais de dossier',
  commission: 'Commission de KSP sur les sommes recouvrées',
  stageRates: 'Taux par étape',
  stageGroups: {
    amicable: 'À l’amiable',
    formal_notice: 'Après mise en demeure',
    litigation: 'Au judiciaire',
  } as Record<string, string>,
  minimum: (value: string) => `Montant minimum d’un dossier : ${value}.`,
  belowMinimum: (value: string | null) =>
    value
      ? `Le montant dû doit atteindre au moins ${value} pour ouvrir un dossier.`
      : 'Le montant dû est sous le minimum d’un dossier.',
  feeRule: FEE_RULE,

  // 4. Pièces.
  evidenceLegend: 'Pièces justificatives',
  evidenceHint: 'De 1 à 20 pièces : PDF, JPEG, PNG ou WebP, 10 Mo au plus chacune.',
  addEvidence: 'Ajouter des pièces',
  uploading: (name: string) => `Envoi de ${name}…`,
  removePiece: (name: string) => `Retirer ${name}`,
  pieceRefused: (name: string, reason: string) => `${name} : ${reason}`,
  pieceType: 'Format non accepté : PDF, JPEG, PNG ou WebP.',
  pieceSize: 'Fichier trop lourd : 10 Mo au plus.',
  lockedHint: 'Les pièces déjà déposées restent au dossier.',

  // 5. Démarches et échéancier.
  effortTitle: 'Démarches déjà faites',
  remindersCount: 'Nombre de relances déjà faites',
  lastReminderDate: 'Date de la dernière relance (facultatif)',
  channelsLegend: 'Par quels moyens ? (facultatif)',
  debtAcknowledged: 'Le débiteur a reconnu sa dette',
  acknowledgmentLegend: 'Preuve de la reconnaissance (facultatif)',
  acknowledgmentHint: 'Reconnaissance signée, message écrit : une pièce, PDF ou image.',
  addAcknowledgment: 'Joindre la preuve',
  promisesReceived: 'Promesses de paiement reçues (facultatif)',
  promisesHint: 'Dates et montants promis par le débiteur, s’il y en a eu.',
  preserveRelationship: 'Je souhaite préserver la relation avec ce débiteur',
  scaleTitle: 'Échéancier accepté pour ce dossier',
  scaleLead:
    'Prérempli avec vos préférences. Un échéancier proposé par le débiteur dans ces limites est accepté sans vous ; au-delà, votre accord est demandé.',
  scaleUnavailable:
    'Vos préférences d’échéancier n’ont pas pu être lues : le dossier reprendra celles de votre compte.',
  counter: (length: number, max: number) => `${length} / ${max}`,

  // 6. Récapitulatif.
  reviewKind: 'Type',
  reviewNature: 'Nature',
  reviewDebtors: 'Débiteurs',
  reviewClaims: 'Créances',
  reviewDeclared: 'Montant dû déclaré',
  reviewEvidence: 'Pièces',
  reviewEffort: 'Relances déjà faites',
  reviewScale: 'Échéancier',
  pieces: (count: number) => `${count} pièce${count > 1 ? 's' : ''}`,
  claims: (count: number) => `${count} créance${count > 1 ? 's' : ''}`,
  scaleSummary: (months: string) => `jusqu’à ${months} mois`,
  scaleRefused: 'pas d’échéancier',
  scaleDefault: 'celui de vos préférences',
  edit: 'Modifier',
  savedTitle: (number: string) => `Brouillon ${number} enregistré`,
  savedText:
    'Votre brouillon est dans vos dossiers. Signez le mandat et payez les frais avant la date limite : un brouillon non finalisé est supprimé.',
  draftDeadline: (date: string) => `À finaliser avant le ${date}.`,

  // 7. Mandat.
  duplicatesTitle: 'Dossiers semblables déjà ouverts',
  duplicatesText:
    'Ces dossiers concernent peut-être le même débiteur ou les mêmes références. Vérifiez avant de continuer.',
  duplicatesConfirm: 'Je confirme qu’il s’agit d’une autre créance',
  duplicatesMissing: 'Cochez la case pour confirmer, ou ouvrez le dossier semblable.',
  prepareTitle: 'Préparer le mandat',
  prepareText:
    'KSP produit le mandat avec les frais et la commission figés, puis vous envoie un code de signature par WhatsApp, SMS ou e-mail.',
  prepare: 'Préparer le mandat',
  preparing: 'Préparation du mandat…',
  frozenTitle: 'Conditions figées dans le mandat',
  waitingSigner: 'Le mandat attend la signature du membre qui l’a préparé.',
  signedWaiting: 'Signature enregistrée : préparation du paiement des frais…',
  signedSlow:
    'Votre signature est enregistrée ; le dossier n’est pas encore prêt pour le paiement des frais. Vérifiez de nouveau dans un instant.',
  checkAgain: 'Vérifier à nouveau',

  // 8. Frais.
  feeTitle: 'Payer les frais de dossier',
  feeLead: FEE_RULE,
  feeBefore: (date: string) => `À payer avant le ${date}, sinon le dossier est supprimé.`,
  payFee: 'Payer les frais avec mon portefeuille',

  // Confirmation.
  doneTitle: 'Dossier envoyé à KSP',
  doneText: (number: string) =>
    `Votre dossier ${number} est en examen. KSP vous répond sous 2 jours ouvrés : il est accepté, un complément vous est demandé, ou il est refusé.`,
  doneBefore: (date: string) => `Réponse au plus tard le ${date}.`,
  doneNotice: 'Vous êtes prévenu par WhatsApp, SMS ou e-mail à chaque étape.',
  seeCase: 'Voir le dossier',
  newCase: 'Déposer un autre dossier',

  // Modification.
  editTitle: (number: string) => `Modifier le dossier ${number}`,
  editLead: 'Corrigez la saisie, puis enregistrez.',
  completeTitle: (number: string) => `Compléter le dossier ${number}`,
  completeLead: 'KSP vous demande un complément : modifiez le dossier ou ajoutez des pièces, puis répondez.',
  requestedNote: 'Ce que KSP vous demande',
  completionNote: 'Votre réponse à KSP (facultatif)',
  completionHint: 'Expliquez ce que vous avez corrigé ou ajouté.',
  sendCompletion: 'Envoyer le complément',
  mandateReset: 'Le mandat préparé décrivait l’ancienne saisie : il sera préparé de nouveau.',
  notEditable:
    'Ce dossier ne se modifie plus : seuls un brouillon ou un dossier en attente de complément le peuvent.',
  savedChanges: 'Modifications enregistrées.',
} as const;
