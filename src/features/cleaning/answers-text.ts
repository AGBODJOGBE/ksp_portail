import type { FormField, ServiceForm } from './schemas';

/*
 * Réponses d'une demande (ADR-033) mises en phrases pour l'espace client : « Superficie : 180 m² »,
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
