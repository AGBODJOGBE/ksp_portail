/*
 * Textes de l'étape « Vos passages » du parcours de demande (plan de passages, ADR-052). À part de
 * `journey-texts.ts` : seule cette étape, chargée à la demande, les télécharge. Textes provisoires (à valider).
 */

export const scheduleTexts = {
  modeLegend: 'Vos passages ont lieu',
  modes: {
    dates: { label: 'À des dates précises', hint: 'Une fois, ou quelques jours choisis.' },
    weekly: { label: 'Chaque semaine', hint: 'Les mêmes jours, toutes les semaines ou moins souvent.' },
    monthly: { label: 'Chaque mois', hint: 'Les mêmes jours, une ou plusieurs fois par mois.' },
  },
  datesLegend: 'Vos jours de passage',
  datesHint: (minDate: string) => `Touchez les jours voulus, à partir du ${minDate}.`,
  datesCalendar: 'Calendrier : jours de passage',
  datesChosen: (count: number) =>
    count > 1 ? `${count} jours choisis` : count === 1 ? '1 jour choisi' : 'Aucun jour choisi',
  dayChosen: 'choisi',
  monthChosen: (count: number) =>
    count > 1
      ? `${count} jours choisis ce mois-ci`
      : count === 1
        ? '1 jour choisi ce mois-ci'
        : 'Aucun jour choisi ce mois-ci',
  previousMonth: 'Mois précédent',
  nextMonth: 'Mois suivant',
  dayUnavailable: 'indisponible',
  clearDates: 'Effacer les jours choisis',
  weekdaysLegend: 'Quels jours de la semaine ?',
  everyWeeks: 'À quel rythme ?',
  everyWeeksOption: (weeks: number) =>
    weeks === 1 ? 'Chaque semaine' : weeks === 2 ? 'Une semaine sur deux' : `Une semaine sur ${weeks}`,
  monthlyFormLegend: 'Quels jours du mois ?',
  monthlyForms: {
    monthDays: 'Des jours du mois',
    weekdays: 'Un jour de la semaine dans le mois',
  },
  monthDaysLegend: 'Jours du mois',
  monthDaysHint: 'Un jour absent d’un mois (le 31 en avril…) devient le dernier jour de ce mois.',
  monthDayLabel: (day: number) => (day === 1 ? 'le 1er' : `le ${day}`),
  ranksLegend: 'Quelle semaine du mois ?',
  rank: (rank: number | 'last') => (rank === 'last' ? 'La dernière' : rank === 1 ? 'La 1re' : `La ${rank}e`),
  rankWeekdaysLegend: 'Quel jour de cette semaine ?',
  periodLegend: 'Sur quelle période ?',
  startDate: 'À partir du',
  periodLength: 'Pendant',
  periods: { '3': '3 mois', '6': '6 mois', '12': '1 an', until: 'Jusqu’au…' },
  endDate: 'Jusqu’au (inclus)',
  periodEnds: (date: string) => `Jusqu’au ${date} inclus.`,
  startTime: 'Heure d’arrivée',
  startTimeHint: 'Heure du Bénin, la même pour chaque passage.',
  adjust: 'Ajuster : retirer ou ajouter des jours',
  adjustHint:
    'Pour un jour férié ou une absence, retirez-le ; pour un passage en plus, ajoutez-le. Le calendrier se met à jour.',
  excludedLegend: 'Jours retirés',
  excludedInput: 'Jour à retirer',
  exclude: 'Retirer ce jour',
  extraLegend: 'Jours ajoutés',
  extraInput: 'Jour à ajouter',
  include: 'Ajouter ce jour',
  removeDay: (day: string) => `Annuler pour le ${day}`,
  noDay: 'Aucun',
  comment: 'Commentaire (facultatif)',
  commentHint: 'Accès, animaux, contraintes particulières…',
  commentCount: (count: number, max: number) => `${count} / ${max} caractères`,
  preview: {
    title: 'Vos passages',
    idle: 'Complétez votre choix : vos dates exactes s’affichent ici.',
    loading: 'Calcul de vos dates…',
    count: (count: number) => (count > 1 ? `${count} passages` : '1 passage'),
    range: (first: string, last: string, time: string) =>
      first === last ? `Le ${first}, à ${time}` : `Du ${first} au ${last}, à ${time}`,
    announce: (count: number) => (count > 1 ? `${count} passages prévus.` : '1 passage prévu.'),
    warningsTitle: (count: number) =>
      count > 1 ? `${count} remarques sur vos dates` : '1 remarque sur vos dates',
    busy: (seconds: number) =>
      `Beaucoup de demandes en ce moment : nous recalculons vos dates dans ${seconds} s. Vos choix sont gardés.`,
    failed: 'Le calcul de vos dates est indisponible pour le moment.',
    fix: 'Corrigez le plan pour voir vos dates.',
    retry: 'Réessayer',
    moreWarnings: (count: number) => (count > 1 ? `Voir les ${count} autres` : 'Voir l’autre remarque'),
    leadTime: (hours: number) =>
      `Le premier passage doit avoir lieu au moins ${hours} heures après votre demande.`,
    lead: 'Dates calculées par KSP. Le devis peut les ajuster après la visite des lieux.',
    calendar: 'Calendrier des passages',
    planDay: 'passage prévu',
    planLegend: 'Passage prévu',
    monthCount: (count: number) =>
      count > 1
        ? `${count} passages ce mois-ci`
        : count === 1
          ? '1 passage ce mois-ci'
          : 'Aucun passage ce mois-ci',
  },
} as const;
