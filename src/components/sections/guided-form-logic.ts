import type {
  GuidedFormStep,
  MultiChoiceStep,
  QuantityMode,
  QuantityStep,
} from '@/components/sections/guided-form-types';
import { getDictionary } from '@/i18n';

/*
 * Logique du formulaire guidé : uniquement la saisie (validation de forme, libellés, message).
 * Aucune règle de calcul de prix : elle appartient à la gateway.
 */

export const UNKNOWN = 'unknown';

export type Answer =
  | { kind: 'choice'; value: string }
  /** `mode` : mode de mesure choisi, ou `UNKNOWN` ; `amount` : saisie brute. */
  | { kind: 'quantity'; mode: string; amount: string }
  /** Cases cochées (aucune possible). */
  | { kind: 'multi'; values: ReadonlyArray<string> };

export type Answers = Readonly<Record<string, Answer | undefined>>;

const numberFormat = new Intl.NumberFormat('fr-BJ');
const xofFormat = new Intl.NumberFormat('fr-BJ', { style: 'currency', currency: 'XOF' });

/** Lit un entier saisi librement (« 1 500 », « 1500 ») ; `null` si la saisie n'est pas un entier. */
export function parseAmount(raw: string): number | null {
  // \s couvre aussi les espaces insécables (séparateurs de milliers en français).
  const compact = raw.replace(/\s/g, '');
  if (!/^\d+$/.test(compact)) return null;
  const value = Number(compact);
  return Number.isSafeInteger(value) ? value : null;
}

export function formatAmount(value: number, mode: QuantityMode): string {
  if (mode.format === 'xof') return xofFormat.format(value);
  return mode.unit ? `${numberFormat.format(value)} ${mode.unit}` : numberFormat.format(value);
}

/** Message d'erreur de l'étape, ou `null` si la réponse permet de continuer. */
export function validateStep(step: GuidedFormStep, answer: Answer | undefined): string | null {
  const t = getDictionary().guidedForm;
  if (step.kind === 'multi') return null;
  if (!answer) return t.required;
  if (step.kind === 'choice') {
    return answer.kind === 'choice' && step.options.some((option) => option.value === answer.value)
      ? null
      : t.required;
  }
  if (answer.kind !== 'quantity') return t.required;
  if (answer.mode === UNKNOWN) return step.unknownLabel ? null : t.required;
  const mode = quantityMode(step, answer);
  if (!mode) return t.required;
  const value = parseAmount(answer.amount);
  return value !== null && value >= 1 && value <= mode.max
    ? null
    : t.invalidNumber(numberFormat.format(mode.max));
}

/** Mode de mesure retenu : celui choisi, ou le seul proposé quand il n'y a pas de choix à faire. */
export function quantityMode(step: QuantityStep, answer: Answer | undefined): QuantityMode | undefined {
  const chosen = answer?.kind === 'quantity' ? answer.mode : '';
  if (!chosen && step.modes.length === 1 && !step.unknownLabel) return step.modes[0];
  return step.modes.find((item) => item.value === chosen);
}

/** Cases cochées qui existent encore dans l'étape (la liste peut changer avec une réponse précédente). */
export function selectedValues(step: MultiChoiceStep, answer: Answer | undefined): string[] {
  if (answer?.kind !== 'multi') return [];
  return step.options.filter((option) => answer.values.includes(option.value)).map((option) => option.value);
}

/** Réponse lisible, pour le récapitulatif et le message WhatsApp. */
export function answerLabel(step: GuidedFormStep, answer: Answer | undefined): string {
  const t = getDictionary().guidedForm;
  if (step.kind === 'multi') {
    const values = selectedValues(step, answer);
    if (!values.length) return step.noneLabel;
    return step.options
      .filter((option) => values.includes(option.value))
      .map((option) => option.label)
      .join(', ');
  }
  if (!answer) return t.notAnswered;
  if (step.kind === 'choice') {
    return (
      (answer.kind === 'choice' && step.options.find((option) => option.value === answer.value)?.label) ||
      t.notAnswered
    );
  }
  if (answer.kind !== 'quantity') return t.notAnswered;
  if (answer.mode === UNKNOWN) return step.unknownLabel ?? t.notAnswered;
  const mode = quantityMode(step, answer);
  const value = parseAmount(answer.amount);
  if (!mode || value === null) return t.notAnswered;
  return `${mode.label} : ${formatAmount(value, mode)}`;
}

/** Message WhatsApp prérempli : une phrase d'introduction puis une ligne par réponse. */
export function summaryMessage(
  intro: string,
  steps: ReadonlyArray<GuidedFormStep>,
  answers: Answers,
): string {
  const lines = steps.map((step) => `- ${step.name} : ${answerLabel(step, answers[step.id])}`);
  return [intro, ...lines].join('\n');
}
