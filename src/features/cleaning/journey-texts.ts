/*
 * Textes du parcours « demande de devis par lieu » (ADR-034). À part de `texts.ts` : seules les pages du
 * parcours les téléchargent. Textes provisoires (à valider), en français, sans chiffre inventé : les
 * montants viennent de l'estimation de la gateway.
 */

const list = new Intl.ListFormat('fr', { style: 'long', type: 'conjunction' });

/** « KSP Nettoyage intervient aujourd'hui à … » ; phrase neutre si la liste n'est pas connue. */
export function servedLine(communes: ReadonlyArray<string>): string {
  return communes.length
    ? `KSP Nettoyage intervient aujourd’hui à ${list.format(communes)}.`
    : 'KSP Nettoyage n’intervient pour le moment dans aucune commune.';
}

export const journeyTexts = {
  title: 'Votre demande de devis',
  lead: 'Quelques questions sur votre lieu et vos besoins : une estimation immédiate, puis une visite avant le devis définitif.',
  progressLabel: 'Étapes de la demande de devis',
  steps: ['Le lieu', 'Les prestations', 'L’adresse', 'Vos disponibilités', 'Récapitulatif'],
  stepOf: (index: number, total: number) => `Étape ${index} sur ${total}`,
  back: 'Retour',
  next: 'Continuer',
  toReview: 'Vérifier ma demande',
  edit: 'Modifier',
  fixErrors: 'Vérifiez les champs signalés.',
  draftRestored: 'Nous avons repris votre demande là où vous l’aviez laissée.',
  restart: 'Recommencer',
  retry: 'Réessayer',
  loading: 'Chargement des prestations…',
  catalogError: 'Impossible de charger les prestations.',
  empty: 'Aucune prestation n’est proposée en ligne pour le moment. Contactez-nous pour un devis.',
  contactUs: 'Nous contacter',
  place: {
    title: 'Quel lieu faut-il nettoyer ?',
    hint: 'Choisissez le type de lieu : nous vous proposons ensuite les prestations qui lui correspondent.',
    services: (count: number) => (count > 1 ? `${count} prestations` : '1 prestation'),
    required: 'Choisissez un type de lieu.',
  },
  services: {
    title: 'De quoi avez-vous besoin ?',
    hint: 'Cochez une ou plusieurs prestations, puis décrivez-les : l’estimation se met à jour au fur et à mesure.',
    legend: 'Prestations proposées',
    required: 'Choisissez au moins une prestation.',
    tooMany: (max: number) => `Choisissez ${max} prestations au plus.`,
    details: (name: string) => `${name} : votre besoin`,
    options: 'Prestations complémentaires',
    optionsHint: 'Facultatif : cochez ce qui vous intéresse.',
    frequency: 'À quelle fréquence ?',
    optional: '(facultatif)',
    yes: 'Oui',
    no: 'Non',
    choose: 'Choisir…',
    range: (min: number | null, max: number | null, unit: string | null) => {
      const unitText = unit ? ` ${unit}` : '';
      if (min !== null && max !== null) return `Entre ${min} et ${max}${unitText}.`;
      if (min !== null) return `Au moins ${min}${unitText}.`;
      if (max !== null) return `Au plus ${max}${unitText}.`;
      return null;
    },
  },
  fieldErrors: {
    required: 'Ce champ est obligatoire.',
    choose: 'Choisissez une réponse.',
    integer: 'Indiquez un nombre entier, sans virgule.',
    range: (min: number, max: number) => `Indiquez un nombre entre ${min} et ${max}.`,
  },
  estimate: {
    title: 'Votre estimation',
    idle: 'Décrivez une prestation pour voir son estimation.',
    updating: 'Mise à jour de l’estimation…',
    toComplete: 'À compléter',
    unpriced: 'Prix sur devis',
    total: 'Total estimé',
    totalHint: 'Un passage de chaque prestation.',
    perVisit: 'par passage',
    partial: 'Le total s’affichera quand toutes les prestations auront un prix publié.',
    notContractual:
      'Estimation non contractuelle : le prix définitif figure dans le devis, établi après la visite des lieux.',
    indicative: 'Estimation indicative : votre commune sera prise en compte une fois l’adresse indiquée.',
    error: 'Estimation indisponible pour le moment.',
    announce: (total: string | null) =>
      total ? `Estimation mise à jour : total estimé ${total}.` : 'Estimation mise à jour.',
  },
  address: {
    title: 'Où se trouve le lieu ?',
    hint: 'La position et un point de repère permettent à nos agents de venir sur place.',
    positionTitle: 'Position du lieu',
    positionHint:
      'Sur place, touchez « Me localiser » : votre téléphone vous demandera l’autorisation. Ailleurs, placez le lieu sur la carte. La position sert uniquement à nos agents pour venir sur place.',
    locate: 'Me localiser',
    locating: 'Localisation en cours…',
    relocate: 'Me localiser à nouveau',
    located: (accuracy: number | null) =>
      accuracy ? `Position enregistrée, à environ ${accuracy} m près.` : 'Position enregistrée.',
    resolving: 'Recherche de la commune…',
    found: (commune: string) => `Commune : ${commune}`,
    served: 'Zone desservie',
    notFound:
      'Nous n’avons pas retrouvé la commune de cette position : choisissez-la dans la liste ci-dessous.',
    resolveLater: 'La commune sera confirmée par votre position au moment de l’envoi.',
    resolveError: 'La commune n’a pas pu être retrouvée pour le moment : choisissez-la dans la liste.',
    denied:
      'La localisation est refusée. Autorisez-la pour ce site dans les réglages de votre navigateur, puis réessayez.',
    unavailable:
      'Votre position n’a pas pu être déterminée. Vérifiez que la localisation de votre téléphone est activée, puis réessayez.',
    timeout:
      'La localisation prend trop de temps. Réessayez, de préférence à l’extérieur ou près d’une fenêtre.',
    unsupported: 'Votre navigateur ne permet pas la localisation.',
    positionRequired:
      'La position du lieu est nécessaire pour envoyer la demande : touchez « Me localiser » depuis le lieu.',
    positionHelp: 'Vous n’êtes pas sur place ? Placez le lieu sur la carte, ou saisissez ses coordonnées.',
    showMap: 'Placer sur la carte',
    hideMap: 'Masquer la carte',
    mapTitle: 'Placer le lieu sur la carte',
    mapHint:
      'Touchez la carte ou faites glisser le repère jusqu’au lieu. Au clavier : flèches et + / − pour la carte, « Placer le repère au centre », puis flèches sur le repère pour l’ajuster.',
    mapLabel: 'Carte : position du lieu',
    markerLabel: 'Repère du lieu. Flèches pour le déplacer.',
    placeAtCenter: 'Placer le repère au centre de la carte',
    mapLoading: 'Chargement de la carte…',
    mapError: 'La carte n’a pas pu être chargée. Utilisez « Me localiser » ou saisissez les coordonnées.',
    placed: 'Repère placé sur la carte.',
    coordsTitle: 'Ou saisissez les coordonnées',
    coordsHint: 'En degrés décimaux, avec un point : par exemple 6.3654 et 2.4183.',
    latitude: 'Latitude',
    longitude: 'Longitude',
    coordsApply: 'Placer le repère',
    coordsInvalid: 'Coordonnées invalides : latitude entre −90 et 90, longitude entre −180 et 180.',
    commune: 'Commune',
    communeHint: 'Utilisée si votre position ne suffit pas à retrouver la commune.',
    communeRequired: 'Choisissez la commune.',
    otherCommune: 'Autre commune',
    district: 'Quartier (facultatif)',
    districtHint: 'Exemple : Zogbadjè, Fidjrossè, Akpakpa.',
    landmark: 'Point de repère',
    landmarkHint:
      'Ce qui aide nos agents à trouver le lieu : « portail vert après la pharmacie », couleur de la maison…',
    landmarkRequired: 'Indiquez un point de repère.',
    landmarkTooLong: (max: number) => `Le quartier et le repère ne doivent pas dépasser ${max} caractères.`,
    outOfZoneTitle: 'Nous n’intervenons pas encore dans cette commune',
    outOfZone: (commune: string | null, line: string) =>
      `${commune ? `${commune} n’est pas encore desservie. ` : ''}${line} Contactez-nous : nous vous préviendrons dès qu’elle le sera.`,
  },
  slots: {
    title: 'Quand êtes-vous disponible ?',
    legend: 'Créneaux souhaités',
    hint: (minDate: string) =>
      `Jusqu’à trois créneaux pour la visite des lieux et l’intervention, à partir du ${minDate}. Heures du Bénin.`,
    date: (index: number) => `Date du créneau ${index}`,
    period: (index: number) => `Moment du créneau ${index}`,
    add: 'Ajouter un créneau',
    remove: (index: number) => `Retirer le créneau ${index}`,
    required: 'Choisissez au moins une date.',
    tooEarly: (minDate: string) => `Choisissez une date à partir du ${minDate}.`,
    comment: 'Commentaire (facultatif)',
    commentHint: 'Accès, animaux, contraintes particulières…',
    commentCount: (count: number, max: number) => `${count} / ${max} caractères`,
    commentTooLong: (max: number) => `Le commentaire ne doit pas dépasser ${max} caractères.`,
  },
  review: {
    title: 'Vérifiez et envoyez votre demande',
    hint: 'Relisez vos réponses : vous pouvez encore les modifier.',
    place: 'Lieu',
    services: 'Prestations',
    address: 'Adresse',
    position: 'Position',
    positionSet: 'Enregistrée',
    slots: 'Disponibilités',
    comment: 'Commentaire',
    none: 'Aucun',
    frequency: 'Fréquence',
    accountTitle: 'Votre compte KSP',
    checking: 'Vérification de votre session…',
    loginLead:
      'Dernière étape : connectez-vous, ou créez votre compte avec votre numéro, pour envoyer la demande. Vos réponses sont conservées.',
    signedInAs: (name: string) => `Connecté : ${name}`,
    individual:
      'Vous faites cette demande en tant que particulier : vous choisirez votre façon de payer en acceptant le devis.',
    business: (name: string | null) =>
      `Vous faites cette demande pour ${name ?? 'votre entreprise'} : la prestation sera réglée par une facture mensuelle, dans « Mes factures ».`,
    businessLater:
      'Pour une demande au nom de votre entreprise, choisissez son compte avec « Changer de compte ».',
    profileNeeded: 'Complétez votre profil pour envoyer votre demande.',
    deletionPending:
      'Votre compte est en cours de suppression : annulez la suppression pour envoyer une demande.',
    deletionLink: 'Gérer la suppression de mon compte',
    visitNotice:
      'Une visite des lieux est obligatoire avant tout devis : notre équipe vous contacte pour convenir d’un rendez-vous.',
    submit: 'Envoyer ma demande',
    sending: 'Envoi…',
    fixStep: (step: string) => `Corriger : ${step}`,
    loginFirst: 'Connectez-vous pour envoyer la demande.',
    tooManyOpen: 'Mes prestations de nettoyage',
  },
  done: {
    title: 'Demande envoyée',
    text: 'Votre demande est bien reçue : une demande de devis par prestation, suivies ensemble. Vous serez prévenu à chaque étape.',
    number: 'Numéro de la demande',
    received: 'Reçue le',
    commune: 'Lieu',
    servicesTitle: 'Vos prestations',
    nextTitle: 'Et maintenant ?',
    next: [
      {
        title: 'Visite des lieux',
        text: 'Notre équipe vous contacte pour convenir d’un rendez-vous : un agent KSP passe sur place.',
      },
      {
        title: 'Devis',
        text: 'Vous recevez le devis dans votre espace, établi d’après la visite.',
      },
      {
        title: 'Acceptation',
        text: 'Vous acceptez le devis en ligne et choisissez votre créneau.',
      },
      {
        title: 'Planification',
        text: 'KSP planifie les passages ; vous suivez chacun d’eux depuis votre espace.',
      },
    ],
    follow: 'Suivre ma demande',
    space: 'Mes prestations de nettoyage',
    another: 'Faire une autre demande',
    loading: 'Chargement de votre demande…',
  },
  group: {
    title: 'Demande de devis groupée',
    lead: 'Une demande de devis par prestation, pour le même lieu : chacune suit son propre circuit.',
    placeAndCommune: (place: string, commune: string) => `${place} à ${commune}`,
    sentOn: (date: string) => `Envoyée le ${date}`,
    quotesTotal: 'Total des devis reçus',
    remainingDue: 'Reste à régler',
    seeRequest: 'Voir la demande',
    reference: 'Numéro',
  },
} as const;

/** Moments proposés pour un créneau (heures du Bénin). */
export const slotPeriods = [
  { value: 'morning', label: 'Matin (8 h – 12 h)', from: '08:00', to: '12:00' },
  { value: 'afternoon', label: 'Après-midi (13 h – 17 h)', from: '13:00', to: '17:00' },
] as const;

export type SlotPeriod = (typeof slotPeriods)[number]['value'];
