import type { SimulationInput } from './api';
import { OTHER_COMMUNE, coveredCommune } from './zones';

/**
 * Simulation reprise dans la demande de devis. Elle voyage dans l'adresse de la page de demande
 * (`/nettoyage/devis?prestation=…`) : elle survit au passage par la connexion (`?retour=`), se partage,
 * et ne demande aucun stockage dans le navigateur. Aucune donnée personnelle n'y figure.
 */

export const REQUEST_PATH = '/nettoyage/devis';

export type Frequency = NonNullable<SimulationInput['frequency']>;
export type SimulationDraft = SimulationInput;

const CODE = /^[a-z][a-z0-9_]{1,49}$/;
const PREMISES = new Set(['apartment', 'house', 'office', 'shop', 'warehouse', 'other']);
const FREQUENCIES = new Set<string>(['once', 'weekly', 'monthly']);
const MAX_QUANTITY = 1_000_000;

const PARAMS = {
  service: 'prestation',
  premises: 'locaux',
  quantity: 'quantite',
  options: 'options',
  commune: 'commune',
  frequency: 'frequence',
} as const;

/** Adresse de la demande de devis qui reprend la simulation. */
export function requestHref(draft: SimulationDraft): string {
  const params = new URLSearchParams({
    [PARAMS.service]: draft.serviceCode,
    [PARAMS.premises]: draft.premisesType,
    [PARAMS.quantity]: String(draft.quantity),
  });
  if (draft.options.length) params.set(PARAMS.options, draft.options.join(','));
  params.set(PARAMS.commune, draft.commune);
  if (draft.frequency) params.set(PARAMS.frequency, draft.frequency);
  return `${REQUEST_PATH}?${params.toString()}`;
}

/** Relit la simulation de l'adresse ; `null` si elle est absente ou altérée. */
export function draftFromParams(params: URLSearchParams): SimulationDraft | null {
  const serviceCode = params.get(PARAMS.service) ?? '';
  const premisesType = params.get(PARAMS.premises) ?? '';
  const quantityRaw = params.get(PARAMS.quantity) ?? '';
  const quantity = /^\d{1,7}$/.test(quantityRaw) ? Number(quantityRaw) : NaN;
  const options = (params.get(PARAMS.options) ?? '').split(',').filter(Boolean);
  const communeRaw = params.get(PARAMS.commune) ?? '';
  const frequency = params.get(PARAMS.frequency) ?? '';

  if (!CODE.test(serviceCode) || !PREMISES.has(premisesType)) return null;
  if (!(quantity >= 1 && quantity <= MAX_QUANTITY)) return null;
  if (options.length > 20 || !options.every((option) => CODE.test(option))) return null;
  const commune = coveredCommune(communeRaw) ?? (communeRaw ? OTHER_COMMUNE : '');
  if (!commune) return null;

  return {
    serviceCode,
    premisesType,
    quantity,
    options,
    commune,
    ...(FREQUENCIES.has(frequency) ? { frequency: frequency as Frequency } : {}),
  };
}
