/**
 * Textes du retrait vers Mobile Money (R-WL-04, ADR-055 décision 8). Sans zod : seuls les écrans du
 * retrait, chargés à la demande, les lisent.
 */
export const withdrawalTexts = {
  title: 'Retirer vers Mobile Money',
  lead: 'Transférez tout ou partie de votre solde vers un compte Mobile Money au Bénin. KSP vérifie chaque demande avant le virement.',
  adminOnly:
    'Seuls les administrateurs de l’entreprise peuvent demander un retrait de son portefeuille. Vous pouvez suivre les retraits ci-dessous.',
  empty: 'Votre solde est vide : il n’y a rien à retirer pour le moment.',

  // Saisie.
  amount: 'Montant à retirer (FCFA)',
  amountHint: (balance: string) => `Solde disponible : ${balance}.`,
  all: (balance: string) => `Tout retirer (${balance})`,
  operator: 'Opérateur Mobile Money',
  phone: 'Numéro Mobile Money',
  phoneHint: 'Numéro béninois qui reçoit l’argent, par exemple 01 97 00 00 45.',
  phoneUsed: (phone: string) => `Numéro utilisé : ${phone}.`,
  name: 'Nom du titulaire du compte Mobile Money',
  nameHint: 'Tel qu’il est enregistré chez l’opérateur.',
  continue: 'Vérifier ma demande',

  // Récapitulatif.
  recapTitle: 'Vérifiez votre demande',
  recapAmount: 'Montant',
  recapTo: 'Vers',
  recapName: 'Au nom de',
  recapHint:
    'Le montant est retenu sur votre solde dès l’envoi. KSP vérifie la demande, puis verse l’argent sur ce compte. Une demande envoyée ne s’annule pas en ligne.',
  confirm: (amount: string) => `Confirmer le retrait de ${amount}`,
  confirmShort: 'Confirmer le retrait',
  confirmAmount: (amount: string) => `de ${amount}`,
  sending: 'Envoi de la demande…',
  edit: 'Modifier',

  // Après l'envoi.
  done: (amount: string) => `Demande de retrait de ${amount} enregistrée.`,
  alreadyDone: (amount: string) => `Cette demande de retrait de ${amount} était déjà enregistrée.`,
  newBalance: (amount: string) => `Nouveau solde : ${amount}.`,
  follow: 'Suivez son avancement dans « Mes retraits ».',
  another: 'Faire une autre demande',

  errors: {
    amountEmpty: 'Indiquez le montant à retirer.',
    amountInvalid: 'Indiquez un montant en francs CFA, en chiffres, sans décimales.',
    amountTooHigh: (max: string) => `Le montant d’un retrait ne peut pas dépasser ${max}.`,
    amountOverBalance: (balance: string) => `Le montant dépasse votre solde disponible (${balance}).`,
    operatorEmpty: 'Choisissez l’opérateur du compte Mobile Money.',
    phoneEmpty: 'Indiquez le numéro Mobile Money qui reçoit l’argent.',
    phoneInvalid:
      'Indiquez un numéro béninois à 10 chiffres (par exemple 01 97 00 00 45), ou au format +229.',
    nameEmpty: 'Indiquez le nom du titulaire du compte.',
    nameTooLong: (max: number) => `Le nom ne doit pas dépasser ${max} caractères.`,
  },
  insufficient: (missing: string) => `Solde insuffisant : il vous manque ${missing}.`,
  insufficientUnknown: 'Solde insuffisant pour ce retrait.',
  keyReused: 'La demande n’a pas pu être préparée. Vérifiez-la, puis confirmez de nouveau.',
  concurrent:
    'Le portefeuille était en cours de mise à jour. Confirmez de nouveau : rien ne sera retiré deux fois.',
  tooMany: 'Trop de demandes en peu de temps. Patientez une minute avant de réessayer.',
  genericError: 'Une erreur est survenue. Réessayez dans quelques instants.',
  reference: (message: string, id: string) => `${message} (référence : ${id})`,

  // « Mes retraits ».
  listTitle: 'Mes retraits',
  listEmpty: 'Aucun retrait pour le moment.',
  to: (operator: string, phone: string) => `Vers ${operator} ${phone}`,
  statuses: {
    requested: 'Demandé',
    awaiting_approval: 'En validation',
    submitted: 'Virement en cours',
    completed: 'Versé',
    failed: 'Échoué',
    rejected: 'Refusé',
  } as Record<string, string>,
  progress: {
    requested: 'KSP vérifie votre demande.',
    awaiting_approval: 'Demande vérifiée, en attente de validation par KSP.',
    submitted: 'Virement transmis à l’opérateur.',
  } as Record<string, string>,
  completed: (date: string) => `Versé le ${date}.`,
  failed: (date: string) => `Échec du virement le ${date} : le montant est revenu à votre solde.`,
  rejected: (date: string) => `Refusé le ${date} : le montant est revenu à votre solde.`,
  rejectedReason: (reason: string) => `Motif : ${reason}`,

  // Solde.
  inProgress: (amount: string) => `En cours de retrait : ${amount}, déjà déduit du solde.`,
} as const;
