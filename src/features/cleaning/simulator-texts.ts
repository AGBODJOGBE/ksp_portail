import type { MonthRank, Weekday } from './api';
import { MONTH_RANK_LABELS, WEEKDAY_LABELS } from './schedule';

/*
 * Textes du simulateur, des paramètres du lieu et du rythme, communs à `/nettoyage` et à l'assistant de
 * demande. Textes provisoires (à valider). Aucun prix, délai ni borne n'est écrit ici : ils viennent de
 * la gateway.
 */

export const simulatorTexts = {
  loading: 'Chargement des lieux proposés…',
  catalogError: 'Impossible de charger les lieux proposés.',
  retry: 'Réessayer',
  placeLegend: 'Quel lieu faut-il nettoyer ?',
  placeHint: 'Choisissez le lieu le plus proche du vôtre.',
  otherTitle: 'Votre lieu n’est pas dans la liste',
  otherText:
    'Pour ce lieu, le prix est fixé après la visite : décrivez votre besoin dans la demande de devis, sans estimation en ligne.',
  detailLoading: 'Chargement des types de nettoyage…',
  detailError: 'Impossible de charger les types de nettoyage de ce lieu.',
  typesLegend: 'Quels types de nettoyage ?',
  typesHint: 'Plusieurs choix possibles. Un pack regroupe plusieurs types.',
  pack: 'Pack',
  noOffer: 'Aucun type de nettoyage n’est proposé en ligne pour ce lieu pour le moment.',
  paramsTitle: 'Votre lieu en détail',
  paramsHint: 'Les champs marqués d’un astérisque sont obligatoires.',
  required: 'obligatoire',
  yes: 'Oui',
  no: 'Non',
  choose: 'Choisir…',
  communeLabel: 'Commune (facultatif)',
  communeHint: 'Pour une estimation plus juste. La commune exacte sera celle de votre lieu sur la carte.',
  communeUnknown: 'Je ne sais pas encore',
  zonesError: 'La liste des communes n’a pas pu être chargée : l’estimation se fait sans commune.',
  scheduleToggle: 'Indiquer un rythme (facultatif)',
  scheduleToggleHint: 'Pour connaître le nombre de séances, le total et la remise éventuelle de fréquence.',
  resultTitle: 'Votre estimation',
  resultWaiting: 'Choisissez le lieu, au moins un type de nettoyage et répondez aux questions obligatoires.',
  resultLoading: 'Calcul en cours…',
  resultError: 'L’estimation n’a pas pu être calculée.',
  rateLimited: (seconds: number | null) =>
    seconds
      ? `Trop d’estimations demandées. Nouvel essai possible dans ${seconds} s.`
      : 'Trop d’estimations demandées. Patientez quelques instants.',
  sessionPrice: 'Prix estimé d’une séance',
  range: (low: string, high: string) => `Entre ${low} et ${high}`,
  from: 'À partir de',
  fromNote:
    'Une partie de votre demande sera chiffrée après la visite : ce montant n’est pas le prix d’une séance.',
  onQuote: 'Sur devis',
  onQuoteText: 'Le prix sera fixé après la visite des lieux.',
  sessionsCount: (count: number) => `${count} séance${count > 1 ? 's' : ''}`,
  programTotal: 'Total du programme',
  programRange: (low: string, high: string) => `Entre ${low} et ${high} pour le programme`,
  frequencyDiscount: 'Remise de fréquence, par séance',
  visitFee: 'Frais de visite à prévoir',
  visitFeeNote: 'Hors majoration éventuelle de la commune de votre lieu.',
  team: (size: number) => `${size} agent${size > 1 ? 's' : ''}`,
  duration: 'Durée d’une séance',
  teamLabel: 'Équipe proposée',
  details: 'Voir le détail du calcul',
  offerOnQuote: (reason: string | null) => `Sur devis${reason ? ` (${reason})` : ''}`,
  minimumApplied: 'Minimum de l’offre appliqué',
  datesTitle: 'Dates prévues',
  request: 'Demander un devis',
  requestHint: 'Votre saisie est gardée : vous la retrouverez dans la demande.',
  requestOther: 'Demander un devis pour ce lieu',
} as const;

/** Mentions de la simulation (`notices`). */
export const SIMULATION_NOTICES: Record<string, string> = {
  no_commune:
    'Commune non indiquée : l’estimation ne tient pas compte de la commune. Le prix sera recalculé avec la commune de votre lieu.',
  commune_not_covered:
    'Cette commune n’est pas encore desservie : l’estimation est donnée à titre d’information.',
  partially_priced:
    'Une partie de votre demande sera chiffrée après la visite : le montant affiché est un minimum.',
  on_quote: 'Le prix de votre demande sera fixé après la visite des lieux.',
};

/** Raison d'une offre « sur devis » (`onQuoteReason`). */
export const ON_QUOTE_REASONS: Record<string, string> = {
  no_published_tariff: 'tarif pas encore publié',
  above_last_bracket: 'au-delà des tranches prévues',
  below_first_bracket: 'en dessous des tranches prévues',
  base_value_missing: 'valeur de base manquante',
};

export const scheduleTexts = {
  legend: 'À quel rythme ?',
  kinds: {
    one_off: 'Une ou quelques séances',
    weekly: 'Chaque semaine',
    monthly: 'Chaque mois',
  },
  kindHints: {
    one_off: 'Vous choisissez les jours.',
    weekly: 'Un ou plusieurs jours par semaine.',
    monthly: 'Des jours du mois, ou un jour de la semaine (premier samedi…).',
  },
  startTime: 'Heure de début des séances',
  startTimeHint: 'Heure du Bénin.',
  dates: 'Jours de passage',
  addDate: 'Ajouter ce jour',
  dateToAdd: 'Jour à ajouter',
  removeDate: (label: string) => `Retirer le ${label}`,
  noDate: 'Aucun jour choisi pour le moment.',
  weekdays: 'Jours de la semaine',
  everyWeeks: 'Fréquence',
  everyWeeksOption: (value: number) => (value === 1 ? 'Chaque semaine' : `Toutes les ${value} semaines`),
  monthlyForm: 'Quels jours du mois ?',
  monthlyDays: 'Des jours du mois (le 5, le 20…)',
  monthlyWeekdays: 'Un jour de la semaine (le premier samedi…)',
  monthDays: 'Jours du mois',
  monthDaysHint: 'Un jour absent du mois (le 31 en avril) est reporté au dernier jour du mois.',
  rank: 'Rang',
  weekday: 'Jour',
  addMonthWeekday: 'Ajouter',
  removeMonthWeekday: (label: string) => `Retirer « ${label} »`,
  monthWeekdayLabel: (rank: MonthRank, weekday: Weekday) =>
    `${MONTH_RANK_LABELS[rank]} ${WEEKDAY_LABELS[weekday]} du mois`,
  startDate: 'Date de début',
  end: 'Jusqu’à quand ?',
  endModes: { months: 'Pendant… mois', weeks: 'Pendant… semaines', date: 'Jusqu’à une date' },
  durationMonths: 'Nombre de mois',
  durationWeeks: 'Nombre de semaines',
  endDate: 'Date de fin',
  excludeHolidays: 'Ne pas prévoir de séance les jours fériés',
  previewTitle: 'Aperçu des dates',
  previewLoading: 'Calcul des dates…',
  previewError: 'L’aperçu des dates n’a pas pu être calculé.',
  previewCount: (count: number) => `${count} séance${count > 1 ? 's' : ''} prévue${count > 1 ? 's' : ''}`,
  previewRange: (first: string, last: string) => `du ${first} au ${last}`,
  previewMore: (count: number) => `et ${count} autre${count > 1 ? 's' : ''}`,
  excludeDate: (label: string) => `Retirer le ${label} du programme`,
  excludedTitle: 'Jours retirés',
  restoreDate: (label: string) => `Remettre le ${label}`,
  leadNote: 'La première séance doit laisser à KSP le temps de s’organiser : la date est vérifiée à l’envoi.',
} as const;

/** Ajustements faits par la gateway au calcul des dates (`notices[].code`). */
export const SCHEDULE_NOTICES: Record<string, (label: string | null) => string> = {
  month_day_adjusted: () => 'jour absent du mois : séance le dernier jour du mois',
  holiday_excluded: (label) => `jour férié exclu${label ? ` (${label})` : ''}`,
  date_excluded: () => 'jour retiré',
  date_added: () => 'jour ajouté',
  excluded_not_planned: () => 'jour retiré, qui n’était pas prévu',
  added_already_planned: () => 'jour ajouté, déjà prévu',
};
