import type { AnswerSummary, FormField, ServiceForm } from './schemas';

/*
 * Réponses d'une demande mises en phrases. D'abord le résumé lisible du service (`answerSummary`,
 * ADR-037), qui fait foi : libellés de la version de grille de la demande, ancien format compris. À
 * défaut (null, ou gateway antérieure), les réponses (ADR-033) mises en phrases pour l'espace client : « Superficie : 180 m² »,
 * « Vitres (Nombre de fenêtres : 6) ». Les libellés viennent du formulaire publié par la gateway ; une
 * réponse à un champ qui n'y figure plus est ignorée (rien n'est inventé).
 */

type Answer = number | string | boolean;

const YES = 'Oui';
const NO = 'Non';

function answerText(field: FormField, value: Answer | undefined): string | null {
  if (value === undefined || value === '') return null;
  if (field.type === 'boolean') return value === true ? YES : value === false ? NO : null;
  if (field.type === 'number' && typeof value === 'number') {
    return field.unitLabel ? `${value} ${field.unitLabel}` : String(value);
  }
  if (field.type === 'choice') return field.choices.find((choice) => choice.code === value)?.label ?? null;
  return null;
}

function lines(fields: ReadonlyArray<FormField>, answers: Record<string, Answer>): string[] {
  return fields.flatMap((field) => {
    const text = answerText(field, answers[field.code]);
    return text ? [`${field.label} : ${text}`] : [];
  });
}

/** Réponses, options choisies et fréquence d'une demande, ligne par ligne. */
export function describeAnswers(
  form: ServiceForm | null | undefined,
  request: {
    answers?: Record<string, Answer> | null;
    selectedOptions?: ReadonlyArray<{ code: string; answers?: Record<string, Answer> }>;
    frequency?: string | null;
  },
): { answers: string[]; options: string[]; frequency: string | null } {
  if (!form) return { answers: [], options: [], frequency: null };
  const options = (request.selectedOptions ?? []).flatMap((selection) => {
    const option = form.options.find((item) => item.code === selection.code);
    if (!option) return [];
    const details = lines(option.fields, selection.answers ?? {});
    return [details.length ? `${option.label} (${details.join(', ')})` : option.label];
  });
  return {
    answers: lines(form.fields, request.answers ?? {}),
    options,
    frequency: form.frequencies.find((item) => item.code === request.frequency)?.label ?? null,
  };
}

/** Réponses d'une demande, ligne par ligne, prêtes à afficher. */
export interface NeedLines {
  answers: string[];
  options: string[];
  frequency: string | null;
}

type SummaryField = AnswerSummary['fields'][number];

const fieldLine = (field: SummaryField) => `${field.label} : ${field.display}`;

/** Résumé lisible du service (ADR-037) : rien n'est retraduit, les valeurs sont affichées telles quelles. */
export function summaryLines(summary: AnswerSummary): NeedLines {
  return {
    answers: summary.fields.map(fieldLine),
    options: summary.options.map((option) =>
      option.fields.length ? `${option.label} (${option.fields.map(fieldLine).join(', ')})` : option.label,
    ),
    frequency: summary.frequency?.label ?? null,
  };
}

/**
 * Réponses d'une demande à afficher : le résumé du service s'il existe, sinon les réponses relues avec
 * le formulaire publié. `empty` : rien de lisible (demande ancienne non décrite) ; l'écran le dit.
 */
export function needLines(
  form: ServiceForm | null | undefined,
  request: Parameters<typeof describeAnswers>[1] & { answerSummary?: AnswerSummary | null },
): NeedLines & { empty: boolean } {
  const lines = request.answerSummary ? summaryLines(request.answerSummary) : describeAnswers(form, request);
  return { ...lines, empty: !lines.answers.length && !lines.options.length && !lines.frequency };
}
