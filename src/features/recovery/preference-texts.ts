/** Textes des préférences du créancier et des champs du barème d'échéancier. Sans zod. */
export const preferenceTexts = {
  title: 'Préférences',
  lead: 'L’échéancier que vous acceptez par défaut. Il est recopié sur chaque nouveau dossier, que vous pouvez encore ajuster.',
  newCasesOnly:
    'Ces préférences valent pour vos nouveaux dossiers seulement : les dossiers en cours gardent le leur.',
  loading: 'Chargement de vos préférences…',
  retry: 'Réessayer',
  readOnly:
    'Votre rôle dans cette entreprise permet de consulter ces préférences : seuls les administrateurs et les membres peuvent les modifier.',
  b2b: 'Débiteurs entreprises',
  b2c: 'Débiteurs particuliers',
  save: 'Enregistrer mes préférences',
  saving: 'Enregistrement…',
  saved: 'Préférences enregistrées. Elles s’appliqueront à vos prochains dossiers.',
  // Champs du barème (assistant et préférences).
  acceptsPaymentPlan: 'J’accepte qu’un débiteur paie en plusieurs fois',
  maxDurationMonths: 'Durée maximale (mois)',
  minFirstPaymentPercent: 'Premier versement minimal (% du montant dû)',
  firstPaymentWithinDays: 'Premier versement sous (jours)',
  minInstallment: 'Échéance minimale (FCFA)',
  maxDiscountPercent: 'Remise maximale pour un paiement immédiat (%)',
  maxDiscountHint: '0 : aucune remise.',
} as const;
