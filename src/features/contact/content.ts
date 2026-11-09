import { type ContactSubject, contactSubjects } from '@/config/navigation';

/** Textes de la page Contact (en attendant le CMS). */
export const contactTexts = {
  title: 'Contacter KSP',
  description:
    'Écrivez au Groupe KSP sur WhatsApp, appelez-nous ou envoyez un e-mail : une seule équipe pour le recouvrement, l’immobilier, le nettoyage, l’impression, la marketplace et la livraison.',
  lead: 'Une question, un devis, un paiement à vérifier ? Choisissez le moyen qui vous convient : la même équipe vous répond pour tous les services du groupe.',
  subjectLabel: 'Votre demande',
  subjectHint: 'Le sujet est déjà indiqué dans le message WhatsApp et dans l’objet de l’e-mail.',
  channelsTitle: 'Nous joindre',
  whatsapp: {
    title: 'WhatsApp',
    text: 'Le plus rapide : écrivez-nous, nous répondons pendant les heures d’ouverture.',
    action: 'Écrire sur WhatsApp',
  },
  phone: { title: 'Téléphone', text: 'Pour parler directement à un conseiller.', action: 'Appeler' },
  email: {
    title: 'E-mail',
    text: 'Pour une demande détaillée ou un document à joindre.',
    action: 'Écrire un e-mail',
  },
  address: { title: 'Adresse', text: 'Sur rendez-vous.' },
  hoursTitle: 'Heures d’ouverture',
  example: 'Exemple, à remplacer',
  exampleNote:
    'Coordonnée pas encore configurée : la valeur affichée est un exemple (variables NEXT_PUBLIC_CONTACT_* et NEXT_PUBLIC_WHATSAPP_NUMBER).',
  newWindow: '(nouvelle fenêtre)',
  accountTitle: 'Vous avez un compte KSP ?',
  accountText:
    'Vos demandes, devis, factures et paiements sont suivis dans Mon espace KSP, avec les messages que nous vous envoyons.',
  accountAction: 'Ouvrir Mon espace KSP',
  /** Message prérempli (WhatsApp) et objet de l'e-mail. */
  message: (subject: string | null) =>
    subject ? `Bonjour KSP, je vous écris au sujet de : ${subject}.` : 'Bonjour KSP, ',
  mailSubject: (subject: string | null) => (subject ? `[KSP] ${subject}` : 'Demande de contact'),
} as const;

/** Sujet connu lu dans l'adresse (`?sujet=paiement`) ; tout autre valeur est ignorée. */
export function subjectFromParam(value: string | null): { code: ContactSubject; label: string } | null {
  if (!value || !Object.hasOwn(contactSubjects, value)) return null;
  const code = value as ContactSubject;
  return { code, label: contactSubjects[code] };
}
