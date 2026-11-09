import { publicEnv } from './env';

/**
 * Coordonnées de KSP affichées par la page Contact, lues dans la configuration (`NEXT_PUBLIC_CONTACT_*`,
 * `NEXT_PUBLIC_WHATSAPP_NUMBER`). Tant qu'une valeur n'est pas fournie, une valeur d'exemple évidente la
 * remplace et la page la signale « à remplacer » : rien d'inventé n'est présenté comme réel.
 */
export const CONTACT_EXAMPLES = {
  whatsappNumber: '22900000000',
  phone: '+22900000000',
  email: 'contact@exemple.ksp.bj',
  address: 'Adresse à compléter, Cotonou, Bénin',
};

export interface ContactValue<T extends string = string> {
  value: T;
  /** Valeur d'exemple : la vraie coordonnée n'est pas encore configurée. */
  example: boolean;
}

function pick(value: string | undefined, example: string): ContactValue {
  return value ? { value, example: false } : { value: example, example: true };
}

/** Coordonnées passées par le serveur aux composants de la page Contact. */
export interface ContactDetails {
  whatsappNumber: ContactValue;
  phone: ContactValue;
  email: ContactValue;
  address: ContactValue;
  hours: string;
}

export const contactConfig: ContactDetails = {
  whatsappNumber: pick(publicEnv.whatsappNumber, CONTACT_EXAMPLES.whatsappNumber),
  phone: pick(publicEnv.contactPhone, CONTACT_EXAMPLES.phone),
  email: pick(publicEnv.contactEmail, CONTACT_EXAMPLES.email),
  address: pick(publicEnv.contactAddress, CONTACT_EXAMPLES.address),
  /** Horaires d'ouverture (à valider). */
  hours: 'Du lundi au vendredi de 8 h à 18 h, le samedi de 9 h à 13 h (heure du Bénin).',
} as const;
