import type { BadgeTone } from '@/components/ui/badge';
import type { FileCode, LineCode, TemplateColumn } from './import-check';

/*
 * Textes de l'import par tableur : modèle, vérification dans le navigateur, envoi, résultat du contrôle de
 * KSP, confirmation. Sans zod. Règle des frais de dossier (décision du 25 novembre 2026) : frais d'étude,
 * jamais remboursés.
 */

/** Colonnes du modèle : intitulé exact (en-tête), libellé, aide. */
export const COLUMN_HELP: Record<TemplateColumn, { label: string; help: string; required: boolean }> = {
  debtorKind: {
    label: 'Type de débiteur',
    help: '« person » (une personne) ou « company » (une société).',
    required: true,
  },
  debtorName: {
    label: 'Nom ou raison sociale',
    help: 'Nom de famille d’une personne, raison sociale d’une société.',
    required: true,
  },
  debtorFirstNames: { label: 'Prénoms', help: 'Pour une personne.', required: false },
  debtorIfu: {
    label: 'IFU',
    help: 'Identifiant fiscal d’une société : il regroupe ses factures en un seul dossier.',
    required: false,
  },
  debtorPhone: {
    label: 'Téléphone',
    help: 'Numéro du Bénin : 01 97 00 00 00, 97 00 00 00 ou +229…',
    required: true,
  },
  debtorEmail: { label: 'E-mail', help: 'Facultatif.', required: false },
  debtorAddress: { label: 'Adresse', help: 'Facultatif.', required: false },
  invoiceReference: { label: 'Référence de la facture', help: 'Unique dans le fichier.', required: true },
  amount: {
    label: 'Montant (FCFA)',
    help: 'Nombre entier, sans décimale : 850000 ou 850 000.',
    required: true,
  },
  dueDate: { label: 'Date d’exigibilité', help: 'JJ/MM/AAAA ou AAAA-MM-JJ, déjà passée.', required: true },
  description: { label: 'Description', help: 'Facultatif.', required: false },
  nature: {
    label: 'Nature',
    help: '« unpaid_invoice » (par défaut), « service », « sale », « loan », « acknowledgment_of_debt », « bounced_cheque » ou « other ».',
    required: false,
  },
};

const FILE_MESSAGES: Record<FileCode, string> = {
  wrong_type: 'Ce fichier n’est ni un CSV ni un classeur Excel (.xlsx). Partez du modèle à télécharger.',
  too_large: 'Le tableur dépasse 5 Mo : répartissez vos factures sur plusieurs fichiers.',
  empty: 'Ce fichier est vide.',
  unreadable:
    'Ce fichier est illisible : un guillemet n’est pas refermé. Enregistrez-le de nouveau au format CSV.',
  header_missing:
    'La première ligne doit reprendre les intitulés des 12 colonnes du modèle : elle contient déjà une facture.',
  columns:
    'Les colonnes ne correspondent pas au modèle : la première ligne doit reprendre ses 12 intitulés, dans le même ordre.',
  no_rows: 'Aucune facture dans ce fichier : ajoutez une ligne par facture sous l’en-tête.',
  too_many_rows: '1 000 factures au plus par fichier : répartissez-les sur plusieurs fichiers.',
};
export const fileMessage = (code: FileCode) => FILE_MESSAGES[code];

/** Erreurs d'une ligne : codes du navigateur et de recovery (`RecoveryImportLine.errors[].code`). */
const LINE_MESSAGES: Record<LineCode | 'amount_below_minimum', string> = {
  debtor_kind_invalid: 'Type de débiteur : « person » ou « company ».',
  debtor_name_missing: 'Nom ou raison sociale manquant.',
  phone_missing: 'Téléphone manquant.',
  phone_invalid: 'Téléphone invalide : un numéro du Bénin est attendu.',
  email_invalid: 'E-mail invalide.',
  invoice_reference_missing: 'Référence de la facture manquante.',
  invoice_reference_duplicate: 'Référence déjà utilisée sur une autre ligne.',
  nature_invalid: 'Nature inconnue.',
  amount_invalid: 'Montant invalide : un nombre entier de FCFA est attendu.',
  amount_below_minimum: 'Total des factures de ce débiteur sous le montant minimum d’un dossier.',
  due_date_missing: 'Date d’exigibilité manquante.',
  due_date_invalid: 'Date d’exigibilité invalide : JJ/MM/AAAA ou AAAA-MM-JJ.',
  due_date_not_reached: 'Date d’exigibilité pas encore atteinte.',
  example_row: 'Ligne d’exemple du modèle : remplacez-la par vos factures.',
};
export const lineMessage = (code: string) => LINE_MESSAGES[code as LineCode] ?? 'Valeur refusée.';

const IMPORT_STATUSES: Record<string, { label: string; tone: BadgeTone }> = {
  checked: { label: 'À confirmer', tone: 'warning' },
  confirmed: { label: 'Brouillons créés', tone: 'success' },
  expired: { label: 'Expiré', tone: 'neutral' },
};
export const importStatus = (status: string) =>
  IMPORT_STATUSES[status] ?? { label: 'État inconnu', tone: 'neutral' as BadgeTone };

const LINE_STATUSES: Record<string, { label: string; tone: BadgeTone }> = {
  valid: { label: 'Valide', tone: 'success' },
  invalid: { label: 'À corriger', tone: 'danger' },
  ignored: { label: 'Ignorée', tone: 'neutral' },
};
export const lineStatus = (status: string) =>
  LINE_STATUSES[status] ?? { label: 'État inconnu', tone: 'neutral' as BadgeTone };

export const importTexts = {
  title: 'Importer un tableur',
  lead: 'Plusieurs factures d’un coup : une ligne par facture, contrôlée par KSP, puis un brouillon de dossier par débiteur.',
  back: 'Mon recouvrement',
  readOnly:
    'Votre rôle dans cette entreprise permet de consulter les dossiers : seuls les administrateurs et les membres peuvent importer un tableur.',

  // 1. Modèle.
  templateTitle: '1. Téléchargez le modèle',
  templateLead:
    'Un fichier CSV de 12 colonnes, avec une ligne d’exemple à remplacer. Il s’ouvre dans Excel, LibreOffice ou Google Sheets ; enregistrez-le au format CSV ou XLSX.',
  templateDownload: 'Télécharger le modèle (CSV)',
  columnsTitle: 'Les 12 colonnes, dans l’ordre',
  columnHeader: 'Intitulé',
  columnLabel: 'Contenu',
  required: 'obligatoire',
  optional: 'facultatif',

  // 2. Fichier et vérification.
  fileTitle: '2. Choisissez le type et le fichier',
  kindLegend: 'Vos débiteurs sont',
  kinds: {
    b2b: { label: 'Des entreprises', hint: 'Factures impayées entre professionnels.' },
    b2c: { label: 'Des particuliers', hint: 'Clients particuliers.' },
  } as Record<'b2b' | 'b2c', { label: string; hint: string }>,
  kindRequired: 'Choisissez le type de vos débiteurs.',
  fileLabel: 'Tableur (CSV ou XLSX, 5 Mo et 1 000 factures au plus)',
  fileRequired: 'Choisissez votre tableur.',
  checking: 'Vérification du fichier…',
  checkedOk: (rows: number) =>
    `${rows} facture${rows > 1 ? 's' : ''} vérifiée${rows > 1 ? 's' : ''} dans votre navigateur : aucune erreur.`,
  checkedErrors: (invalid: number, rows: number) =>
    `${invalid} ligne${invalid > 1 ? 's' : ''} à corriger sur ${rows}. Corrigez le fichier puis choisissez-le de nouveau.`,
  xlsxUnchecked:
    'Un classeur Excel n’est pas lu dans votre navigateur : KSP le contrôle ligne par ligne après l’envoi.',
  minimumNote:
    'KSP vérifie aussi, après l’envoi, que le total des factures de chaque débiteur atteint le montant minimum d’un dossier.',
  row: (row: number) => `Ligne ${row}`,
  rowHint: 'Lignes numérotées sans l’en-tête : la ligne 1 est votre première facture.',
  moreErrors: (count: number) =>
    `… et ${count} autre${count > 1 ? 's' : ''} ligne${count > 1 ? 's' : ''} à corriger.`,

  // 3. Envoi.
  sendTitle: '3. Envoyez le tableur',
  sendLead:
    'KSP contrôle chaque ligne. Rien n’est créé avant votre confirmation : vous pourrez corriger ou ignorer les lignes refusées.',
  send: 'Envoyer le tableur',
  uploading: 'Envoi du fichier…',
  analysing: 'Contrôle des lignes par KSP…',
  sendPendingTitle: 'L’envoi du tableur arrive bientôt',
  sendPendingText:
    'La vérification de votre fichier fonctionne déjà. En attendant l’envoi en ligne, déposez vos dossiers un par un avec l’assistant.',
  newCase: 'Déposer un dossier',

  // Résultat.
  resultTitle: 'Résultat de l’import',
  resultLead:
    'Corrigez ou ignorez les lignes refusées, puis confirmez : un brouillon de dossier est créé pour chaque débiteur.',
  loading: 'Chargement de l’import…',
  retry: 'Réessayer',
  notFound:
    'Cet import est introuvable. Il appartient peut-être à un autre compte : vérifiez le compte actif.',
  kindOf: (kind: string) => (kind === 'b2c' ? 'Débiteurs particuliers' : 'Débiteurs entreprises'),
  createdOn: (date: string) => `Envoyé le ${date}`,
  linesTotal: 'Lignes lues',
  linesValid: 'Valides',
  linesInvalid: 'À corriger',
  casesPlanned: 'Dossiers prévus',
  invalidTitle: 'Lignes à corriger',
  invalidNone: 'Aucune ligne à corriger.',
  validTitle: 'Lignes valides',
  ignoredTitle: 'Lignes ignorées',
  edit: 'Corriger',
  ignore: 'Ignorer cette ligne',
  save: 'Enregistrer la ligne',
  saving: 'Enregistrement…',
  cancel: 'Annuler',
  editLegend: (row: number) => `Corriger la ligne ${row}`,
  lineSaved: (row: number) => `Ligne ${row} enregistrée : KSP l’a contrôlée de nouveau.`,
  lineIgnored: (row: number) => `Ligne ${row} ignorée.`,
  debtorOf: (name: string, phone: string) => (phone ? `${name} · ${phone}` : name),
  invoiceOf: (reference: string, amount: string, dueDate: string) =>
    [reference, amount, dueDate].filter(Boolean).join(' · '),
  confirmTitle: 'Confirmer l’import',
  confirmLead: (cases: number) =>
    cases > 1
      ? `${cases} brouillons de dossier vont être créés, un par débiteur.`
      : 'Un brouillon de dossier va être créé.',
  confirmBlocked: 'Corrigez ou ignorez d’abord les lignes refusées.',
  confirmNothing: 'Aucune ligne valide : rien à créer.',
  confirm: 'Créer les brouillons',
  confirming: 'Création des brouillons…',
  expired: 'Cet import a expiré sans être confirmé : envoyez de nouveau votre tableur.',
  again: 'Importer un autre tableur',

  // Brouillons créés.
  createdTitle: 'Brouillons créés',
  createdLead:
    'Complétez chaque brouillon : ses pièces justificatives, la signature du mandat, puis les frais de dossier. Les frais de dossier sont des frais d’étude : ils ne sont jamais remboursés.',
  createdCase: (number: string) => `Brouillon ${number}`,
  complete: 'Compléter',
  createdUnknown: 'Brouillon créé',
  allCases: 'Voir mes brouillons',
} as const;
