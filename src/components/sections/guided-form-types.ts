import type { PageAction } from './types';

/*
 * Formulaire guidé par étapes (simulateur de nettoyage, demande de devis immobilier).
 * Le front ne fait que recueillir les réponses : aucun prix n'est calculé ici. L'écran final est soit
 * fourni par la fonctionnalité (estimation de la gateway), soit une invitation à demander un devis.
 */

export type ChoiceOption = { value: string; label: string; hint?: string };

/** Une réponse à choisir dans une liste (boutons radio). */
export type ChoiceStep = {
  kind: 'choice';
  id: string;
  /** Nom court de l'étape (liste des étapes, récapitulatif). */
  name: string;
  title: string;
  hint?: string;
  options: ReadonlyArray<ChoiceOption>;
};

/** Plusieurs réponses possibles, aucune obligatoire (cases à cocher). */
export type MultiChoiceStep = {
  kind: 'multi';
  id: string;
  /** Nom court de l'étape (liste des étapes, récapitulatif). */
  name: string;
  title: string;
  hint?: string;
  options: ReadonlyArray<ChoiceOption>;
  /** Réponse affichée quand rien n'est coché (« Aucune option »). */
  noneLabel: string;
};

export type QuantityMode = {
  value: string;
  /** Libellé du choix (« Surface »). */
  label: string;
  /** Libellé du champ de saisie (« Surface approximative »). */
  inputLabel: string;
  /** `xof` : montant en francs CFA (entier), affiché au format monétaire. */
  format: 'number' | 'xof';
  /** Unité affichée après le nombre (« m² », « pièces »). Inutile pour `xof`. */
  unit?: string;
  max: number;
};

/** Une quantité à saisir (surface, nombre de pièces, budget), avec la possibilité de ne pas savoir. */
export type QuantityStep = {
  kind: 'quantity';
  id: string;
  /** Nom court de l'étape (liste des étapes, récapitulatif). */
  name: string;
  title: string;
  hint?: string;
  modes: ReadonlyArray<QuantityMode>;
  /** Choix « Je ne sais pas encore » ; absent, la quantité est obligatoire. */
  unknownLabel?: string;
};

export type GuidedFormStep = ChoiceStep | MultiChoiceStep | QuantityStep;

export type GuidedFormContent = {
  /** Préfixe des identifiants (plusieurs formulaires peuvent coexister). */
  id: string;
  /** Nom accessible du formulaire. */
  label: string;
  steps: ReadonlyArray<GuidedFormStep>;
  /** Nom court de la dernière étape (« Récapitulatif »). */
  summaryName: string;
  summaryTitle: string;
  summaryHint: string;
  /** Écran final par défaut ; sans titre, la fonctionnalité fournit le sien (`renderResult`). */
  result: {
    title?: string;
    text?: string;
    actions?: ReadonlyArray<PageAction>;
    /** Première ligne du message WhatsApp prérempli, suivie du récapitulatif des réponses. */
    whatsappIntro: string;
  };
};
