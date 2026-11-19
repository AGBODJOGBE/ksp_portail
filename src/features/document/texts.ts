import type { BadgeTone } from '@/components/ui/badge';

/** Textes des documents et de la signature par code (ADR-044). Sans zod. */

type StatusView = { label: string; tone: BadgeTone };

export const documentTexts = {
  // Page publique du lien de signature.
  metaTitle: 'Signature de document',
  eyebrow: 'Signature électronique sécurisée',
  issuer: 'Document émis par le Groupe KSP',
  number: (value: string) => `N° ${value}`,
  signer: 'Signataire',
  phone: 'Téléphone',
  signBefore: 'À signer avant le',
  signedAt: 'Signé le',
  loading: 'Chargement du document…',
  retry: 'Réessayer',
  genericError: 'Une erreur est survenue. Réessayez dans quelques instants.',
  notFoundTitle: 'Lien de signature introuvable',
  notFoundText:
    'Ce lien n’existe pas, n’est pas complet ou ne vous est pas adressé. Ouvrez de nouveau le lien reçu par WhatsApp ou e-mail, sans le modifier.',
  unavailable: 'Le service de signature est momentanément indisponible. Réessayez dans quelques instants.',
  rateLimited: (seconds: number) =>
    `Trop de demandes. Patientez ${seconds} seconde${seconds > 1 ? 's' : ''} avant de réessayer.`,

  // Étapes.
  readStep: 'Lisez le document',
  readLead:
    'Il s’ouvre dans un nouvel onglet, depuis l’adresse sécurisée de KSP. Prenez le temps de le lire en entier avant de signer.',
  signStep: 'Signez avec un code',
  read: 'Lire le document',
  readSigned: 'Lire le document signé',
  opening: 'Ouverture…',
  noDownload: 'Le document n’est plus disponible en lecture.',
  popupBlocked: 'Votre navigateur a bloqué le nouvel onglet : ouvrez le document avec ce lien.',
  openHere: 'Ouvrir le document',

  codeIntro: (phone: string | null) =>
    phone
      ? `Vous recevez un code à 6 chiffres par WhatsApp au ${phone}. Il vaut signature, pour ce document seulement.`
      : 'Vous recevez un code à 6 chiffres par WhatsApp ou par e-mail. Il vaut signature, pour ce document seulement.',
  requestCode: 'Recevoir mon code',
  requesting: 'Envoi du code…',
  codeSent: (channel: string, time: string) => `Code envoyé par ${channel}. Il est valable jusqu’à ${time}.`,
  codeStillValid: (time: string) =>
    `Un code vous a déjà été envoyé ; il est valable jusqu’à ${time}. Vous pouvez aussi en demander un nouveau.`,
  codeLabel: 'Code reçu',
  codeHint: '6 chiffres',
  codeIncomplete: 'Saisissez les 6 chiffres du code reçu.',
  consent: 'J’ai lu le document et j’en accepte le contenu.',
  consentMissing: 'Cochez la case pour confirmer que vous avez lu le document et l’acceptez.',
  sign: 'Signer le document',
  signing: 'Signature…',
  resend: 'Recevoir un nouveau code',
  resendIn: (seconds: number) => `Nouveau code dans ${seconds} s`,
  channels: { whatsapp: 'WhatsApp', email: 'e-mail', sms: 'SMS' } as Record<string, string>,

  // Erreurs du code.
  codeInvalid: (left: number | null) =>
    left === null
      ? 'Ce code est incorrect.'
      : left > 0
        ? `Ce code est incorrect. Il vous reste ${left} essai${left > 1 ? 's' : ''}.`
        : 'Ce code est incorrect et n’est plus utilisable : demandez un nouveau code.',
  codeExpired: 'Ce code a expiré : demandez un nouveau code.',
  unreachable:
    'Aucun moyen de vous envoyer le code n’est disponible. Contactez l’expéditeur du document ou le support KSP.',
  contentChanged:
    'Ce document a été modifié depuis son envoi : il ne peut pas être signé. Contactez l’expéditeur du document.',

  // Issues.
  signedTitle: 'Document signé',
  signedText:
    'Votre signature est enregistrée. Une page de certificat (signataire, date et heure, empreinte du document) a été ajoutée à la fin du document : lisez-le pour en garder une copie.',
  expiredTitle: 'Cette demande de signature a expiré',
  expiredText:
    'Sa date limite est passée. Contactez l’expéditeur du document pour recevoir une nouvelle demande.',
  cancelledTitle: 'Cette demande de signature a été annulée',
  cancelledText: 'L’émetteur a annulé la demande : il n’y a rien à signer. Contactez-le pour toute question.',
  closedNow: 'Cette demande de signature n’est plus ouverte : voici son état actuel.',

  // Aide.
  contactSupport: 'Contacter le support KSP',
  trustTitle: 'Votre signature est protégée',
  trust: [
    'Le code n’est envoyé qu’à vous ; il est valable 10 minutes, pour ce document seulement.',
    'KSP ne vous demande jamais ce code par téléphone ni par message.',
    'Le document signé porte son empreinte : toute modification se verrait.',
  ],

  // Mon espace : document d'un compte.
  back: 'Mon espace KSP',
  documentEyebrow: 'Document',
  status: 'État',
  createdAt: 'Créé le',
  cancelledAt: 'Annulé le',
  signerOf: (name: string, phone: string | null) => (phone ? `${name} (${phone})` : name),
  waitingFor: (name: string) => `En attente de la signature de ${name}.`,
  signTitle: 'Signer ce document',
  readTitle: 'Le document',
  readOnlyLead: 'Lisez le document ou gardez-en une copie : il s’ouvre dans un nouvel onglet.',
  fingerprintsTitle: 'Empreintes SHA-256',
  fingerprintsLead:
    'L’empreinte identifie le fichier : si un seul caractère du PDF changeait, elle serait différente.',
  originalFingerprint: 'Document présenté au signataire',
  signedFingerprint: 'Document signé (avec la page de certificat)',
  notFound: 'Ce document est introuvable. Il appartient peut-être à un autre compte.',
  forbidden: 'Vous n’avez pas accès à ce document.',
} as const;

/** État d'un document (`Document.status`). */
const documentStatuses: Record<string, StatusView> = {
  draft: { label: 'Brouillon', tone: 'neutral' },
  pending_signature: { label: 'À signer', tone: 'warning' },
  signed: { label: 'Signé', tone: 'success' },
  expired: { label: 'Demande expirée', tone: 'neutral' },
  cancelled: { label: 'Annulé', tone: 'neutral' },
};

/** État d'une demande de signature (`SigningSession.status`, `DocumentSignature.status`). */
const signatureStatuses: Record<string, StatusView> = {
  pending: { label: 'À signer', tone: 'warning' },
  signed: { label: 'Signé', tone: 'success' },
  expired: { label: 'Expiré', tone: 'neutral' },
  cancelled: { label: 'Annulé', tone: 'neutral' },
};

export function documentStatus(status: string): StatusView {
  return documentStatuses[status] ?? { label: status, tone: 'neutral' };
}

export function signatureStatus(status: string): StatusView {
  return signatureStatuses[status] ?? { label: status, tone: 'neutral' };
}

export function channelLabel(channel: string): string {
  return documentTexts.channels[channel] ?? channel;
}
