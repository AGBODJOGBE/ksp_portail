import type { Answers } from '@/components/sections/guided-form-logic';
import { parseAmount } from '@/components/sections/guided-form-logic';
import type { GuidedFormStep, QuantityStep } from '@/components/sections/guided-form-types';

import type { Frequency, SimulationDraft } from './draft';
import type { ServedZone, ServiceOffer } from './schemas';
import { frequencies, premisesTypes, simulatorQuestions as q, units } from './texts';
import { OTHER_COMMUNE, zonesSentence } from './zones';

/*
 * Questions du simulateur construites à partir du catalogue et des zones de la gateway : prestations
 * réelles, unité de mesure et options de la prestation choisie, communes desservies. Aucun prix n'est
 * calculé ici.
 */

export const STEP = {
  service: 'prestation',
  premises: 'locaux',
  size: 'taille',
  options: 'options',
  commune: 'commune',
  frequency: 'frequence',
} as const;

/** `SimulateCleaningRequest.quantity` : entier de 1 à 1 000 000 (contrat). */
const MAX_QUANTITY = 1_000_000;

const choice = (answers: Answers, id: string): string | undefined => {
  const answer = answers[id];
  return answer?.kind === 'choice' ? answer.value : undefined;
};

/** Prestation choisie dans le catalogue. */
export function chosenService(
  services: ReadonlyArray<ServiceOffer>,
  answers: Answers,
): ServiceOffer | undefined {
  const code = choice(answers, STEP.service);
  return services.find((service) => service.code === code);
}

function sizeStep(service: ServiceOffer | undefined): QuantityStep {
  const unit = units[service?.unit ?? ''] ?? units.square_meter!;
  return {
    kind: 'quantity',
    id: STEP.size,
    name: q.size.name,
    title: q.size.title,
    hint: q.size.hint,
    modes: [
      {
        value: service?.unit ?? 'square_meter',
        label: unit.label,
        inputLabel: unit.inputLabel,
        format: 'number',
        unit: unit.unit,
        max: MAX_QUANTITY,
      },
    ],
  };
}

export function simulatorSteps(
  services: ReadonlyArray<ServiceOffer>,
  zones: ReadonlyArray<ServedZone>,
  answers: Answers,
): GuidedFormStep[] {
  const service = chosenService(services, answers);
  const steps: GuidedFormStep[] = [
    {
      kind: 'choice',
      id: STEP.service,
      name: q.service.name,
      title: q.service.title,
      options: services.map((item) => ({ value: item.code, label: item.name, hint: item.description })),
    },
    {
      kind: 'choice',
      id: STEP.premises,
      name: q.premises.name,
      title: q.premises.title,
      hint: q.premises.hint,
      options: Object.entries(premisesTypes).map(([value, label]) => ({ value, label })),
    },
    sizeStep(service),
  ];
  if (service?.options.length) {
    steps.push({
      kind: 'multi',
      id: STEP.options,
      name: q.options.name,
      title: q.options.title,
      hint: q.options.hint,
      noneLabel: q.options.none,
      options: service.options.map((option) => ({ value: option.code, label: option.label })),
    });
  }
  steps.push(
    {
      kind: 'choice',
      id: STEP.commune,
      name: q.commune.name,
      title: q.commune.title,
      hint: q.commune.hint(zonesSentence(zones)),
      options: [
        ...zones.map((zone) => ({ value: zone.commune, label: zone.commune })),
        { value: OTHER_COMMUNE, label: q.commune.other },
      ],
    },
    {
      kind: 'choice',
      id: STEP.frequency,
      name: q.frequency.name,
      title: q.frequency.title,
      hint: q.frequency.hint,
      options: Object.entries(frequencies).map(([value, label]) => ({ value, label })),
    },
  );
  return steps;
}

/** Réponses complètes traduites en demande de simulation ; `null` s'il manque une réponse. */
export function draftFromAnswers(
  services: ReadonlyArray<ServiceOffer>,
  answers: Answers,
): SimulationDraft | null {
  const service = chosenService(services, answers);
  const premisesType = choice(answers, STEP.premises);
  const size = answers[STEP.size];
  const quantity = size?.kind === 'quantity' ? parseAmount(size.amount) : null;
  const commune = choice(answers, STEP.commune);
  const frequency = choice(answers, STEP.frequency);
  if (!service || !premisesType || !quantity || !commune) return null;
  const selected = answers[STEP.options];
  const options =
    selected?.kind === 'multi'
      ? service.options.map((option) => option.code).filter((code) => selected.values.includes(code))
      : [];
  return {
    serviceCode: service.code,
    premisesType,
    quantity,
    options,
    commune,
    ...(frequency && frequency in frequencies ? { frequency: frequency as Frequency } : {}),
  };
}
