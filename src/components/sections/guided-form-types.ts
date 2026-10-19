import type { PageAction } from './types';

/*
 * Formulaire guidé par étapes (simulateur de nettoyage, demande de devis immobilier).
 * Le front ne fait que recueillir les réponses : aucun prix n'est calculé ici. Le prix viendra de la
 * gateway quand ses contrats seront définis ; d'ici là, l'écran final invite à demander un devis.
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
  unknownLabel: string;
};

export type GuidedFormStep = ChoiceStep | QuantityStep;

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
  result: {
    title: string;
    text: string;
    actions: ReadonlyArray<PageAction>;
    /** Première ligne du message WhatsApp prérempli, suivie du récapitulatif des réponses. */
    whatsappIntro: string;
  };
};
